"use client";

import { useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
import { cancelCarousel, markCarouselUploaded } from "@/app/carousel/actions";
import type { Database } from "@/lib/database.types";

type CarouselPost = Database["public"]["Tables"]["carousel_posts"]["Row"];

interface Props {
  post: CarouselPost;
  index: number;
}

function formatDate(iso: string | null) {
  if (!iso) return "일시 미설정";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function getSlideCount(slides: unknown): number {
  if (Array.isArray(slides)) return slides.length;
  return 0;
}

function getImageCount(slides: unknown): number {
  if (!Array.isArray(slides)) return 0;
  return slides.filter((s: { imageUrl?: string | null }) => s?.imageUrl).length;
}

export function CarouselPendingCard({ post, index }: Props) {
  const [isPending, startTransition] = useTransition();
  const slideCount = getSlideCount(post.slides);
  const imageCount = getImageCount(post.slides);

  function handleCancel() {
    startTransition(() => cancelCarousel(post.id));
  }

  function handleUploaded() {
    startTransition(() => markCarouselUploaded(post.id));
  }

  return (
    <div
      className="flex items-center gap-4 rounded-[10px] overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        opacity: isPending ? 0.5 : 1,
        transition: "opacity .2s",
      }}
    >
      {/* 순번 */}
      <div
        className="flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
        style={{
          width: 44,
          alignSelf: "stretch",
          background: "var(--surface2)",
          color: "var(--text-dim)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {index}
      </div>

      {/* 아이콘 */}
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-[8px]"
        style={{ width: 56, height: 56, background: "rgba(156,127,224,.15)", fontSize: 24 }}
      >
        🖼️
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0 py-3 pr-2">
        <div className="flex items-center gap-2 mb-[3px]">
          <span
            className="text-[9px] font-bold px-[6px] py-[1px] rounded-full uppercase"
            style={{ background: "rgba(156,127,224,.25)", color: "var(--purple)" }}
          >
            캐러셀
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
            {slideCount}장{imageCount > 0 ? ` · 이미지 ${imageCount}장` : ""}
          </span>
        </div>
        <p
          className="text-[13px] font-semibold leading-[1.4] truncate"
          style={{ color: "var(--text)" }}
        >
          {post.theme}
        </p>
        <p className="text-[11px] mt-[2px]" style={{ color: "var(--text-muted)" }}>
          {formatDate(post.scheduled_at)}
        </p>
      </div>

      {/* 액션 */}
      <div className="flex items-center gap-2 pr-4 flex-shrink-0">
        <button
          onClick={handleUploaded}
          disabled={isPending}
          className="flex items-center gap-1 text-[11px] font-semibold px-[10px] py-[6px] rounded-[7px]"
          style={{ background: "rgba(76,175,130,.15)", color: "var(--green)", border: "1px solid rgba(76,175,130,.3)" }}
        >
          <Check size={11} />
          업로드 완료
        </button>
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="flex items-center gap-1 text-[11px] px-[10px] py-[6px] rounded-[7px]"
          style={{ background: "var(--surface3)", color: "var(--text-muted)" }}
        >
          <Trash2 size={11} />
          삭제
        </button>
      </div>
    </div>
  );
}
