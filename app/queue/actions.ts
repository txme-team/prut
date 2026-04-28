"use server";

import { createServiceClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

/** 영상을 예약 확정 → youtube_candidates status=reserved + seen_videos insert */
export async function reserveVideo(videoId: string, candidateId: string) {
  const sb = createServiceClient();

  // 트랜잭션 흉내: 순차 실행
  const { error: e1 } = await sb
    .from("youtube_candidates")
    .update({ status: "reserved" })
    .eq("id", candidateId);

  if (e1) throw new Error("예약 확정 실패: " + e1.message);

  const { error: e2 } = await sb
    .from("seen_videos")
    .upsert({ video_id: videoId }, { onConflict: "video_id" });

  if (e2) throw new Error("seen_videos 기록 실패: " + e2.message);

  revalidatePath("/queue");
}

/** 영상 숨김 */
export async function hideVideo(candidateId: string) {
  const sb = createServiceClient();
  const { error } = await sb
    .from("youtube_candidates")
    .update({ status: "hidden" })
    .eq("id", candidateId);

  if (error) throw new Error("숨김 처리 실패: " + error.message);
  revalidatePath("/queue");
}

/** 숨김 / 예약 취소 → pending 복구 */
export async function restoreVideo(candidateId: string) {
  const sb = createServiceClient();
  const { error } = await sb
    .from("youtube_candidates")
    .update({ status: "pending" })
    .eq("id", candidateId);

  if (error) throw new Error("복구 실패: " + error.message);
  revalidatePath("/queue");
}
