import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildAuthorizeUrl,
  createState,
  decryptToken,
  encryptToken,
  isMockMode,
  isTikTokAvailable,
  isTikTokConfigured,
  verifyState,
} from "../../lib/integrations/tiktok/oauth-core";
import {
  TIKTOK_AUTH_URL,
  TIKTOK_SCOPES,
  TIKTOK_VIDEO_FIELDS,
} from "../../lib/integrations/tiktok/types";

/** 환경변수를 격리해 실행 (테스트 간 오염 방지) */
function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(env)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const CREDS = {
  TIKTOK_CLIENT_KEY: "test-client-key",
  TIKTOK_CLIENT_SECRET: "test-client-secret",
  TIKTOK_REDIRECT_URI: "https://sts.example.com/api/integrations/tiktok/callback",
  TIKTOK_TOKEN_ENC_KEY: "a".repeat(64), // 32바이트 hex
};

// ── 공식 스펙 상수 ───────────────────────────────────────────────────────────

test("공식 엔드포인트/스코프 상수가 문서와 일치한다", () => {
  assert.equal(TIKTOK_AUTH_URL, "https://www.tiktok.com/v2/auth/authorize/");
  assert.deepEqual([...TIKTOK_SCOPES], ["user.info.basic", "video.list"]);
  // Display API가 제공하는 필드만 요청한다 — 원본 영상 파일 필드는 존재하지 않는다
  for (const f of ["id", "cover_image_url", "share_url", "embed_link", "duration", "width", "height"]) {
    assert.ok((TIKTOK_VIDEO_FIELDS as readonly string[]).includes(f), `${f} 필드 누락`);
  }
  assert.ok(
    !(TIKTOK_VIDEO_FIELDS as readonly string[]).some((f) => /download|play_url|video_url/.test(f)),
    "원본 영상 다운로드 필드를 요청해서는 안 된다 (공식 API 미제공)"
  );
});

// ── 인증 URL ─────────────────────────────────────────────────────────────────

test("인증 URL은 공식 파라미터를 정확히 싣는다", () => {
  withEnv(CREDS, () => {
    const url = new URL(buildAuthorizeUrl("state-abc"));
    assert.equal(url.origin + url.pathname, "https://www.tiktok.com/v2/auth/authorize/");
    assert.equal(url.searchParams.get("client_key"), "test-client-key");
    assert.equal(url.searchParams.get("response_type"), "code");
    assert.equal(url.searchParams.get("scope"), "user.info.basic,video.list");
    assert.equal(url.searchParams.get("redirect_uri"), CREDS.TIKTOK_REDIRECT_URI);
    assert.equal(url.searchParams.get("state"), "state-abc");
    // client_secret은 인증 URL에 절대 실리지 않는다 (서버 토큰 교환 시에만 사용)
    assert.equal(url.searchParams.get("client_secret"), null);
    assert.ok(!buildAuthorizeUrl("s").includes("test-client-secret"));
  });
});

// ── state (CSRF) ─────────────────────────────────────────────────────────────

test("state는 매번 달라지고 충분히 길다", () => {
  const a = createState();
  const b = createState();
  assert.notEqual(a, b);
  assert.ok(a.length >= 32);
});

test("state 검증: 일치만 통과, 불일치·누락·길이차 전부 거절", () => {
  const s = createState();
  assert.ok(verifyState(s, s));
  assert.ok(!verifyState(s, createState()));
  assert.ok(!verifyState(undefined, s));
  assert.ok(!verifyState(s, undefined));
  assert.ok(!verifyState(s, s.slice(0, -1)));
  assert.ok(!verifyState("", ""));
});

// ── 토큰 암호화 ──────────────────────────────────────────────────────────────

test("토큰 암복호화 왕복 + 평문 노출 없음", () => {
  withEnv(CREDS, () => {
    const secret = "act.example-access-token-value";
    const enc = encryptToken(secret);
    assert.ok(!enc.includes(secret), "암호문에 평문이 남으면 안 된다");
    assert.ok(enc.startsWith("v1."));
    assert.equal(decryptToken(enc), secret);
  });
});

test("같은 평문도 매번 다른 암호문 (IV 랜덤화)", () => {
  withEnv(CREDS, () => {
    assert.notEqual(encryptToken("same"), encryptToken("same"));
  });
});

test("변조된 암호문은 복호화에 실패한다 (GCM 인증 태그)", () => {
  withEnv(CREDS, () => {
    const enc = encryptToken("tamper-me");
    const parts = enc.split(".");
    const flipped = Buffer.from(parts[3], "base64url");
    flipped[0] ^= 0xff;
    const tampered = `${parts[0]}.${parts[1]}.${parts[2]}.${flipped.toString("base64url")}`;
    assert.throws(() => decryptToken(tampered));
  });
});

test("형식이 깨진 암호문은 명확히 거절", () => {
  withEnv(CREDS, () => {
    assert.throws(() => decryptToken("garbage"));
    assert.throws(() => decryptToken("v2.a.b.c"));
  });
});

test("자격증명이 있는데 암호화 키가 없으면 기동을 거부한다", () => {
  withEnv({ ...CREDS, TIKTOK_TOKEN_ENC_KEY: undefined }, () => {
    assert.throws(() => encryptToken("x"), /TIKTOK_TOKEN_ENC_KEY/);
  });
});

test("잘못된 길이의 키는 거절", () => {
  withEnv({ ...CREDS, TIKTOK_TOKEN_ENC_KEY: "tooshort" }, () => {
    assert.throws(() => encryptToken("x"), /32 bytes/);
  });
});

// ── 모드 게이팅 ──────────────────────────────────────────────────────────────

test("자격증명이 전부 있으면 configured, mock은 꺼진다", () => {
  withEnv({ ...CREDS, TIKTOK_MOCK_MODE: "true", NEXT_PUBLIC_DEMO_MODE: "true" }, () => {
    assert.ok(isTikTokConfigured());
    // 실 자격증명이 있으면 mock이 실연동을 가로채지 못한다
    assert.ok(!isMockMode());
    assert.ok(isTikTokAvailable());
  });
});

test("자격증명이 하나라도 없으면 configured가 아니다", () => {
  withEnv({ ...CREDS, TIKTOK_REDIRECT_URI: undefined }, () => {
    assert.ok(!isTikTokConfigured());
  });
});

test("프로덕션(데모 off, mock off)에서 자격증명이 없으면 통합 자체가 비활성 — 가짜 성공 없음", () => {
  withEnv(
    {
      TIKTOK_CLIENT_KEY: undefined,
      TIKTOK_CLIENT_SECRET: undefined,
      TIKTOK_REDIRECT_URI: undefined,
      TIKTOK_MOCK_MODE: undefined,
      NEXT_PUBLIC_DEMO_MODE: "false",
    },
    () => {
      assert.ok(!isTikTokConfigured());
      assert.ok(!isMockMode());
      assert.ok(!isTikTokAvailable());
    }
  );
});

test("데모 모드에서 자격증명이 없으면 mock으로 동작한다", () => {
  withEnv(
    {
      TIKTOK_CLIENT_KEY: undefined,
      TIKTOK_CLIENT_SECRET: undefined,
      TIKTOK_REDIRECT_URI: undefined,
      TIKTOK_MOCK_MODE: undefined,
      NEXT_PUBLIC_DEMO_MODE: "true",
    },
    () => {
      assert.ok(isMockMode());
      assert.ok(isTikTokAvailable());
    }
  );
});
