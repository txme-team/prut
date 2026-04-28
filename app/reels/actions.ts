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

export interface ReelsResult {
  caption: string;
  hashtags: string;
}

export async function generateReelsCaption(
  title: string,
  channel: string,
  era: string,
  stars: number,
): Promise<ReelsResult> {
  const prompt = `당신은 인스타그램 릴스 카피라이터입니다.
${CHANNEL_CONTEXT}

아래 YouTube 영상에 맞는 인스타그램 릴스 캡션과 해시태그를 작성해주세요.

영상 정보:
- 제목: ${title}
- 아티스트/채널: ${channel}
- 시대: ${era === "classic" ? "클래식 (올드팝)" : "모던"}
- 별점: ${stars.toFixed(1)}/5.0

요구사항:
1. 캡션: 3~5줄의 감성적인 문구. 새벽 감성, 그리움, 위로의 톤. 이모지 1~2개 사용.
2. 해시태그: 10~15개. #새벽감성 #올드팝 등 채널 핵심 태그 포함.
3. 형식: 캡션과 해시태그를 구분해서 출력.

출력 형식 (JSON):
{
  "caption": "캡션 내용",
  "hashtags": "#태그1 #태그2 ..."
}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude 응답 파싱 실패");

  const parsed = JSON.parse(jsonMatch[0]) as ReelsResult;
  return parsed;
}
