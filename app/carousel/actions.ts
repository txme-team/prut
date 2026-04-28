"use server";

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CHANNEL_CONTEXT = `
채널: @dawn.town.music
슬로건: "22세기 라디오"
채널 감성: 새벽, 그리움, 감성, 올드팝, 발라드
타겟: 감성적인 음악을 즐기는 2030대
금지: 아이돌 그룹, 댄스팝 언급 금지
`;

export interface CarouselSlide {
  slideNumber: number;
  text: string;
}

export interface CarouselResult {
  slides: CarouselSlide[];
  caption: string;
  hashtags: string;
}

export async function generateCarouselContent(
  title: string,
  channel: string,
  era: string,
  stars: number,
  slideCount: number,
): Promise<CarouselResult> {
  const prompt = `당신은 인스타그램 캐러셀 콘텐츠 크리에이터입니다.
${CHANNEL_CONTEXT}

아래 YouTube 영상을 기반으로 인스타그램 캐러셀 슬라이드 문구를 작성해주세요.

영상 정보:
- 제목: ${title}
- 아티스트/채널: ${channel}
- 시대: ${era === "classic" ? "클래식 (올드팝)" : "모던"}
- 별점: ${stars.toFixed(1)}/5.0
- 슬라이드 수: ${slideCount}장

요구사항:
1. 각 슬라이드: 짧고 강렬한 1~2줄 문구. 새벽 감성, 그리움, 위로.
2. 슬라이드 흐름: 도입 → 공감 → 절정 → (마무리/CTA)
3. 전체 캡션: 3~4줄, 이모지 1~2개
4. 해시태그: 10~15개

출력 형식 (JSON):
{
  "slides": [
    { "slideNumber": 1, "text": "슬라이드 1 문구" },
    { "slideNumber": 2, "text": "슬라이드 2 문구" }
  ],
  "caption": "전체 캡션",
  "hashtags": "#태그1 #태그2 ..."
}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude 응답 파싱 실패");

  return JSON.parse(jsonMatch[0]) as CarouselResult;
}
