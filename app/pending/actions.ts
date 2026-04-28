"use server";

import { createServiceClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function cancelReservation(candidateId: string) {
  const sb = createServiceClient();
  const { error } = await sb
    .from("youtube_candidates")
    .update({ status: "pending" })
    .eq("id", candidateId);
  if (error) throw new Error("예약 취소 실패: " + error.message);
  revalidatePath("/pending");
  revalidatePath("/queue");
  revalidatePath("/reels");
}

export async function markReelsUploaded(candidateId: string) {
  const sb = createServiceClient();
  const { error } = await sb
    .from("youtube_candidates")
    .update({ status: "hidden" })
    .eq("id", candidateId);
  if (error) throw new Error("업로드 완료 처리 실패: " + error.message);
  revalidatePath("/pending");
}
