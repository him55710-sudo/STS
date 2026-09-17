import { describe, expect, it } from "vitest";
import {
  extractBeautyObjectsFromLandmarks,
  extractPolygon,
  smoothPolygon,
  sampleAverageTone,
  LEFT_IRIS_LOOP,
  RIGHT_IRIS_LOOP,
  LIPS_OUTER_LOOP,
  UPPER_LIP_LOOP,
  LOWER_LIP_LOOP,
  LEFT_EYEBROW_LOOP,
  RIGHT_EYEBROW_LOOP,
  LEFT_EYE_LOOP,
  RIGHT_EYE_LOOP,
  LEFT_CHEEK_LOOP,
  RIGHT_CHEEK_LOOP,
  NOSE_SHADING_LOOP,
  FACE_OVAL_LOOP,
} from "../../lib/mask/face-beauty-detector";
import { INTERACTION_PRIORITY } from "../../lib/vision-config";
import { candidatesFor } from "../../lib/match";

/** 478개 정규화 얼굴 랜드마크 모의 생성기 (인간 얼굴 표준 해부학적 비율 기반) */
function createSyntheticFaceLandmarks(): { x: number; y: number; z: number }[] {
  const landmarks: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < 478; i++) {
    landmarks.push({ x: 0.5, y: 0.5, z: 0.0 });
  }

  // 눈동자 렌즈 (Iris)
  // 좌측 홍채 (468~472): x: ~0.41, y: ~0.37
  landmarks[468] = { x: 0.41, y: 0.37, z: 0.01 };
  landmarks[469] = { x: 0.415, y: 0.365, z: 0.01 };
  landmarks[470] = { x: 0.42, y: 0.37, z: 0.01 };
  landmarks[471] = { x: 0.415, y: 0.375, z: 0.01 };
  landmarks[472] = { x: 0.405, y: 0.37, z: 0.01 };

  // 우측 홍채 (473~477): x: ~0.59, y: ~0.37
  landmarks[473] = { x: 0.59, y: 0.37, z: 0.01 };
  landmarks[474] = { x: 0.585, y: 0.365, z: 0.01 };
  landmarks[475] = { x: 0.58, y: 0.37, z: 0.01 };
  landmarks[476] = { x: 0.585, y: 0.375, z: 0.01 };
  landmarks[477] = { x: 0.595, y: 0.37, z: 0.01 };

  // 입술 루프 좌표 모의 설정 (x: 0.44~0.56, y: 0.65~0.74)
  LIPS_OUTER_LOOP.forEach((idx, i) => {
    const angle = (i / LIPS_OUTER_LOOP.length) * 2 * Math.PI;
    landmarks[idx] = {
      x: 0.5 + 0.06 * Math.cos(angle),
      y: 0.7 + 0.03 * Math.sin(angle),
      z: 0.0,
    };
  });

  UPPER_LIP_LOOP.forEach((idx, i) => {
    const angle = (i / UPPER_LIP_LOOP.length) * Math.PI;
    landmarks[idx] = {
      x: 0.5 + 0.05 * Math.cos(angle),
      y: 0.69 + 0.015 * Math.sin(angle),
      z: 0.0,
    };
  });

  LOWER_LIP_LOOP.forEach((idx, i) => {
    const angle = (i / LOWER_LIP_LOOP.length) * Math.PI;
    landmarks[idx] = {
      x: 0.5 + 0.05 * Math.cos(angle),
      y: 0.71 + 0.02 * Math.sin(angle),
      z: 0.0,
    };
  });

  // 눈썹 루프
  LEFT_EYEBROW_LOOP.forEach((idx, i) => {
    landmarks[idx] = { x: 0.35 + i * 0.012, y: 0.30 + (i % 2) * 0.005, z: 0.0 };
  });
  RIGHT_EYEBROW_LOOP.forEach((idx, i) => {
    landmarks[idx] = { x: 0.55 + i * 0.012, y: 0.30 + (i % 2) * 0.005, z: 0.0 };
  });

  // 눈 윤곽 루프
  LEFT_EYE_LOOP.forEach((idx, i) => {
    const angle = (i / LEFT_EYE_LOOP.length) * 2 * Math.PI;
    landmarks[idx] = { x: 0.41 + 0.03 * Math.cos(angle), y: 0.37 + 0.015 * Math.sin(angle), z: 0.0 };
  });
  RIGHT_EYE_LOOP.forEach((idx, i) => {
    const angle = (i / RIGHT_EYE_LOOP.length) * 2 * Math.PI;
    landmarks[idx] = { x: 0.59 + 0.03 * Math.cos(angle), y: 0.37 + 0.015 * Math.sin(angle), z: 0.0 };
  });

  // 볼(치크) 루프
  LEFT_CHEEK_LOOP.forEach((idx, i) => {
    const angle = (i / LEFT_CHEEK_LOOP.length) * 2 * Math.PI;
    landmarks[idx] = { x: 0.36 + 0.04 * Math.cos(angle), y: 0.52 + 0.04 * Math.sin(angle), z: 0.0 };
  });
  RIGHT_CHEEK_LOOP.forEach((idx, i) => {
    const angle = (i / RIGHT_CHEEK_LOOP.length) * 2 * Math.PI;
    landmarks[idx] = { x: 0.64 + 0.04 * Math.cos(angle), y: 0.52 + 0.04 * Math.sin(angle), z: 0.0 };
  });

  // 노즈 쉐딩 루프
  NOSE_SHADING_LOOP.forEach((idx, i) => {
    landmarks[idx] = { x: 0.49 + ((i % 2) * 0.02 - 0.01), y: 0.38 + i * 0.02, z: 0.0 };
  });

  // 페이스 오발 (얼굴 윤곽)
  FACE_OVAL_LOOP.forEach((idx, i) => {
    const angle = (i / FACE_OVAL_LOOP.length) * 2 * Math.PI;
    landmarks[idx] = { x: 0.5 + 0.22 * Math.cos(angle), y: 0.52 + 0.28 * Math.sin(angle), z: 0.0 };
  });

  return landmarks;
}

