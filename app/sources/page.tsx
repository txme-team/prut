export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase";
import { SourceRow } from "@/components/source-row";
import { SourceAddButton } from "@/components/source-add-button";

async function getSources() {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("sources")
    .select("*")
    .order("era", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export default async function SourcesPage() {
  const sources = await getSources();

  const classic = sources.filter(s => s.era === "classic");
  const modern  = sources.filter(s => s.era === "modern");

  const activeCount   = sources.filter(s => s.is_active).length;
  const inactiveCount = sources.length - activeCount;

  return (
    <div className="p-6 max-w-[800px]">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-bold" style={{ color: "var(--text)" }}>소스 관리</h1>
          <p className="text-[12px] mt-[2px]" style={{ color: "var(--text-muted)" }}>
            총 {sources.length}개 · 활성 {activeCount}개 · 비활성 {inactiveCount}개
          </p>
        </div>
        <SourceAddButton />
      </div>

      {/* Classic */}
      {classic.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-[10px] font-bold px-2 py-[2px] rounded-full uppercase"
              style={{ background: "rgba(200,169,110,.25)", color: "var(--accent)" }}
            >
              classic
            </span>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{classic.length}개</span>
          </div>
          <div className="flex flex-col gap-[8px]">
            {classic.map(s => <SourceRow key={s.id} source={s} />)}
          </div>
        </section>
      )}

      {/* Modern */}
      {modern.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-[10px] font-bold px-2 py-[2px] rounded-full uppercase"
              style={{ background: "rgba(156,127,224,.3)", color: "var(--purple)" }}
            >
              modern
            </span>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{modern.length}개</span>
          </div>
          <div className="flex flex-col gap-[8px]">
            {modern.map(s => <SourceRow key={s.id} source={s} />)}
          </div>
        </section>
      )}

      {sources.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-24 text-center"
          style={{ color: "var(--text-muted)" }}
        >
          <span className="text-[40px] mb-4">📡</span>
          <p className="text-[15px] font-semibold mb-2" style={{ color: "var(--text)" }}>
            소스가 없습니다
          </p>
          <p className="text-[12px]">우측 상단 "+ 소스 추가" 버튼으로 YouTube 채널을 등록하세요</p>
        </div>
      )}

      {/* 안내 */}
      <div
        className="rounded-[10px] p-4 mt-2"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
      >
        <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--text-muted)" }}>📌 ERA 수집 비율 안내</p>
        <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>
          dawn_monitor.js는 Classic 70% · Modern 30% 비율로 TOP 10 후보를 선정합니다.
          소스가 많을수록 다양한 후보가 수집됩니다.
        </p>
      </div>
    </div>
  );
}
