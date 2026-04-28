export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase";
import { QueueCard } from "@/components/queue-card";
import { QueueFilters } from "@/components/queue-filters";
import { Suspense } from "react";

interface PageProps {
  searchParams: Promise<{
    era?:    string;
    stars?:  string;
    sort?:   string;
    status?: string;
  }>;
}

async function QueueContent({ searchParams }: PageProps) {
  const params = await searchParams;
  const era    = params.era    || "all";
  const stars  = parseFloat(params.stars  || "0");
  const sort   = params.sort   || "final_score";
  const status = params.status || "pending";

  const sb = createServiceClient();

  let query = sb
    .from("youtube_candidates")
    .select("*")
    .eq("status", status as "pending" | "reserved" | "hidden")
    .order(sort as "final_score", { ascending: false });

  if (era !== "all") {
    query = query.eq("era", era as "classic" | "modern");
  }
  if (stars > 0) {
    query = query.gte("stars", stars);
  }

  const { data, error } = await query.limit(200);

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
      <QueueFilters total={candidates.length} />

      {candidates.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 text-center"
          style={{ color: "var(--text-muted)" }}
        >
          <span className="text-[40px] mb-4">🎵</span>
          <p className="text-[15px] font-semibold mb-2" style={{ color: "var(--text)" }}>
            {status === "pending" ? "수집된 영상이 없습니다" : "해당 상태의 영상이 없습니다"}
          </p>
          <p className="text-[12px]">
            {status === "pending"
              ? "터미널에서 node dawn_monitor.js 를 실행해 영상을 수집하세요"
              : "필터를 변경해 보세요"}
          </p>
        </div>
      ) : (
        <div
          className="grid gap-[14px]"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
        >
          {candidates.map(c => (
            <QueueCard key={c.id} candidate={c} />
          ))}
        </div>
      )}
    </>
  );
}

export default function QueuePage(props: PageProps) {
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
        <QueueContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
