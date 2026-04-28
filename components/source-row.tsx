"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, ToggleLeft, ToggleRight, CalendarClock } from "lucide-react";
import { toggleSource, deleteSource } from "@/app/sources/actions";
import { SourceForm } from "@/components/source-form";
import type { Database } from "@/lib/database.types";

type Source = Database["public"]["Tables"]["sources"]["Row"];

interface Props {
  source: Source;
}

export function SourceRow({ source: s }: Props) {
  const [editing,    setEditing]    = useState(false);
  const [isPending,  startTransition] = useTransition();

  function handleToggle() {
    startTransition(() => toggleSource(s.id, !s.is_active));
  }

  function handleDelete() {
    if (!confirm(`"${s.name}" 소스를 삭제하시겠습니까?\n이 소스에서 수집된 영상 데이터는 유지됩니다.`)) return;
    startTransition(() => deleteSource(s.id));
  }

  const lastRun = s.last_run_at
    ? new Date(s.last_run_at).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "미실행";

  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-[10px] transition-opacity"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          opacity: s.is_active ? 1 : 0.5,
        }}
      >
        {/* Era 배지 */}
        <span
          className="text-[9px] font-bold px-[6px] py-[2px] rounded-full uppercase flex-shrink-0"
          style={
            s.era === "modern"
              ? { background: "rgba(156,127,224,.3)", color: "var(--purple)" }
              : { background: "rgba(200,169,110,.25)", color: "var(--accent)" }
          }
        >
          {s.era}
        </span>

        {/* 이름 + 값 */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text)" }}>
            {s.name}
          </p>
          <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
            {s.type === "handle" ? "@" : "📋 "}{s.source_value}
            {s.note && <span className="ml-2 opacity-60">· {s.note}</span>}
          </p>
        </div>

        {/* 마지막 실행 */}
        <div className="flex items-center gap-1 text-[10px] flex-shrink-0" style={{ color: "var(--text-dim)" }}>
          <CalendarClock size={10} />
          <span>{lastRun}</span>
          {s.last_run_count != null && (
            <span style={{ color: "var(--accent)" }}>({s.last_run_count}개)</span>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-[6px] flex-shrink-0">
          {/* 활성화 토글 */}
          <button
            onClick={handleToggle}
            disabled={isPending}
            title={s.is_active ? "비활성화" : "활성화"}
            style={{ color: s.is_active ? "var(--green)" : "var(--text-dim)" }}
          >
            {s.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          </button>

          {/* 수정 */}
          <button
            onClick={() => setEditing(true)}
            title="수정"
            className="p-[5px] rounded-[6px] transition-colors"
            style={{ color: "var(--text-muted)", background: "var(--surface2)" }}
          >
            <Pencil size={12} />
          </button>

          {/* 삭제 */}
          <button
            onClick={handleDelete}
            disabled={isPending}
            title="삭제"
            className="p-[5px] rounded-[6px] transition-colors"
            style={{ color: "var(--red)", background: "rgba(230,85,85,.12)" }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {editing && <SourceForm source={s} onClose={() => setEditing(false)} />}
    </>
  );
}
