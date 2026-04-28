"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import type { Json } from "@/lib/database.types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface CarouselSlide {
  slideNumber: number;
  songTitle: string;
  artist: string;
  keywords: string[];
  oneLiner: string;
  imageUrl?: string | null;
  isCTA?: boolean;
}

export interface CarouselResult {
  slides: CarouselSlide[];
  caption: string;
  hashtags: string;
}

export async function generateCarouselContent(
  theme: string,
  slideCount: number,
): Promise<CarouselResult> {
  const songCount = slideCount - 1;

  const prompt = `당신은 인스타그램 캐러셀 콘텐츠 크리에이터입니다.

채널: @dawn.town.music ("22세기 라디오")
감성: 새벽, 그리움, 위로, 올드팝/발라드
타겟: 음악에 감성적인 2030대
금지: 아이돌, 댄스팝 언급 없이

주제: "${theme}"

이 주제에 어울리는 곡 ${songCount}개를 선정하고, 각 슬라이드 문구를 작성해주세요.
마지막 ${slideCount}번째 슬라이드는 CTA(팔로우 유도) 슬라이드입니다.

각 곡 슬라이드:
- songTitle: 곡 제목
- artist: 아티스트명
- keywords: 감성 키워드 2~3개 (예: ["새벽", "그리움", "위로"])
- oneLiner: 채널 감성에 맞는 한 줄 소개 (20~35자, 따뜻하고 감성적으로)

CTA 슬라이드 (마지막):
- songTitle: "더 많은 감성 음악"
- artist: "@dawn.town.music"
- keywords: ["22세기 라디오", "팔로우"]
- oneLiner: "오늘 밤도 함께해요 🌙"

전체 캡션 (3~5줄, 이모지 1~2개, 주제 감성 살리기)과 해시태그 10~15개 (#22세기라디오 필수).

JSON만 출력:
{
  "slides": [
    { "slideNumber": 1, "songTitle": "...", "artist": "...", "keywords": ["..."], "oneLiner": "..." },
    { "slideNumber": ${slideCount}, "songTitle": "...", "artist": "...", "keywords": ["..."], "oneLiner": "...", "isCTA": true }
  ],
  "caption": "...",
  "hashtags": "..."
}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude 응답 파싱 실패");
  return JSON.parse(jsonMatch[0]) as CarouselResult;
}

export async function reserveCarousel(data: {
  theme: string;
  slides: CarouselSlide[];
  caption: string;
  hashtags: string;
  scheduledAt: string | null;
}): Promise<void> {
  const sb = createServiceClient();
  const { error } = await sb.from("carousel_posts").insert({
    theme: data.theme,
    slides: data.slides as unknown as Json,
    caption: data.caption,
    hashtags: data.hashtags,
    scheduled_at: data.scheduledAt,
    status: "reserved",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/pending");
  revalidatePath("/carousel");
}

export async function cancelCarousel(id: string): Promise<void> {
  const sb = createServiceClient();
  const { error } = await sb.from("carousel_posts").delete().eq("id", id);
  if (error) throw new Error("캐러셀 예약 취소 실패: " + error.message);
  revalidatePath("/pending");
}

export async function markCarouselUploaded(id: string): Promise<void> {
  const sb = createServiceClient();
  const { error } = await sb
    .from("carousel_posts")
    .update({ status: "uploaded" })
    .eq("id", id);
  if (error) throw new Error("업로드 완료 처리 실패: " + error.message);
  revalidatePath("/pending");
}
