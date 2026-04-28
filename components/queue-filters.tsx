"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

const ERA_TABS = [
  { value: "all",     label: "전체" },
  { value: "classic", label: "Classic" },
  { value: "modern",  label: "Modern" },
];

const STAR_OPTIONS = [
  { value: "0",   label: "전체 별점" },
  { value: "3.0", label: "★3.0 이상" },
  { value: "4.0", label: "★4.0 이상" },
  { value: "4.5", label: "★4.5 이상" },
];

const SORT_OPTIONS = [
  { value: "final_score",  label: "별점 순" },
  { value: "views",        label: "조회수 순" },
  { value: "score_fresh",  label: "신선도 순" },
  { value: "collected_at", label: "수집일 순" },
];

const STATUS_OPTIONS = [
  { value: "pending",  label: "대기중" },
  { value: "reserved", label: "예약 확정" },
  { value: "hidden",   label: "숨김" },
];

export function QueueFilters({ total }: { total: number }) {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  const era    = searchParams.get("era")    || "all";
  const stars  = searchParams.get("stars")  || "0";
  const sort   = searchParams.get("sort")   || "final_score";
  const status = searchParams.get("status") || "pending";

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      router.push(pathname + "?" + params.toString());
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-col gap-3 mb-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold" style={{ color: "var(--text)" }}>
            YouTube 큐
          </h1>
          <p className="text-[12px] mt-[2px]" style={{ color: "var(--text-muted)" }}>
            {total}개 영상
          </p>
        </div>
      </div>

      {/* 상태 탭 */}
      <div className="flex gap-[6px] flex-wrap">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => update("status", opt.value)}
            className="px-3 py-[5px] rounded-[20px] text-[12px] font-semibold transition-colors"
            style={
              status === opt.value
                ? { background: "var(--accent-dim)", color: "var(--accent)" }
                : { background: "var(--surface2)", color: "var(--text-muted)" }
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 필터 행 */}
      <div className="flex gap-[8px] flex-wrap items-center">
        {/* era 탭 */}
        <div
          className="flex rounded-[8px] overflow-hidden"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
        >
          {ERA_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => update("era", tab.value)}
              className={cn("px-3 py-[5px] text-[12px] font-semibold transition-colors")}
              style={
                era === tab.value
                  ? { background: "var(--accent-dim)", color: "var(--accent)" }
                  : { color: "var(--text-muted)" }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 별점 필터 */}
        <select
          value={stars}
          onChange={e => update("stars", e.target.value)}
          className="px-3 py-[5px] rounded-[8px] text-[12px] outline-none"
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
        >
          {STAR_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* 정렬 */}
        <select
          value={sort}
          onChange={e => update("sort", e.target.value)}
          className="px-3 py-[5px] rounded-[8px] text-[12px] outline-none"
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
