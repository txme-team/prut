"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Check, EyeOff, RotateCcw, X } from "lucide-react";
import { reserveVideo, hideVideo, restoreVideo } from "@/app/queue/actions";
import type { Database } from "@/lib/database.types";

type Candidate = Database["public"]["Tables"]["youtube_candidates"]["Row"];

function starColor(stars: number) {
  return stars >= 4.5 ? "#f5c518" : stars >= 3.5 ? "#c8a96e" : "#888";
}

function fitColor(fit: number) {
  return fit >= 0.7 ? "var(--green)" : fit >= 0.4 ? "var(--accent)" : "var(--red)";
}

function fitLabel(fit: number) {
  return fit >= 0.8 ? "채널핏 완벽" : fit >= 0.6 ? "채널핏 적합" : fit >= 0.4 ? "채널핏 보통" : "채널핏 낮음";
}

function toStarDisplay(stars: number) {
  const full = Math.floor(stars);
  const half = stars - full >= 0.5 ? 1 : 0;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - half);
}

interface Props {
  candidate: Candidate;
}

export function QueueCard({ candidate: c }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fitPct = Math.round((c.score_fit ?? 0) * 100);
  const col    = starColor(c.stars ?? 0);
  const fCol   = fitColor(c.score_fit ?? 0);
  const yr     = c.published_at ? c.published_at.slice(0, 4) : "";

  function handleReserve(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(() => reserveVideo(c.video_id, c.id));
  }

  function handleHide(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(() => hideVideo(c.id));
  }

  function handleRestore(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(() => restoreVideo(c.id));
  }

  const isReserved = c.status === "reserved";
  const isHidden   = c.status === "hidden";

  return (
    <>
      {/* ── 카드 ── */}
      <div
        onClick={() => setModalOpen(true)}
        className="relative flex flex-col rounded-[10px] overflow-hidden cursor-pointer transition-transform hover:-translate-y-[2px]"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          opacity: isHidden ? 0.45 : 1,
        }}
      >
        {/* 썸네일 */}
        <div className="relative">
          {c.thumbnail_url && (
            <img
              src={c.thumbnail_url}
              alt={c.title}
              className="w-full object-cover"
              style={{ aspectRatio: "16/9" }}
              loading="lazy"
            />
          )}
          {!c.thumbnail_url && (
            <div className="w-full bg-[var(--surface3)]" style={{ aspectRatio: "16/9" }} />
          )}
          {/* era 배지 */}
          <span
            className="absolute top-2 right-2 text-[9px] font-bold px-[6px] py-[2px] rounded-full uppercase"
            style={
              c.era === "modern"
                ? { background: "rgba(156,127,224,.3)", color: "var(--purple)" }
                : { background: "rgba(200,169,110,.25)", color: "var(--accent)" }
            }
          >
            {c.era}
          </span>
          {/* 예약 완료 오버레이 */}
          {isReserved && (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(76,175,130,.25)" }}>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full"
                style={{ background: "var(--green)", color: "#fff" }}>
                ✅ 예약 확정
              </span>
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="flex flex-col gap-[4px] p-[11px] flex-1">
          {/* 별점 */}
          <div className="flex items-center gap-[5px]">
            <span className="text-[14px]" style={{ color: col, letterSpacing: "1px" }}>
              {toStarDisplay(c.stars ?? 0)}
            </span>
            <span className="text-[13px] font-bold" style={{ color: col }}>
              {(c.stars ?? 0).toFixed(1)}
            </span>
          </div>

          {/* 제목 */}
          <p className="text-[12px] font-semibold leading-[1.4]" style={{ color: "var(--text)" }}>
            {c.title}
          </p>

          {/* 채널 · 연도 */}
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {c.channel} · {yr}
          </p>

          {/* 채널핏 바 */}
          <div className="mt-[2px]">
            <div className="flex justify-between items-center mb-[3px]">
              <span className="text-[10px] font-semibold" style={{ color: fCol }}>
                {fitLabel(c.score_fit ?? 0)}
              </span>
              <span className="text-[11px] font-bold" style={{ color: fCol }}>
                {fitPct}%
              </span>
            </div>
            <div className="h-[4px] rounded-full overflow-hidden" style={{ background: "var(--surface3)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: fitPct + "%", background: fCol, transition: "width .3s" }}
              />
            </div>
          </div>

          {/* 통계 */}
          <div className="flex gap-[5px] flex-wrap text-[10px] mt-[2px]" style={{ color: "#aaa" }}>
            <span>👁 {c.views >= 10000 ? (c.views / 10000).toFixed(1) + "만" : c.views.toLocaleString()}</span>
            <span>❤️ {(Number(c.like_rate)).toFixed(2)}%</span>
            <span>💬 {(Number(c.comment_rate)).toFixed(3)}%</span>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-[6px] mt-[6px]">
            {!isReserved && !isHidden && (
              <>
                <button
                  onClick={handleReserve}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-[4px] py-[5px] rounded-[7px] text-[11px] font-semibold transition-colors"
                  style={{ background: "var(--accent)", color: "#1a1400" }}
                >
                  <Check size={11} />
                  예약 확정
                </button>
                <button
                  onClick={handleHide}
                  disabled={isPending}
                  className="px-[10px] py-[5px] rounded-[7px] text-[11px] transition-colors"
                  style={{ background: "var(--surface3)", color: "var(--text-muted)" }}
                >
                  <EyeOff size={11} />
                </button>
              </>
            )}
            {(isReserved || isHidden) && (
              <button
                onClick={handleRestore}
                disabled={isPending}
                className="flex items-center gap-[4px] px-[10px] py-[5px] rounded-[7px] text-[11px] transition-colors"
                style={{ background: "var(--surface3)", color: "var(--text-muted)" }}
              >
                <RotateCcw size={11} />
                되돌리기
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 상세 모달 ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,.7)" }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative w-full max-w-[480px] rounded-[12px] overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* 썸네일 */}
            {c.thumbnail_url && (
              <img src={c.thumbnail_url} alt={c.title} className="w-full object-cover" style={{ aspectRatio: "16/9" }} />
            )}

            <div className="p-5">
              {/* 제목 + 닫기 */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="font-semibold text-[15px] leading-[1.4]" style={{ color: "var(--text)" }}>
                  {c.title}
                </p>
                <button onClick={() => setModalOpen(false)} style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                  <X size={16} />
                </button>
              </div>

              <p className="text-[12px] mb-4" style={{ color: "var(--text-muted)" }}>
                {c.channel} · {c.source_name} · {c.published_at?.slice(0, 10)}
              </p>

              {/* 채널핏 */}
              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] font-semibold" style={{ color: fCol }}>채널핏</span>
                  <span className="text-[13px] font-bold" style={{ color: fCol }}>{fitPct}%</span>
                </div>
                <div className="h-[6px] rounded-full overflow-hidden" style={{ background: "var(--surface3)" }}>
                  <div className="h-full rounded-full" style={{ width: fitPct + "%", background: fCol }} />
                </div>
              </div>

              {/* 5요소 스코어 */}
              <div className="rounded-[8px] p-3 mb-4" style={{ background: "var(--surface2)" }}>
                <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--text-muted)" }}>5요소 스코어</p>
                {[
                  { label: "바이럴 지수",   val: c.score_viral,   w: "25%" },
                  { label: "댓글 반응도",   val: c.score_comment, w: "20%" },
                  { label: "채널핏",        val: c.score_fit,     w: "20%" },
                  { label: "시즌 매칭",     val: c.score_season,  w: "15%" },
                  { label: "신선도",        val: c.score_fresh,   w: "10%" },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-2 mb-[6px]">
                    <span className="text-[10px] w-[72px] flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                      {row.label}
                    </span>
                    <div className="flex-1 h-[5px] rounded-full overflow-hidden" style={{ background: "var(--surface3)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: Math.round((row.val ?? 0) * 100) + "%", background: "var(--accent)" }}
                      />
                    </div>
                    <span className="text-[10px] w-[30px] text-right" style={{ color: "var(--accent)" }}>
                      {Math.round((row.val ?? 0) * 100)}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>({row.w})</span>
                  </div>
                ))}
              </div>

              {/* 통계 + 링크 */}
              <div className="flex items-center justify-between">
                <div className="flex gap-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
                  <span>👁 {c.views.toLocaleString()}</span>
                  <span>❤️ {Number(c.like_rate).toFixed(2)}%</span>
                  <span>💬 {Number(c.comment_rate).toFixed(3)}%</span>
                </div>
                <a
                  href={"https://www.youtube.com/watch?v=" + c.video_id}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold"
                  style={{ color: "var(--accent)" }}
                >
                  YouTube <ExternalLink size={11} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
