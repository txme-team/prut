"use client";

import { useTransition } from "react";
import { ExternalLink, RotateCcw } from "lucide-react";
import { cancelReservation } from "@/app/pending/actions";
import type { Database } from "@/lib/database.types";

type Candidate = Database["public"]["Tables"]["youtube_candidates"]["Row"];

function toStarDisplay(stars: number) {
  const full = Math.floor(stars);
  const half = stars - full >= 0.5 ? 1 : 0;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - half);
}

function starColor(stars: number) {
  return stars >= 4.5 ? "#f5c518" : stars >= 3.5 ? "var(--accent)" : "#888";
}

interface Props {
  candidate: Candidate;
  index: number;
}

export function PendingCard({ candidate: c, index }: Props) {
  const [isPending, startTransition] = useTransition();
  const col = starColor(c.stars ?? 0);

  function handleCancel(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(() => cancelReservation(c.id));
  }

  return (
    <div
      className="flex items-center gap-4 rounded-[10px] overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        opacity: isPending ? 0.5 : 1,
        transition: "opacity .2s",
      }}
    >
      {/* 순번 */}
      <div
        className="flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
        style={{
          width: 44,
          alignSelf: "stretch",
          background: "var(--surface2)",
          color: "var(--text-dim)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {index}
      </div>

      {/* 썸네일 */}
      <div className="flex-shrink-0" style={{ width: 100 }}>
        {c.thumbnail_url ? (
          <img
            src={c.thumbnail_url}
            alt={c.title}
            className="w-full object-cover"
            style={{ aspectRatio: "16/9" }}
            loading="lazy"
          />
        ) : (
          <div className="w-full" style={{ aspectRatio: "16/9", background: "var(--surface3)" }} />
        )}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0 py-3 pr-2">
        <div className="flex items-center gap-2 mb-[3px]">
          <span
            className="text-[9px] font-bold px-[6px] py-[1px] rounded-full uppercase"
            style={
              c.era === "modern"
                ? { background: "rgba(156,127,224,.3)", color: "var(--purple)" }
                : { background: "rgba(200,169,110,.25)", color: "var(--accent)" }
            }
          >
            {c.era}
          </span>
          <span className="text-[11px]" style={{ color: col }}>
            {toStarDisplay(c.stars ?? 0)} {(c.stars ?? 0).toFixed(1)}
          </span>
        </div>
        <p
          className="text-[13px] font-semibold leading-[1.4] truncate"
          style={{ color: "var(--text)" }}
        >
          {c.title}
        </p>
        <p className="text-[11px] mt-[2px] truncate" style={{ color: "var(--text-muted)" }}>
          {c.channel} · {c.published_at?.slice(0, 10) ?? ""}
        </p>
      </div>

      {/* 액션 */}
      <div className="flex items-center gap-2 pr-4 flex-shrink-0">
        <a
          href={`https://www.youtube.com/watch?v=${c.video_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[11px] font-semibold px-[10px] py-[6px] rounded-[7px]"
          style={{ background: "var(--surface3)", color: "var(--accent)" }}
        >
          YouTube <ExternalLink size={11} />
        </a>
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="flex items-center gap-1 text-[11px] px-[10px] py-[6px] rounded-[7px]"
          style={{ background: "var(--surface3)", color: "var(--text-muted)" }}
        >
          <RotateCcw size={11} />
          취소
        </button>
      </div>
    </div>
  );
}
