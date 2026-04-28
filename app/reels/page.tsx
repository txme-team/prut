export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase";
import { Suspense } from "react";
import { ReelsGenerator } from "@/components/reels-generator";

async function ReelsContent() {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("youtube_candidates")
    .select("id, video_id, title, channel, era, stars, thumbnail_url")
    .eq("status", "reserved")
    .order("stars", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <div className="p-6 text-[13px]" style={{ color: "var(--red)" }}>
        Supabase 오류: {error.message}
      </div>
    );
  }

  const candidates = data ?? [];

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center"
        style={{ color: "var(--text-muted)" }}>
        <span className="text-[40px] mb-4">🎬</span>
        <p className="text-[15px] font-semibold mb-2" style={{ color: "var(--text)" }}>
          예약 확정된 영상이 없습니다
        </p>
        <p className="text-[12px]">YouTube 큐에서 영상을 예약 확정하면 여기서 릴스 캡션을 생성할 수 있습니다</p>
      </div>
    );
  }

  return <ReelsGenerator candidates={candidates} />;
}

export default function ReelsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[18px] font-bold" style={{ color: "var(--text)" }}>릴스 생성</h1>
        <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>
          예약 확정 영상을 선택하고 Claude AI로 인스타그램 릴스 캡션을 자동 생성합니다
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-24">
            <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>로딩 중...</span>
          </div>
        }
      >
        <ReelsContent />
      </Suspense>
    </div>
  );
}
