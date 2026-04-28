export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase";
import { Suspense } from "react";
import { PendingCard } from "@/components/pending-card";

async function PendingContent() {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("youtube_candidates")
    .select("*")
    .eq("status", "reserved")
    .order("stars", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="p-6 text-[13px]" style={{ color: "var(--red)" }}>
        Supabase 오류: {error.message}
      </div>
    );
  }

  const candidates = data ?? [];

  return (
    <>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-bold" style={{ color: "var(--text)" }}>
            업로드 대기
          </h1>
          <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>
            예약 확정된 영상 {candidates.length}개
          </p>
        </div>
      </div>

      {candidates.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 text-center"
          style={{ color: "var(--text-muted)" }}
        >
          <span className="text-[40px] mb-4">📭</span>
          <p className="text-[15px] font-semibold mb-2" style={{ color: "var(--text)" }}>
            예약 확정된 영상이 없습니다
          </p>
          <p className="text-[12px]">
            YouTube 큐에서 영상을 예약 확정하면 여기에 표시됩니다
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {candidates.map((c, i) => (
            <PendingCard key={c.id} candidate={c} index={i + 1} />
          ))}
        </div>
      )}
    </>
  );
}

export default function PendingPage() {
  return (
    <div className="p-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-24">
            <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              로딩 중...
            </span>
          </div>
        }
      >
        <PendingContent />
      </Suspense>
    </div>
  );
}