describe("Face Beauty Segmentation & Multi-Object Verification", () => {
  const landmarks = createSyntheticFaceLandmarks();
  const detected = extractBeautyObjectsFromLandmarks(landmarks, null, 1000, 1000);

  it("478개 랜드마크로부터 7개 핵심 뷰티 부위(렌즈, 립, 아이, 치크, 브로우, 쉐딩, 스킨)를 모두 분리 검출한다", () => {
    expect(detected.length).toBe(7);

    const canonicalClasses = detected.map((d) => d.canonicalClass);
    expect(canonicalClasses).toContain("lens");
    expect(canonicalClasses).toContain("lips");
    expect(canonicalClasses).toContain("eyes");
    expect(canonicalClasses).toContain("cheeks");
    expect(canonicalClasses).toContain("eyebrows");
    expect(canonicalClasses).toContain("shading");
    expect(canonicalClasses).toContain("skin");
  });

  describe("1. 눈동자/컬러 렌즈 (Lens / Iris) 정밀성 검증", () => {
    const lensObj = detected.find((d) => d.canonicalClass === "lens");

    it("렌즈 객체가 정상 생성되고 고신뢰도(>= 0.95)를 갖는다", () => {
      expect(lensObj).toBeDefined();
      expect(lensObj?.confidence).toBeGreaterThanOrEqual(0.95);
      expect(lensObj?.category).toBe("beauty");
      expect(lensObj?.labelKo).toContain("컬러 렌즈");
    });

    it("양쪽 눈동자 루프(polygons)를 2개 모두 보존하고 유효한 폐곡선 좌표를 가진다", () => {
      expect(lensObj?.polygons).toBeDefined();
      expect(lensObj?.polygons?.length).toBe(2);

      for (const ring of lensObj!.polygons!) {
        expect(ring.length).toBeGreaterThanOrEqual(4);
        for (const [x, y] of ring) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(1);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(1);
          expect(Number.isNaN(x)).toBe(false);
          expect(Number.isNaN(y)).toBe(false);
        }
      }
    });

    it("카탈로그 매칭 시 하파크리스틴/오렌즈 컬러렌즈로 1순위 추천된다", () => {
      const candidates = candidatesFor(lensObj!);
      expect(candidates.length).toBeGreaterThan(0);
      const topMatch = candidates[0];
      expect(["kb-hapa-lens", "kb-olens-lens"]).toContain(topMatch.id);
      expect(topMatch.brand).toMatch(/하파크리스틴|오렌즈/);
    });
  });

  describe("2. 입술 (Lips - 상립/하립/외곽선) 구조화 검증", () => {
    const lipsObj = detected.find((d) => d.canonicalClass === "lips");

    it("입술 객체가 생성되고 외곽선 및 상/하 루프 3중 폴리곤을 갖는다", () => {
      expect(lipsObj).toBeDefined();
      expect(lipsObj?.polygons?.length).toBe(3); // lipsPoly, upperLipPoly, lowerLipPoly
      expect(lipsObj?.labelKo).toContain("립 메이크업");
    });

    it("입술 폴리곤 좌표가 얼굴 하단 중앙(0.4 < x < 0.6, 0.6 < y < 0.8)에 위치한다", () => {
      expect(lipsObj!.x).toBeGreaterThan(0.35);
      expect(lipsObj!.x + lipsObj!.w).toBeLessThan(0.65);
      expect(lipsObj!.y).toBeGreaterThan(0.6);
      expect(lipsObj!.y + lipsObj!.h).toBeLessThan(0.8);
    });

    it("카탈로그 매칭 시 롬앤 쥬시 래스팅 틴트(kb-romand-tint)로 최우선 매칭된다", () => {
      const candidates = candidatesFor(lipsObj!);
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].id).toBe("kb-romand-tint");
      expect(candidates[0].name).toContain("베어그레이프");
    });
  });

  describe("3. 눈썹 (Eyebrows) 세그멘테이션 검증", () => {
    const browObj = detected.find((d) => d.canonicalClass === "eyebrows");

    it("좌/우 2개의 눈썹 폴리곤이 모두 포함되어 있다", () => {
      expect(browObj).toBeDefined();
      expect(browObj?.polygons?.length).toBe(2);
      expect(browObj?.labelKo).toContain("아이브로우");
    });

    it("좌측 눈썹과 우측 눈썹이 좌우 대칭적으로 이격되어 있다", () => {
      const [leftPoly, rightPoly] = browObj!.polygons!;
      const leftCenterX = leftPoly.reduce((s, p) => s + p[0], 0) / leftPoly.length;
      const rightCenterX = rightPoly.reduce((s, p) => s + p[0], 0) / rightPoly.length;
      expect(leftCenterX).toBeLessThan(0.5);
      expect(rightCenterX).toBeGreaterThan(0.5);
    });

    it("카탈로그 매칭 시 클리오 킬브로우 펜슬(kb-clio-brow)이 후보에 랭크된다", () => {
      const candidates = candidatesFor(browObj!);
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.some((c) => c.id === "kb-clio-brow")).toBe(true);
    });
  });

  describe("4. 아이 메이크업 (Eyes - 섀도우) 검증", () => {
    const eyeObj = detected.find((d) => d.canonicalClass === "eyes");

    it("양쪽 눈 폴리곤이 안정적으로 추출된다", () => {
      expect(eyeObj).toBeDefined();
      expect(eyeObj?.polygons?.length).toBe(2);
      expect(eyeObj?.labelKo).toContain("아이 메이크업");
    });

    it("카탈로그 매칭 시 데이지크 섀도우 팔레트(kb-dasique-shadow)가 매칭된다", () => {
      const candidates = candidatesFor(eyeObj!);
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].id).toBe("kb-dasique-shadow");
    });
  });

  describe("5. 치크 & 쉐딩 & 베이스 피부 검증", () => {
    it("치크 블러셔가 좌우 2개 영역으로 분할되어 생성된다", () => {
      const cheekObj = detected.find((d) => d.canonicalClass === "cheeks");
      expect(cheekObj).toBeDefined();
      expect(cheekObj?.polygons?.length).toBe(2);
    });

    it("노즈 쉐딩 영역이 콧대 중심축에 세로형으로 생성된다", () => {
      const shadingObj = detected.find((d) => d.canonicalClass === "shading");
      expect(shadingObj).toBeDefined();
      expect(shadingObj!.w).toBeLessThan(shadingObj!.h); // 세로가 가로보다 길어야 함
    });

    it("얼굴 피부 베이스가 전체 얼굴을 포괄하는 크기로 생성된다", () => {
      const skinObj = detected.find((d) => d.canonicalClass === "skin");
      expect(skinObj).toBeDefined();
      expect(skinObj!.w * skinObj!.h).toBeGreaterThan(0.1); // 얼굴 전체 영역
    });
  });

  describe("6. 레이어 우선순위 및 Z-Index 상호작용 검증", () => {
    it("작고 정밀한 뷰티 부위가 더 높은 상호작용 우선순위를 가진다", () => {
      const pLens = INTERACTION_PRIORITY["lens"];
      const pLips = INTERACTION_PRIORITY["lips"];
      const pEyes = INTERACTION_PRIORITY["eyes"];
      const pCheeks = INTERACTION_PRIORITY["cheeks"];
      const pEyebrows = INTERACTION_PRIORITY["eyebrows"];
      const pSkin = INTERACTION_PRIORITY["skin"];

      expect(pLens).toBeGreaterThan(pLips);
      expect(pLips).toBeGreaterThan(pEyes);
      expect(pEyes).toBeGreaterThan(pEyebrows);
      expect(pEyebrows).toBeGreaterThan(pSkin);
      expect(pCheeks).toBeGreaterThan(pSkin);
    });
  });

  describe("7. 극한 및 결손(Edge Cases) 내구성 검증", () => {
    it("랜드마크가 468개 미만(결손)일 때 크래시 없이 빈 배열을 안전하게 반환한다", () => {
      const shortLandmarks = landmarks.slice(0, 300);
      const res = extractBeautyObjectsFromLandmarks(shortLandmarks, null, 1000, 1000);
      expect(res).toEqual([]);
    });

    it("랜드마크에 음수나 1 초과 비정상 좌표가 들어와도 [0, 1] 범위로 안전하게 클램프된다", () => {
      const malformedLandmarks = landmarks.map((l) => ({
        x: l.x < 0.5 ? -0.2 : 1.5,
        y: l.y < 0.5 ? -0.1 : 1.3,
        z: l.z,
      }));
      const poly = extractPolygon(malformedLandmarks, LIPS_OUTER_LOOP, false);
      for (const [px, py] of poly) {
        expect(px).toBeGreaterThanOrEqual(0);
        expect(px).toBeLessThanOrEqual(1);
        expect(py).toBeGreaterThanOrEqual(0);
        expect(py).toBeLessThanOrEqual(1);
      }
    });

    it("스무딩 알고리즘(smoothPolygon)은 점이 3개 미만인 경우에도 크래시하지 않는다", () => {
      const empty: [number, number][] = [];
      expect(smoothPolygon(empty, 1)).toEqual([]);

      const single: [number, number][] = [[0.5, 0.5]];
      const smoothedSingle = smoothPolygon(single, 1);
      expect(smoothedSingle.length).toBe(2);
      expect(smoothedSingle[0]).toEqual([0.5, 0.5]);
    });

    it("Canvas 컨텍스트가 없는 환경(SSR)에서도 안전한 fallback tone 색상을 반환한다", () => {
      const tone = sampleAverageTone(null, [[0.5, 0.5], [0.51, 0.51]], 100, 100, "#abcdef");
      expect(tone).toBe("#abcdef");
    });
  });
});
