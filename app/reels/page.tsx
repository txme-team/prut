export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase";
import { ReelsWorkflow } from "@/components/reels-workflow";

export default async function ReelsPage() {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("youtube_candidates")
    .select("id, video_id, title, channel, era, stars, thumbnail_url, views, like_rate, duration_sec")
    .eq("status", "reserved")
    .order("stars", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div className="p-6 text-[13px]" style={{ color: "var(--red)" }}>
        Supabase 오류: {error.message}
      </div>
    );
  }

  return <ReelsWorkflow candidates={data ?? []} />;
}
