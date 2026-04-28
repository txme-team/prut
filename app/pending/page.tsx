export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase";
import { Suspense } from "react";
import { PendingCard } from "@/components/pending-card";
import { CarouselPendingCard } from "@/components/carousel-pending-card";

async function PendingContent() {
  const sb = createServiceClient();

  const [reelsResult, carouselResult] = await Promise.all([
    sb
      .from("youtube_candidates")
      .select("*")
      .eq("status", "reserved")
      .order("stars", { ascending: false })
      .limit(200),
    sb
      .from("carousel_posts")
      .select("*")
      .eq("status", "reserved")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (reelsResult.error || carouselResult.error) {
    const msg = reelsResult.error?.message ?? carouselResult.error?.message;
    return (
      <div className="p-6 text-[13px]" style={{ color: "var(--red)" }}>
        Supabase 오류: {msg}
      </div>
    );
  }

  const reels = reelsResult.data ?? [];
  const carousels = carouselResult.data ?? [];
  const total = reels.length + carousels.length;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-bold" style={{ color: "var(--text)" }}>
            업로드 대기
          </h1>
          <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>
            총 {total}개 · 릴스 {reels.length}개 · 캐러셀 {carousels.length}개
          </p>
        </div>
      </div>

      {total === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 text-center"
          style={{ color: "var(--text-muted)" }}
        >
          <span className="text-[40px] mb-4">📭</span>
          <p className="text-[15px] font-semibold mb-2" style={{ color: "var(--text)" }}>
            예약된 콘텐츠가 없습니다
          </p>
          <p className="text-[12px]">
            릴스 또는 캐러셀을 생성하고 예약하면 여기에 표시됩니다
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {reels.length > 0 && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-dim)" }}>
                🎬 릴스
              </p>
              {reels.map((c, i) => (
                <PendingCard key={c.id} candidate={c} index={i + 1} />
              ))}
            </>
          )}

          {carousels.length > 0 && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider mt-4 mb-1" style={{ color: "var(--text-dim)" }}>
                🖼️ 캐러셀
              </p>
              {carousels.map((c, i) => (
                <CarouselPendingCard key={c.id} post={c} index={i + 1} />
              ))}
            </>
          )}
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
            <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>로딩 중...</span>
          </div>
        }
      >
        <PendingContent />
      </Suspense>
    </div>
  );
}
