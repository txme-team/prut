"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RotateCcw, X, Upload, ImageIcon, Check, Copy } from "lucide-react";
import { generateCarouselContent, reserveCarousel, type CarouselSlide, type CarouselResult } from "@/app/carousel/actions";
import { supabase } from "@/lib/supabase";

const PRESET_THEMES = [
  "비 오는 날 듣기 좋은 노래",
  "새벽에 혼자 듣는 노래",
  "드라이브할 때 듣는 노래",
  "실연 후 들으면 좋은 노래",
  "90년대 감성 팝",
  "봄날에 어울리는 노래",
  "공부할 때 집중되는 감성 음악",
  "잠들기 전에 듣는 노래",
];

const SLIDE_COUNTS = [3, 4, 5, 6, 7, 8, 9, 10];

interface EditSlide extends CarouselSlide {
  imageUploading?: boolean;
}

interface EditState {
  slides: EditSlide[];
  caption: string;
  hashtags: string;
  date: string;
  time: string;
}

function defaultDateTime() {
  const now = new Date();
  const dtu = (2 - now.getDay() + 7) % 7 || 7;
  const d = new Date(now);
  d.setDate(now.getDate() + dtu);
  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    time: "19:00",
  };
}

function formatBytes(b: number) {
  if (b >= 1024 * 1024) return (b / (1024 * 1024)).toFixed(1) + " MB";
  return (b / 1024).toFixed(0) + " KB";
}

const COL_HEADER: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid var(--border)",
  background: "var(--surface2)",
  flexShrink: 0,
};
const COL_BODY: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};
const COL_FOOTER: React.CSSProperties = {
  padding: "10px 14px",
  borderTop: "1px solid var(--border)",
  background: "var(--surface2)",
  flexShrink: 0,
};

function ColLabel({ num, label }: { num: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)", letterSpacing: ".5px" }}>{num}</span>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--text-muted)" }}>
        {label}
      </span>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-dim)" }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>{icon}</div>
      <p style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-line" }}>{text}</p>
    </div>
  );
}

