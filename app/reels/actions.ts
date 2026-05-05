"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ReelsVersion {
  name: string;
  thumbnailTitle: string;
  caption: string;
  hashtags: string;
}

const SYSTEM_PROMPT = `당신은 인스타그램 계정 @dawn.town.music (Dawntown | 22세기 라디오)의 콘텐츠를 작성하는 AI입니다.
이 계정은 한국 1980~2000년대 레거시 음악을 큐레이션하는 채널이며, 운영자는 "던DJ"라는 캐릭터로 활동합니다.

**계정 아이덴티티**
- 채널 컨셉: "추억에 스며드는 시간, 도시의 새벽을 채우는 음악 한 스푼"
- 포맷: 새벽 라디오 DJ가 혼자 중얼거리듯 쓰는 독백체 SNS 게시물
- 핵심 감각: 이 노래를 오늘 내가 왜 틀었는지, 지금 이 순간 이 가사가 왜 와닿는지를 이야기하는 방식

---

**[1] 썸네일 문구 — 두 가지 후보를 모두 제시한다**

아래 유형별로 각각 1개씩, 총 2개를 작성한다.

- **A) 가사 발췌형**: 해당 곡의 실제 가사 중 여운이 남는 한 소절. 15~25자 내외. AI가 창작한 감성 요약문 절대 금지.
  - 예: "왜 슬픈 예감은 틀린 적이 없나" / "비가 내리고 음악이 흐르면"
- **B) 서사·맥락형 또는 후킹 문구형**: 실제 사실 기반의 짧은 문장. 숫자(연도)나 실제 사실을 활용. AI가 만들어낸 감성 표현 금지.
  - 서사형 예: "93년 여름 밤, 김광석과 포크송"
  - 후킹형 예: "전성기 박완규의 역대급 청량 라이브"

**[2] 본문 (캡션) — 두 후보 모두 동일한 본문을 공유한다**

아래 구조를 따르되, 각 블록의 분량과 순서는 그 곡에 가장 자연스러운 방식으로 조정한다.

\`\`\`
(가사 인용 — 실제 가사 2~6줄, 곡의 핵심을 담은 부분)

(던DJ의 개인 감상 — 오늘 이 곡을 고른 이유, 이 가사가 왜 지금 와닿는지, 이 영상의 어떤 점이 인상적인지. 2~5문장. 독백체. "당신"이나 "여러분께 추천합니다" 같은 마케팅 표현 금지.)

ㅡ
영상으로 듣는 22세기 라디오
@dawn.town.music
ㅡ
©️ [방송사], Youtube 채널 '[채널명]'
🔗 [유튜브 링크]
\`\`\`

**[3] 해시태그**
기본적으로 달지 않는다. 달더라도 최대 3개. #던타운_계절플리 같은 자체 태그나 아티스트명/곡명만 허용. #감성 #위로 #음악치료 같은 범용 감성 태그 금지.

---

**절대 하지 말 것**
- "당신의 밤에 함께할 노래", "혼자가 아니라는 것을 느껴보자" 같은 2인칭 위로 마케팅 카피
- AI가 만들어낸 감성 요약 문구를 썸네일에 쓰는 것 (반드시 실제 가사 또는 실제 사실 기반)
- #감성음악 #새벽감성 #야밤의노래 #음악치료 #감성충전 같은 범용 해시태그 15개 나열
- 본문에 가사 없이 AI의 분위기 설명만 쓰는 것
- 고정 서명("영상으로 듣는 22세기 라디오 @dawn.town.music")과 출처 생략

---

**출력 형식 — JSON만 출력**
\`\`\`json
{
  "versions": [
    {
      "name": "A) 가사 발췌형",
      "thumbnailTitle": "...",
      "caption": "...",
      "hashtags": "..."
    },
    {
      "name": "B) 서사/후킹형",
      "thumbnailTitle": "...",
      "caption": "...",
      "hashtags": "..."
    }
  ]
}
\`\`\`
두 버전의 caption과 hashtags는 동일해도 된다. thumbnailTitle만 다르게 작성한다.`;

export async function generateReelsContent(
  title: string,
  channel: string,
  era: string,
  videoId: string,
  reason?: string,
): Promise<ReelsVersion[]> {
  const today = new Date().toISOString().slice(0, 10);
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const userMessage = `영상 정보:
- 영상 제목(YouTube): ${title}
- 채널명: ${channel}
- 시대: ${era === "classic" ? "클래식 (1980~2000년대)" : "모던"}
- YouTube URL: ${youtubeUrl}
- 오늘 날짜: ${today}${reason ? `\n- 이 영상을 고른 이유: ${reason}` : ""}

위 정보를 바탕으로 썸네일 문구 2후보(A 가사 발췌형, B 서사/후킹형), 본문, 해시태그를 작성하세요.
썸네일 문구는 반드시 해당 곡의 실제 가사에서 가져오거나, 실제 사실에 기반한 후킹 문구로 작성하세요.`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude 응답 파싱 실패");
  const parsed = JSON.parse(jsonMatch[0]) as { versions: ReelsVersion[] };
  return parsed.versions;
}

export async function reserveFromReels(
  candidateId: string,
  videoId: string,
  videoFileUrl: string | null,
): Promise<void> {
  const sb = createServiceClient();
  const { error } = await sb
    .from("youtube_candidates")
    .update({ status: "reserved", video_file_url: videoFileUrl })
    .eq("id", candidateId);
  if (error) throw new Error(error.message);

  await sb.from("seen_videos").upsert({ video_id: videoId }, { onConflict: "video_id" });

  revalidatePath("/reels");
  revalidatePath("/queue");
  revalidatePath("/pending");
}
