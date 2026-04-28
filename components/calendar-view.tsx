"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X, ExternalLink } from "lucide-react";
import type { Database } from "@/lib/database.types";

type Candidate = Database["public"]["Tables"]["youtube_candidates"]["Row"];

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function toStarDisplay(stars: number) {
  const full = Math.floor(stars);
  const half = stars - full >= 0.5 ? 1 : 0;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - half);
}

interface Props {
  candidates: Candidate[];
}

export function CalendarView({ candidates }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [selected, setSelected] = useState<Candidate[] | null>(null);

  // collected_at 기준으로 날짜별 그룹화
  const byDate: Record<string, Candidate[]> = {};
  for (const c of candidates) {
    const date = c.collected_at?.slice(0, 10);
    if (!date) continue;
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(c);
  }

  // 달력 계산
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function pad(n: number) { return String(n).padStart(2, "0"); }
  function dateKey(d: number) { return `${year}-${pad(month + 1)}-${pad(d)}`; }

  const totalReserved = candidates.length;

  return (
    <>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-bold" style={{ color: "var(--text)" }}>캘린더</h1>
          <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>
            예약 확정 영상 {totalReserved}개 · 수집일 기준
          </p>
        </div>
        {/* 월 이동 */}
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-[6px] rounded-[7px] transition-colors hover:bg-white/5"
            style={{ color: "var(--text-muted)" }}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[14px] font-semibold w-[90px] text-center" style={{ color: "var(--text)" }}>
            {year}.{pad(month + 1)}
          </span>
          <button
            onClick={nextMonth}
            className="p-[6px] rounded-[7px] transition-colors hover:bg-white/5"
            style={{ color: "var(--text-muted)" }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 달력 그리드 */}
      <div
        className="rounded-[12px] overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
      >
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7">
          {DAYS.map((d, i) => (
            <div
              key={d}
              className="py-[10px] text-center text-[11px] font-semibold"
              style={{
                color: i === 0 ? "var(--red)" : i === 6 ? "var(--blue)" : "var(--text-muted)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 셀 */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const key = day ? dateKey(day) : null;
            const items = key ? (byDate[key] ?? []) : [];
            const isToday =
              day === now.getDate() &&
              month === now.getMonth() &&
              year === now.getFullYear();

            return (
              <div
                key={idx}
                onClick={() => day && items.length > 0 && setSelected(items)}
                className="min-h-[80px] p-2 relative"
                style={{
                  borderRight: (idx + 1) % 7 !== 0 ? "1px solid var(--border)" : undefined,
                  borderBottom: idx < cells.length - 7 ? "1px solid var(--border)" : undefined,
                  cursor: day && items.length > 0 ? "pointer" : "default",
                  background: isToday ? "var(--accent-dim)" : undefined,
                }}
              >
                {day && (
                  <>
                    <span
                      className="text-[12px] font-semibold"
                      style={{
                        color: isToday
                          ? "var(--accent)"
                          : idx % 7 === 0
                          ? "var(--red)"
                          : idx % 7 === 6
                          ? "var(--blue)"
                          : "var(--text-muted)",
                      }}
                    >
                      {day}
                    </span>
                    {items.length > 0 && (
                      <div className="mt-[4px] flex flex-col gap-[3px]">
                        {items.slice(0, 3).map(c => (
                          <div
                            key={c.id}
                            className="text-[10px] px-[5px] py-[2px] rounded-[4px] truncate"
                            style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                          >
                            {c.title}
                          </div>
                        ))}
                        {items.length > 3 && (
                          <div className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                            +{items.length - 3}개
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 날짜 클릭 모달 */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,.7)" }}
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-[480px] max-h-[80vh] overflow-y-auto rounded-[12px]"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between p-4"
              style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
              <p className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                {selected[0]?.collected_at?.slice(0, 10)} · {selected.length}개
              </p>
              <button onClick={() => setSelected(null)} style={{ color: "var(--text-muted)" }}>
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-3 p-4">
              {selected.map(c => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-[8px] overflow-hidden"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                >
                  {c.thumbnail_url && (
                    <img
                      src={c.thumbnail_url}
                      alt={c.title}
                      className="flex-shrink-0 object-cover"
                      style={{ width: 80, aspectRatio: "16/9" }}
                    />
                  )}
                  <div className="flex-1 min-w-0 py-2 pr-1">
                    <p className="text-[12px] font-semibold truncate" style={{ color: "var(--text)" }}>
                      {c.title}
                    </p>
                    <p className="text-[10px] truncate mt-[2px]" style={{ color: "var(--text-muted)" }}>
                      {c.channel} · {toStarDisplay(c.stars ?? 0)} {(c.stars ?? 0).toFixed(1)}
                    </p>
                  </div>
                  <a
                    href={`https://www.youtube.com/watch?v=${c.video_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pr-3 flex-shrink-0"
                    style={{ color: "var(--accent)" }}
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