function SkeletonSlide() {
  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {[40, 70, 55, 85].map((w, i) => (
          <div key={i} className="skeleton-shimmer" style={{ height: 8, borderRadius: 4, width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

export function CarouselWorkflow() {
  const router = useRouter();
  const [theme, setTheme] = useState("");
  const [slideCount, setSlideCount] = useState(5);
  const [result, setResult] = useState<CarouselResult | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [selectedSlideIdx, setSelectedSlideIdx] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [genError, setGenError] = useState<string | null>(null);
  const [isReserving, setIsReserving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dt = defaultDateTime();

  function handlePreset(t: string) {
    setTheme(t);
  }

  function handleGenerate() {
    if (!theme.trim()) return;
    setGenError(null);
    setResult(null);
    setEditState(null);
    setSelectedSlideIdx(null);
    startTransition(async () => {
      try {
        const res = await generateCarouselContent(theme.trim(), slideCount);
        setResult(res);
        setEditState({
          slides: res.slides.map(s => ({ ...s, imageUrl: null })),
          caption: res.caption,
          hashtags: res.hashtags,
          date: dt.date,
          time: dt.time,
        });
      } catch (e) {
        setGenError(e instanceof Error ? e.message : "생성 실패");
      }
    });
  }

  function handleSelectSlide(idx: number) {
    setSelectedSlideIdx(idx);
  }

  function updateSlide(idx: number, patch: Partial<EditSlide>) {
    setEditState(prev => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      slides[idx] = { ...slides[idx], ...patch };
      return { ...prev, slides };
    });
  }

  const uploadImage = useCallback(async (file: File, slideIdx: number) => {
    const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
    if (!ACCEPTED.includes(file.type)) {
      return;
    }
    if (file.size > 10 * 1024 * 1024) return;

    updateSlide(slideIdx, { imageUploading: true });
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `slide-${Date.now()}-${slideIdx}.${ext}`;

    const { error } = await supabase.storage.from("carousel").upload(path, file, { upsert: true });
    if (error) {
      updateSlide(slideIdx, { imageUploading: false });
      return;
    }
    const { data } = supabase.storage.from("carousel").getPublicUrl(path);
    updateSlide(slideIdx, { imageUrl: data.publicUrl, imageUploading: false });
  }, []);

  function handleDrop(e: React.DragEvent, slideIdx: number) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadImage(file, slideIdx);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>, slideIdx: number) {
    const file = e.target.files?.[0];
    if (file) uploadImage(file, slideIdx);
    e.target.value = "";
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  }

  async function handleReserve() {
    if (!editState) return;
    setIsReserving(true);
    try {
      await reserveCarousel({
        theme,
        slides: editState.slides,
        caption: editState.caption,
        hashtags: editState.hashtags,
        scheduledAt: editState.date && editState.time
          ? new Date(`${editState.date}T${editState.time}`).toISOString()
          : null,
      });
      setShowModal(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
      router.refresh();
      setResult(null);
      setEditState(null);
      setSelectedSlideIdx(null);
      setTheme("");
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "예약 실패");
      setShowModal(false);
    } finally {
      setIsReserving(false);
    }
  }

  const selectedSlide = editState && selectedSlideIdx !== null ? editState.slides[selectedSlideIdx] : null;
  const isGenerating = isPending;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>

      {/* ── COL 1: 주제 설정 ── */}
      <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)" }}>
        <div style={COL_HEADER}>
          <ColLabel num="01" label="주제 설정" />
          <p style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 4 }}>추천 주제를 선택하거나 직접 입력</p>
        </div>

        <div style={{ ...COL_BODY, gap: 12 }}>
          {/* 추천 주제 칩 */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>추천 주제</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PRESET_THEMES.map(t => (
                <button
                  key={t}
                  onClick={() => handlePreset(t)}
                  style={{
                    padding: "5px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                    border: `1px solid ${theme === t ? "var(--accent)" : "var(--border)"}`,
                    background: theme === t ? "var(--accent-dim)" : "var(--surface2)",
                    color: theme === t ? "var(--accent)" : "var(--text-muted)",
                    transition: "all .15s",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 직접 입력 */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>직접 입력</p>
            <textarea
              rows={2}
              value={theme}
              onChange={e => setTheme(e.target.value)}
              placeholder="예: 첫사랑이 생각나는 노래"
              style={{
                width: "100%", background: "var(--surface3)", border: `1px solid ${theme ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 8, color: "var(--text)", fontSize: 12, padding: "9px 10px",
                resize: "none", fontFamily: "inherit", lineHeight: 1.5, outline: "none",
                transition: "border-color .15s",
              }}
            />
          </div>

          {/* 슬라이드 수 */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>슬라이드 수</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SLIDE_COUNTS.map(n => (
                <button
                  key={n}
                  onClick={() => setSlideCount(n)}
                  style={{
                    width: 40, height: 34, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    border: `1px solid ${slideCount === n ? "var(--accent)" : "var(--border)"}`,
                    background: slideCount === n ? "var(--accent)" : "var(--surface2)",
                    color: slideCount === n ? "#1a1400" : "var(--text-muted)",
                    transition: "all .15s",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 6 }}>
              곡 소개 {slideCount - 1}장 + CTA 1장
            </p>
          </div>

          {genError && (
            <div style={{ background: "rgba(224,92,92,.1)", border: "1px solid rgba(224,92,92,.3)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--red)" }}>
              {genError}
            </div>
          )}
        </div>

        <div style={COL_FOOTER}>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !theme.trim()}
            style={{
              width: "100%", background: "var(--accent)", color: "#1a1400",
              border: "none", borderRadius: 8, padding: "9px 0",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              opacity: isGenerating || !theme.trim() ? 0.5 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <Sparkles size={13} />
            {isGenerating ? "Claude AI 생성 중..." : "캐러셀 슬라이드 생성 →"}
          </button>
        </div>
      </div>

      {/* ── COL 2: 생성된 슬라이드 ── */}
      <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)" }}>
        <div style={COL_HEADER}>
          <ColLabel num="02" label="슬라이드 목록" />
          <p style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 4 }}>클릭하면 오른쪽에서 편집</p>
        </div>

        <div style={COL_BODY}>
          {isGenerating && Array.from({ length: slideCount }).map((_, i) => <SkeletonSlide key={i} />)}

          {!isGenerating && !editState && (
            <EmptyState icon="🎞️" text={"주제를 설정하고\n[슬라이드 생성] 버튼을 누르세요"} />
          )}

          {!isGenerating && editState && editState.slides.map((slide, idx) => {
            const isSel = selectedSlideIdx === idx;
            return (
              <div
                key={idx}
                onClick={() => handleSelectSlide(idx)}
                style={{
                  background: isSel ? "var(--accent-dim)" : "var(--surface2)",
                  border: `1px solid ${isSel ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 8, padding: 11, cursor: "pointer",
                  transition: "border-color .15s",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 20,
                    ...(slide.isCTA
                      ? { background: "rgba(156,127,224,.25)", color: "var(--purple)" }
                      : { background: "var(--accent-dim)", color: "var(--accent)" }),
                  }}>
                    {slide.isCTA ? "CTA" : `${slide.slideNumber}`}
                  </span>
                  {slide.imageUrl && (
                    <span style={{ fontSize: 9, color: "var(--green)" }}>📷</span>
                  )}
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
                  {slide.songTitle}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>
                  {slide.artist}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 5 }}>
                  {slide.keywords.map(k => (
                    <span key={k} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 10, background: "var(--surface3)", color: "var(--text-dim)" }}>
                      {k}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}>
                  {slide.oneLiner}
                </p>
              </div>
            );
          })}
        </div>

        {editState && (
          <div style={COL_FOOTER}>
            <button
              onClick={() => {
                if (!theme.trim()) return;
                setEditState(null);
                setSelectedSlideIdx(null);
                setGenError(null);
                startTransition(async () => {
                  try {
                    const res = await generateCarouselContent(theme.trim(), slideCount);
                    setResult(res);
                    setEditState({ slides: res.slides.map(s => ({ ...s, imageUrl: null })), caption: res.caption, hashtags: res.hashtags, date: dt.date, time: dt.time });
                  } catch (e) {
                    setGenError(e instanceof Error ? e.message : "재생성 실패");
                  }
                });
              }}
              disabled={isGenerating}
              style={{
                width: "100%", background: "transparent", border: "1px solid var(--border)",
                borderRadius: 8, padding: "8px 0", fontSize: 11, fontWeight: 600,
                color: "var(--text-muted)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                opacity: isGenerating ? 0.5 : 1,
              }}
            >
              <RotateCcw size={11} /> 전체 재생성
            </button>
          </div>
        )}
      </div>

      {/* ── COL 3: 슬라이드 편집 + 예약 ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={COL_HEADER}>
          <ColLabel num="03" label="편집 & 예약" />
        </div>

        <div style={{ ...COL_BODY, gap: 14 }}>
          {!editState ? (
            <EmptyState icon="✏️" text={"슬라이드를 생성하면\n여기서 편집하고 예약할 수 있습니다"} />
          ) : (
            <>
              {/* 선택된 슬라이드 편집 */}
              {selectedSlide && selectedSlideIdx !== null ? (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                      ...(selectedSlide.isCTA
                        ? { background: "rgba(156,127,224,.25)", color: "var(--purple)" }
                        : { background: "var(--accent-dim)", color: "var(--accent)" }),
                    }}>
                      {selectedSlide.isCTA ? "CTA 슬라이드" : `슬라이드 ${selectedSlide.slideNumber}`}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { key: "songTitle", label: "곡 제목", rows: 1 },
                      { key: "artist", label: "아티스트", rows: 1 },
                      { key: "oneLiner", label: "한 줄 소개", rows: 2 },
                    ].map(({ key, label, rows }) => (
                      <div key={key}>
                        <p style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>{label}</p>
                        <textarea
                          rows={rows}
                          value={(selectedSlide as unknown as Record<string, string>)[key]}
                          onChange={e => updateSlide(selectedSlideIdx, { [key]: e.target.value })}
                          style={{
                            width: "100%", background: "var(--surface3)", border: "1px solid var(--border)",
                            borderRadius: 7, color: "var(--text)", fontSize: 12, padding: "8px 10px",
                            resize: "none", fontFamily: "inherit", lineHeight: 1.5, outline: "none",
                          }}
                        />
                      </div>
                    ))}

                    {/* 키워드 */}
                    <div>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".4px" }}>키워드</p>
                      <input
                        type="text"
                        value={selectedSlide.keywords.join(", ")}
                        onChange={e => updateSlide(selectedSlideIdx, { keywords: e.target.value.split(",").map(k => k.trim()).filter(Boolean) })}
                        placeholder="쉼표로 구분"
                        style={{
                          width: "100%", background: "var(--surface3)", border: "1px solid var(--border)",
                          borderRadius: 7, color: "var(--text)", fontSize: 12, padding: "8px 10px",
                          fontFamily: "inherit", outline: "none",
                        }}
                      />
                    </div>

                    {/* 이미지 업로드 */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <p style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px" }}>슬라이드 이미지</p>
                        {selectedSlide.imageUrl && (
                          <button
                            onClick={() => updateSlide(selectedSlideIdx, { imageUrl: null })}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 3 }}
                          >
                            <X size={10} /> 제거
                          </button>
                        )}
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={e => handleFileInput(e, selectedSlideIdx)}
                        style={{ display: "none" }}
                      />

                      {selectedSlide.imageUrl ? (
                        <div style={{ position: "relative", borderRadius: 8, overflow: "hidden" }}>
                          <img src={selectedSlide.imageUrl} alt="slide" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                              position: "absolute", bottom: 8, right: 8,
                              background: "rgba(0,0,0,.7)", border: "none", borderRadius: 6,
                              padding: "5px 10px", fontSize: 10, color: "#fff", cursor: "pointer",
                            }}
                          >
                            변경
                          </button>
                        </div>
                      ) : selectedSlide.imageUploading ? (
                        <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "16px", textAlign: "center" }}>
                          <div className="upload-progress-bar" style={{ height: 3, background: "var(--accent)", borderRadius: 2, marginBottom: 8 }} />
                          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>업로드 중...</p>
                        </div>
                      ) : (
                        <div
                          onDrop={e => handleDrop(e, selectedSlideIdx)}
                          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                          onDragLeave={() => setIsDragOver(false)}
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            border: `2px dashed ${isDragOver ? "var(--accent)" : "var(--border)"}`,
                            borderRadius: 8, padding: "20px 16px", textAlign: "center", cursor: "pointer",
                            background: isDragOver ? "var(--accent-dim)" : "transparent",
                            transition: "all .15s",
                          }}
                        >
                          <ImageIcon size={20} style={{ color: isDragOver ? "var(--accent)" : "var(--text-dim)", margin: "0 auto 6px" } as React.CSSProperties} />
                          <p style={{ fontSize: 12, color: isDragOver ? "var(--accent)" : "var(--text-muted)" }}>
                            {isDragOver ? "여기에 놓으세요" : "이미지 드래그 또는 클릭"}
                          </p>
                          <p style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 3 }}>jpg, png, webp · 최대 10MB</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: "var(--surface2)", border: "1px dashed var(--border)", borderRadius: 10, padding: "20px 16px", textAlign: "center" }}>
                  <p style={{ fontSize: 12, color: "var(--text-dim)" }}>← 슬라이드를 클릭하면 여기서 편집됩니다</p>
                </div>
              )}

              {/* 캡션 */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px" }}>전체 캡션</span>
                  <button
                    onClick={() => copy(editState.caption, "caption")}
                    style={{ display: "flex", alignItems: "center", gap: 3, background: "var(--surface3)", border: "none", borderRadius: 5, padding: "3px 8px", fontSize: 10, cursor: "pointer", color: copiedField === "caption" ? "var(--green)" : "var(--text-muted)" }}
                  >
                    {copiedField === "caption" ? <Check size={9} /> : <Copy size={9} />} 복사
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={editState.caption}
                  onChange={e => setEditState(prev => prev ? { ...prev, caption: e.target.value } : null)}
                  style={{ width: "100%", background: "var(--surface3)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text)", fontSize: 12, padding: "10px", resize: "none", fontFamily: "inherit", lineHeight: 1.6, outline: "none" }}
                />
                <p style={{ fontSize: 10, color: editState.caption.length > 2000 ? "var(--red)" : "var(--text-dim)", marginTop: 3, textAlign: "right" }}>
                  {editState.caption.length} / 2200
                </p>
              </div>

              {/* 해시태그 */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px" }}>해시태그</span>
                  <button
                    onClick={() => copy(editState.hashtags, "hashtags")}
                    style={{ display: "flex", alignItems: "center", gap: 3, background: "var(--surface3)", border: "none", borderRadius: 5, padding: "3px 8px", fontSize: 10, cursor: "pointer", color: copiedField === "hashtags" ? "var(--green)" : "var(--text-muted)" }}
                  >
                    {copiedField === "hashtags" ? <Check size={9} /> : <Copy size={9} />} 복사
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={editState.hashtags}
                  onChange={e => setEditState(prev => prev ? { ...prev, hashtags: e.target.value } : null)}
                  style={{ width: "100%", background: "var(--surface3)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--accent)", fontSize: 12, padding: "10px", resize: "none", fontFamily: "inherit", lineHeight: 1.6, outline: "none" }}
                />
              </div>

              {/* 예약 일시 */}
              <div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>업로드 예약 일시</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="date"
                    value={editState.date}
                    onChange={e => setEditState(prev => prev ? { ...prev, date: e.target.value } : null)}
                    style={{ flex: 1, background: "var(--surface3)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text)", fontSize: 12, padding: "8px 10px", fontFamily: "inherit", outline: "none" }}
                  />
                  <input
                    type="time"
                    value={editState.time}
                    onChange={e => setEditState(prev => prev ? { ...prev, time: e.target.value } : null)}
                    style={{ width: 90, background: "var(--surface3)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text)", fontSize: 12, padding: "8px 10px", fontFamily: "inherit", outline: "none" }}
                  />
                </div>
              </div>

              <button
                onClick={() => setShowModal(true)}
                style={{ width: "100%", background: "var(--accent)", color: "#1a1400", border: "none", borderRadius: 10, padding: "13px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                업로드 예약
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 예약 확인 모달 ── */}
      {showModal && editState && (
        <div
          onClick={() => setShowModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, maxWidth: 360, width: "100%" }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "var(--text)" }}>업로드를 예약할까요?</h3>
            <div style={{ background: "var(--surface2)", borderRadius: 8, padding: 12, marginBottom: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "콘텐츠 유형", val: "🖼️ 캐러셀" },
                { label: "주제", val: theme },
                { label: "슬라이드 수", val: `${editState.slides.length}장` },
                { label: "이미지 첨부", val: `${editState.slides.filter(s => s.imageUrl).length}장` },
                { label: "예약 일시", val: editState.date && editState.time ? `${editState.date} ${editState.time}` : "미설정" },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0" }}>
                  <span style={{ color: "var(--text-muted)" }}>{row.label}</span>
                  <span style={{ fontWeight: 600, color: "var(--text)", maxWidth: 200, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.val}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ flex: 1, background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 0", fontSize: 13, color: "var(--text-muted)", cursor: "pointer" }}
              >
                취소
              </button>
              <button
                onClick={handleReserve}
                disabled={isReserving}
                style={{ flex: 1, background: "var(--accent)", border: "none", borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 700, color: "#1a1400", cursor: "pointer", opacity: isReserving ? 0.5 : 1 }}
              >
                {isReserving ? "예약 중..." : "예약 확정"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 토스트 ── */}
      {showToast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 100, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 10, alignItems: "center", boxShadow: "0 8px 32px rgba(0,0,0,.4)", maxWidth: 320 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(76,175,130,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>✅</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, color: "var(--text)" }}>캐러셀이 예약됐습니다</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>업로드 대기에서 확인하세요</p>
          </div>
          <button onClick={() => setShowToast(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={14} /></button>
        </div>
      )}

      <style>{`
        .skeleton-shimmer {
          background: linear-gradient(90deg, var(--surface2) 25%, var(--surface3) 50%, var(--surface2) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .upload-progress-bar { animation: upload-fill 1.8s ease-in-out infinite; }
        @keyframes upload-fill { 0% { width: 15%; } 50% { width: 80%; } 100% { width: 95%; } }
      `}</style>
    </div>
  );
}
