"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Sparkles, ChevronDown } from "lucide-react";
import { generateCarouselContent, type CarouselResult } from "@/app/carousel/actions";

interface CandidateMini {
  id: string;
  video_id: string;
  title: string;
  channel: string;
  era: string;
  stars: number | null;
  thumbnail_url: string | null;
}

interface Props {
  candidates: CandidateMini[];
}

const SLIDE_OPTIONS = [2, 3, 4, 5];

export function CarouselGenerator({ candidates }: Props) {
  const [selectedId, setSelectedId] = useState(candidates[0]?.id ?? "");
  const [slideCount, setSlideCount] = useState(4);
  const [result, setResult] = useState<CarouselResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  const selected = candidates.find(c => c.id === selectedId);

  function handleGenerate() {
    if (!selected) return;
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const res = await generateCarouselContent(
          selected.title,
          selected.channel,
          selected.era,
          selected.stars ?? 3,
          slideCount,
        );
        setResult(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "생성 실패");
      }
    });
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000);
  }

  return (
    <div className="flex flex-col gap-5 max-w-[720px]">
      {/* 영상 선택 */}
      <div
        className="rounded-[10px] p-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--text-muted)" }}>영상 선택</p>
        <div className="relative mb-3">
          <select
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); setResult(null); setError(null); }}
            className="w-full appearance-none rounded-[8px] px-3 py-[9px] pr-8 text-[13px]"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              outline: "none",
            }}
          >
            {candidates.map(c => (
              <option key={c.id} value={c.id}>
                [{c.era === "classic" ? "C" : "M"}] ⭐ {(c.stars ?? 0).toFixed(1)} · {c.title} — {c.channel}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text-muted)" }}
          />
        </div>

        {/* 썸네일 미리보기 */}
        {selected?.thumbnail_url && (
          <div className="flex items-center gap-3">
            <img
              src={selected.thumbnail_url}
              alt={selected.title}
              className="rounded-[6px] object-cover flex-shrink-0"
              style={{ width: 80, aspectRatio: "16/9" }}
            />
            <div>
              <p className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>{selected.title}</p>
              <p className="text-[11px] mt-[2px]" style={{ color: "var(--text-muted)" }}>{selected.channel}</p>
            </div>
          </div>
        )}
      </div>

      {/* 슬라이드 수 선택 */}
      <div
        className="rounded-[10px] p-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <p className="text-[11px] font-semibold mb-3" style={{ color: "var(--text-muted)" }}>슬라이드 수</p>
        <div className="flex gap-2">
          {SLIDE_OPTIONS.map(n => (
            <button
              key={n}
              onClick={() => setSlideCount(n)}
              className="flex-1 py-[8px] rounded-[8px] text-[13px] font-semibold transition-colors"
              style={
                slideCount === n
                  ? { background: "var(--accent)", color: "#1a1400" }
                  : { background: "var(--surface2)", color: "var(--text-muted)" }
              }
            >
              {n}장
            </button>
          ))}
        </div>
      </div>

      {/* 생성 버튼 */}
      <button
        onClick={handleGenerate}
        disabled={isPending || !selected}
        className="flex items-center justify-center gap-2 py-[11px] rounded-[10px] text-[13px] font-semibold transition-opacity"
        style={{
          background: "var(--accent)",
          color: "#1a1400",
          opacity: isPending ? 0.6 : 1,
        }}
      >
        <Sparkles size={15} />
        {isPending ? "Claude AI 생성 중..." : "캐러셀 슬라이드 생성"}
      </button>

      {/* 에러 */}
      {error && (
        <div className="rounded-[10px] p-4 text-[13px]"
          style={{ background: "rgba(224,92,92,.1)", color: "var(--red)", border: "1px solid rgba(224,92,92,.3)" }}>
          {error}
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className="flex flex-col gap-3">
          {/* 슬라이드들 */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {result.slides.map(slide => (
              <div
                key={slide.slideNumber}
                className="rounded-[10px] p-4 flex flex-col gap-2"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-bold px-[7px] py-[2px] rounded-full"
                    style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                  >
                    슬라이드 {slide.slideNumber}
                  </span>
                  <button
                    onClick={() => copy(slide.text, `slide-${slide.slideNumber}`)}
                    className="flex items-center gap-1 text-[10px] px-[6px] py-[3px] rounded-[5px]"
                    style={{
                      background: "var(--surface2)",
                      color: copied[`slide-${slide.slideNumber}`] ? "var(--green)" : "var(--text-muted)",
                    }}
                  >
                    {copied[`slide-${slide.slideNumber}`] ? <Check size={10} /> : <Copy size={10} />}
                    복사
                  </button>
                </div>
                <p className="text-[13px] leading-[1.7] whitespace-pre-wrap" style={{ color: "var(--text)" }}>
                  {slide.text}
                </p>
              </div>
            ))}
          </div>

          {/* 전체 캡션 */}
          <div
            className="rounded-[10px] p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>전체 캡션</p>
              <button
                onClick={() => copy(result.caption, "caption")}
                className="flex items-center gap-1 text-[11px] px-[8px] py-[4px] rounded-[6px]"
                style={{ background: "var(--surface2)", color: copied.caption ? "var(--green)" : "var(--text-muted)" }}
              >
                {copied.caption ? <Check size={11} /> : <Copy size={11} />}
                {copied.caption ? "복사됨" : "복사"}
              </button>
            </div>
            <p className="text-[13px] leading-[1.8] whitespace-pre-wrap" style={{ color: "var(--text)" }}>
              {result.caption}
            </p>
          </div>

          {/* 해시태그 */}
          <div
            className="rounded-[10px] p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>해시태그</p>
              <button
                onClick={() => copy(result.hashtags, "hashtags")}
                className="flex items-center gap-1 text-[11px] px-[8px] py-[4px] rounded-[6px]"
                style={{ background: "var(--surface2)", color: copied.hashtags ? "var(--green)" : "var(--text-muted)" }}
              >
                {copied.hashtags ? <Check size={11} /> : <Copy size={11} />}
                {copied.hashtags ? "복사됨" : "복사"}
              </button>
            </div>
            <p className="text-[13px] leading-[1.8]" style={{ color: "var(--accent)" }}>
              {result.hashtags}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
