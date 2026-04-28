"use server";

import { createServiceClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import type { Era, SourceType } from "@/lib/database.types";

export interface SourceFormData {
  name:         string;
  type:         SourceType;
  source_value: string;
  era:          Era;
  note?:        string;
}

/** 소스 추가 */
export async function createSource(data: SourceFormData) {
  const sb = createServiceClient();
  const { error } = await sb.from("sources").insert({
    name:         data.name.trim(),
    type:         data.type,
    source_value: data.source_value.trim(),
    era:          data.era,
    note:         data.note?.trim() || null,
    is_active:    true,
  });
  if (error) throw new Error("소스 추가 실패: " + error.message);
  revalidatePath("/sources");
}

/** 소스 수정 */
export async function updateSource(id: string, data: SourceFormData) {
  const sb = createServiceClient();
  const { error } = await sb
    .from("sources")
    .update({
      name:         data.name.trim(),
      type:         data.type,
      source_value: data.source_value.trim(),
      era:          data.era,
      note:         data.note?.trim() || null,
    })
    .eq("id", id);
  if (error) throw new Error("소스 수정 실패: " + error.message);
  revalidatePath("/sources");
}

/** 소스 활성/비활성 토글 */
export async function toggleSource(id: string, isActive: boolean) {
  const sb = createServiceClient();
  const { error } = await sb
    .from("sources")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error("상태 변경 실패: " + error.message);
  revalidatePath("/sources");
}

/** 소스 삭제 */
export async function deleteSource(id: string) {
  const sb = createServiceClient();
  const { error } = await sb.from("sources").delete().eq("id", id);
  if (error) throw new Error("소스 삭제 실패: " + error.message);
  revalidatePath("/sources");
}

/** YouTube 채널 핸들 유효성 검사 */
export async function validateYouTubeHandle(handle: string): Promise<{ ok: boolean; channelTitle?: string; error?: string }> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { ok: false, error: "YOUTUBE_API_KEY 없음" };

  // @ 제거
  const cleanHandle = handle.replace(/^@/, "");

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${encodeURIComponent(cleanHandle)}&key=${apiKey}`,
      { cache: "no-store" }
    );
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error?.message || "API 오류" };
    if (!json.items?.length) return { ok: false, error: "채널을 찾을 수 없습니다" };
    return { ok: true, channelTitle: json.items[0].snippet.title };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** YouTube 재생목록 유효성 검사 */
export async function validateYouTubePlaylist(playlistId: string): Promise<{ ok: boolean; playlistTitle?: string; error?: string }> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { ok: false, error: "YOUTUBE_API_KEY 없음" };

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${encodeURIComponent(playlistId)}&key=${apiKey}`,
      { cache: "no-store" }
    );
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error?.message || "API 오류" };
    if (!json.items?.length) return { ok: false, error: "재생목록을 찾을 수 없습니다" };
    return { ok: true, playlistTitle: json.items[0].snippet.title };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
