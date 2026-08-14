"use client";

import { useEffect, useState } from "react";
import {
  addComment,
  commentsSupported,
  deleteComment,
  fetchComments,
  type CommentRow,
} from "@/lib/backend/social-actions";
import { isBackendConfigured } from "@/lib/config";
import { timeAgo } from "@/lib/format";
import { useApp } from "@/lib/store";
import { CommentIcon, TrashIcon } from "./Icons";

/**
 * 댓글 — 서버 영속(comments 테이블 + RLS). localStorage는 관여하지 않는다.
 * 시드 콘텐츠(uuid가 아닌 id)에는 댓글을 달 수 없다 — 서버 게시물이 아니기 때문이다.
 */
export default function Comments({ postId }: { postId: string }) {
  const session = useApp((s) => s.session);
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supported = isBackendConfigured() && commentsSupported(postId);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    fetchComments(postId).then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, [postId, supported]);

  if (!supported) {
    return (
      <div className="border-t border-line px-4 py-5">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <CommentIcon size={15} /> 댓글
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-2">
          {isBackendConfigured()
            ? "시드 데모 콘텐츠에는 댓글을 달 수 없어요. 직접 올린 게시물에서 이용해보세요."
            : "댓글은 백엔드 연결 시 활성화됩니다."}
        </p>
      </div>
    );
  }

  const submit = async () => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await addComment(postId, session.userId, body);
      setBody("");
      setRows(await fetchComments(postId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await deleteComment(id).catch((e) => setError((e as Error).message));
    setRows(await fetchComments(postId));
  };

  return (
    <div className="border-t border-line px-4 py-5">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold">
        <CommentIcon size={15} /> 댓글 {rows.length > 0 && rows.length}
      </p>

      {error && (
        <p className="mt-2 rounded-(--radius-btn) bg-[#fdecec] px-3 py-2 text-[12px] text-[#c0392b]">
          {error}
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-3">
        {rows.map((c) => (
          <li key={c.id} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-bold text-ink-2">
              {(c.profiles?.display_name ?? "?").slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-ink-2">
                <span className="font-semibold text-ink">@{c.profiles?.handle ?? "user"}</span>{" "}
                {timeAgo(c.created_at)}
              </p>
              <p className="whitespace-pre-line text-[13.5px] leading-relaxed">{c.body}</p>
            </div>
            {session?.userId === c.author_id && (
              <button
                onClick={() => remove(c.id)}
                aria-label="댓글 삭제"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-(--radius-btn) text-ink-2 hover:bg-surface-2"
              >
                <TrashIcon size={13} />
              </button>
            )}
          </li>
        ))}
        {rows.length === 0 && (
          <li className="py-2 text-[12.5px] text-ink-2">첫 댓글을 남겨보세요.</li>
        )}
      </ul>

      {session ? (
        <div className="mt-4 flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && body.trim() && !busy) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="댓글 달기..."
            maxLength={2000}
            className="h-10 flex-1 rounded-(--radius-btn) bg-surface-2 px-3 text-[13.5px] outline-none"
          />
          <button
            onClick={submit}
            disabled={busy || !body.trim()}
            className="press h-10 shrink-0 rounded-(--radius-btn) bg-ink px-4 text-[13px] font-semibold text-surface disabled:opacity-40"
          >
            등록
          </button>
        </div>
      ) : (
        <p className="mt-4 text-[12px] text-ink-2">댓글을 쓰려면 로그인하세요.</p>
      )}
    </div>
  );
}
