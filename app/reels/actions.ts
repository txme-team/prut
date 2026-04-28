"use server";

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ReelsVersion {
  name: string;
  thumbnailTitle: string;
  caption: string;
  hashtags: string;
}

export async function generateReelsContent(
  title: string,
  channel: string,
  era: string,
): Promise<ReelsVersion[]> {
  const prompt = `당신은 인스타그램 릴스 콘텐츠 크리에이터입니다.

채널: @dawn.town.music ("22세기 라디오")
감성: 새벽, 그리움, 위로, 올드팝/발라드
타겟: 음악에 감성적인 2030대
금지: 아이돌, 댄스팝 언급 없이

영상 정보:
- 제목: ${title}
- 아티스트: ${channel}
- 시대: ${era === "classic" ? "클래식 (올드팝/발라드)" : "모던"}

아래 2가지 감성 버전으로 릴스 콘텐츠를 만들어주세요:
- v1: 향수/그리움 감성
- v2: 위로/공감 감성

각 버전마다:
1. name: 버전명 (예: "v1 — 향수 감성")
2. thumbnailTitle: 썸네일에 올릴 짧은 인용구 (20자 이내, 큰따옴표 포함)
3. caption: 본문 캡션 (3~5줄, 이모지 1~2개)
4. hashtags: 해시태그 10~15개 (#22세기라디오 필수 포함)

JSON만 출력:
{
  "versions": [
    { "name": "...", "thumbnailTitle": "...", "caption": "...", "hashtags": "..." },
    { "name": "...", "thumbnailTitle": "...", "caption": "...", "hashtags": "..." }
  ]
}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude 응답 파싱 실패");
  const parsed = JSON.parse(jsonMatch[0]) as { versions: ReelsVersion[] };
  return parsed.versions;
}
