"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, RotateCcw, Sparkles, Copy, Check, X, Upload, Film } from "lucide-react";
import { generateReelsContent, reserveFromReels, type ReelsVersion } from "@/app/reels/actions";
import { supabase } from "@/lib/supabase";

interface Candidate {
  id: string;
  video_id: string;
  title: string;
  channel: string;
  era: string;
  stars: number;
  thumbnail_url: string | null;
  views: number;
  like_rate: number;
  duration_sec: number;
  final_score: number;
}

interface EditState {
  thumbnailTitle: string;
  caption: string;
  hashtags: string;
  date: string;
  time: string;
}

interface UploadState {
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
  url: string | null;
  error: string | null;
}

function formatViews(v: number) {
  if (v >= 10000) return (v / 10000).toFixed(1) + "만";
  return v.toLocaleString();
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / 1024).toFixed(0) + " KB";
}

function toStars(n: number) {
  const full = Math.floor(n);
  const half = n - full >= 0.5 ? 1 : 0;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - half);
}

function starColor(n: number) {
  return n >= 4.5 ? "#f5c518" : n >= 3.5 ? "var(--accent)" : "#888";
}

function defaultDateTime() {
  const now = new Date();
  const dtu = (2 - now.getDay() + 7) % 7 || 7;
  const d = new Date(now);
  d.setDate(now.getDate() + dtu);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return { date: `${y}-${m}-${day}`, time: "19:00" };
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
      <p style={{ fontSize: 12, lineHeight: 1.6 }}>{text}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <div className="skeleton-shimmer" style={{ height: 56 }} />
      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        {[80, 60, 45].map((w, i) => (
          <div key={i} className="skeleton-shimmer" style={{ height: 8, borderRadius: 4, width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

interface Props {
  candidates: Candidate[];
}

export function ReelsWorkflow({ candidates }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(candidates[0]?.id ?? null);
  const [versions, setVersions] = useState<ReelsVersion[]>([]);
  const [selectedVersionIdx, setSelectedVersionIdx] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [isPending, startTransition] = useTransition();
  const [regenIdx, setRegenIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReserving, setIsReserving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = candidates.find(c => c.id === selectedId) ?? null;
  const dt = defaultDateTime();

  function handleSelectVideo(id: string) {
    if (id === selectedId) return;
    setSelectedId(id);
    setVersions([]);
    setSelectedVersionIdx(null);
    setEditState(null);
    setError(null);
  }

  function handleGenerate() {
    if (!selected) return;
    setError(null);
    setVersions([]);
    setSelectedVersionIdx(null);
    setEditState(null);
    startTransition(async () => {
      try {
        const result = await generateReelsContent(selected.title, selected.channel, selected.era);
        setVersions(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "생성 실패");
      }
    });
  }

  function handleSelectVersion(idx: number) {
    setSelectedVersionIdx(idx);
    const v = versions[idx];
    setEditState({
      thumbnailTitle: v.thumbnailTitle,
      caption: v.caption,
      hashtags: v.hashtags,
      date: dt.date,
      time: dt.time,
    });
  }

  function handleRegen(idx: number) {
    if (!selected) return;
    setRegenIdx(idx);
    startTransition(async () => {
      try {
        const result = await generateReelsContent(selected.title, selected.channel, selected.era);
        setVersions(prev => {
          const next = [...prev];
          next[idx] = result[idx] ?? result[0];
          return next;
        });
        if (selectedVersionIdx === idx) {
          const newV = result[idx] ?? result[0];
          setEditState(prev => prev ? { ...prev, thumbnailTitle: newV.thumbnailTitle, caption: newV.caption, hashtags: newV.hashtags } : null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "재생성 실패");
      } finally {
        setRegenIdx(null);
      }
    });
  }

  const uploadFile = useCallback(async (file: File) => {
    const ACCEPTED = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm", "video/mov"];
    if (!ACCEPTED.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|webm|m4v)$/i)) {
      setUploadState({ file, progress: 0, status: "error", url: null, error: "지원하지 않는 파일 형식입니다 (mp4, mov, avi, webm)" });
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setUploadState({ file, progress: 0, status: "error", url: null, error: "파일 크기는 500MB 이하여야 합니다" });
      return;
    }

    const ext = file.name.split(".").pop() ?? "mp4";
    const path = `${selectedId ?? "unknown"}/${Date.now()}.${ext}`;

    setUploadState({ file, progress: 0, status: "uploading", url: null, error: null });

    const { error: uploadError } = await supabase.storage
      .from("reels")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      setUploadState(prev => prev ? { ...prev, status: "error", error: uploadError.message } : null);
      return;
    }

    const { data: urlData } = supabase.storage.from("reels").getPublicUrl(path);
    setUploadState(prev => prev ? { ...prev, progress: 100, status: "done", url: urlData.publicUrl } : null);
  }, [selectedId]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  async function handleReserve() {
    if (!selected) return;
    setIsReserving(true);
    try {
      await reserveFromReels(selected.id, selected.video_id, uploadState?.url ?? null);
      setShowModal(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
      router.refresh();
      setSelectedId(null);
      setVersions([]);
      setSelectedVersionIdx(null);
      setEditState(null);
      setUploadState(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "예약 실패");
      setShowModal(false);
    } finally {
      setIsReserving(false);
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  }

  const isGenerating = isPending && regenIdx === null;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>

      {/* ── COL 1: 영상 선택 ── */}
      <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)" }}>
        <div style={COL_HEADER}>
          <ColLabel num="01" label="영상 선택" />
          <p style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 4 }}>
            채널 적합 영상 Top {candidates.length}
          </p>
        </div>

        <div style={COL_BODY}>
          {candidates.length === 0 ? (
            <EmptyState icon="🎬" text={"채널 적합 영상이 없습니다\nYouTube 큐에서 영상을 추가해주세요"} />
          ) : (
            candidates.map(c => {
              const isSel = c.id === selectedId;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectVideo(c.id)}
                  style={{
                    background: isSel ? "var(--accent-dim)" : "var(--surface2)",
                    border: `1px solid ${isSel ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 8,
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "border-color .15s",
                  }}
                >
                  <div style={{ width: "100%", paddingTop: "56.25%", position: "relative", overflow: "hidden" }}>
                    {c.thumbnail_url ? (
                      <img src={c.thumbnail_url} alt={c.title}
                        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "var(--surface3)" }} />
                    )}
                  </div>
                  <div style={{ padding: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4, marginBottom: 5, color: "var(--text)" }}>
                      {c.title}
                    </p>
                    <div style={{ display: "flex", gap: 5, fontSize: 10, color: "var(--text-muted)", flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ color: starColor(c.stars) }}>
                        {toStars(c.stars)} {c.stars.toFixed(1)}
                      </span>
                      <span>👁 {formatViews(c.views)}</span>
                      <span>❤️ {Number(c.like_rate).toFixed(2)}%</span>
                      <span>⏱ {formatDuration(c.duration_sec)}</span>
                      <span style={{
                        padding: "1px 6px", borderRadius: 20, fontSize: 9, fontWeight: 700,
                        ...(c.era === "modern"
                          ? { background: "rgba(156,127,224,.3)", color: "var(--purple)" }
                          : { background: "rgba(200,169,110,.25)", color: "var(--accent)" }),
                      }}>
                        {c.era}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={COL_FOOTER}>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedId || candidates.length === 0}
            style={{
              width: "100%", background: "var(--accent)", color: "#1a1400",
              border: "none", borderRadius: 8, padding: "9px 0",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              opacity: isGenerating || !selectedId ? 0.5 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <Sparkles size={13} />
            {isGenerating ? "생성 중..." : "선택한 영상으로 콘텐츠 생성 →"}
          </button>
        </div>
      </div>

      {/* ── COL 2: 생성된 콘텐츠 ── */}
      <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)" }}>
        <div style={COL_HEADER}>
          <ColLabel num="02" label="생성된 콘텐츠" />
          <p style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 4 }}>클릭하면 오른쪽에서 편집</p>
        </div>

        <div style={COL_BODY}>
          {error && (
            <div style={{ background: "rgba(224,92,92,.1)", border: "1px solid rgba(224,92,92,.3)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--red)" }}>
              {error}
            </div>
          )}

          {isGenerating && <><SkeletonCard /><SkeletonCard /></>}

          {!isGenerating && versions.length === 0 && !error && (
            <EmptyState icon="✨" text={"영상을 선택하고\n[콘텐츠 생성] 버튼을 누르세요"} />
          )}

          {versions.map((v, idx) => {
            const isSel = selectedVersionIdx === idx;
            const isRegening = isPending && regenIdx === idx;
            return (
              <div
                key={idx}
                onClick={() => !isRegening && handleSelectVersion(idx)}
                style={{
                  background: isSel ? "var(--accent-dim)" : "var(--surface2)",
                  border: `1px solid ${isSel ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 8, padding: 12, cursor: "pointer",
                  opacity: isRegening ? 0.5 : 1, transition: "border-color .15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{v.name}</p>
                  <button
                    onClick={e => { e.stopPropagation(); handleRegen(idx); }}
                    disabled={isPending}
                    style={{
                      display: "flex", alignItems: "center", gap: 3,
                      background: "var(--surface3)", border: "1px solid var(--border)",
                      borderRadius: 6, padding: "3px 8px", fontSize: 10,
                      color: "var(--text-muted)", cursor: "pointer",
                      opacity: isPending ? 0.4 : 1,
                    }}
                  >
                    <RotateCcw size={9} /> 재생성
                  </button>
                </div>

                <p style={{ fontSize: 10, fontWeight: 600, color: "var(--accent)", marginBottom: 3 }}>썸네일 타이틀</p>
                <p style={{ fontSize: 12, marginBottom: 8, color: "var(--text)" }}>{v.thumbnailTitle}</p>

                <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginBottom: 3 }}>캡션 미리보기</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, maxHeight: "2.8em", overflow: "hidden" }}>
                  {v.caption}
                </p>

                <p style={{ fontSize: 10, color: "var(--accent)", marginTop: 6, opacity: .7, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                  {v.hashtags}
                </p>
              </div>
            );
          })}
        </div>

        {versions.length > 0 && (
          <div style={{ ...COL_FOOTER, textAlign: "center" }}>
            <p style={{ fontSize: 10, color: "var(--text-dim)" }}>
              {selectedVersionIdx !== null ? `v${selectedVersionIdx + 1} 선택됨` : "버전을 선택하세요"}
            </p>
          </div>
        )}
      </div>

      {/* ── COL 3: 업로드 설정 ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={COL_HEADER}>
          <ColLabel num="03" label="업로드 설정" />
        </div>

        <div style={{ ...COL_BODY, gap: 14 }}>
          {!editState ? (
            <EmptyState icon="📋" text={"생성된 콘텐츠를 선택하면\n여기서 편집할 수 있습니다"} />
          ) : (
            <>
              {/* 텍스트 필드들 */}
              {(["thumbnailTitle", "caption", "hashtags"] as const).map(key => {
                const labels: Record<string, string> = {
                  thumbnailTitle: "썸네일 타이틀",
                  caption: "본문 캡션",
                  hashtags: "해시태그",
                };
                const rows = key === "caption" ? 5 : 2;
                return (
                  <div key={key}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px" }}>
                        {labels[key]}
                      </span>
                      <button
                        onClick={() => copy(editState[key], key)}
                        style={{
                          display: "flex", alignItems: "center", gap: 3,
                          background: "var(--surface3)", border: "none", borderRadius: 5,
                          padding: "3px 8px", fontSize: 10, cursor: "pointer",
                          color: copiedField === key ? "var(--green)" : "var(--text-muted)",
                        }}
                      >
                        {copiedField === key ? <Check size={9} /> : <Copy size={9} />} 복사
                      </button>
                    </div>
                    <textarea
                      rows={rows}
                      value={editState[key]}
                      onChange={e => setEditState(prev => prev ? { ...prev, [key]: e.target.value } : null)}
                      style={{
                        background: "var(--surface3)", border: "1px solid var(--border)", borderRadius: 7,
                        color: "var(--text)", fontSize: 12, padding: "10px", width: "100%",
                        resize: "none", fontFamily: "inherit", lineHeight: 1.6, outline: "none",
                      }}
                    />
                    {key === "caption" && (
                      <p style={{ fontSize: 10, color: editState.caption.length > 2000 ? "var(--red)" : "var(--text-dim)", marginTop: 3, textAlign: "right" }}>
                        {editState.caption.length} / 2200
                      </p>
                    )}
                  </div>
                );
              })}

              {/* YouTube 원본 링크 */}
              {selected && (
                <a
                  href={`https://www.youtube.com/watch?v=${selected.video_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 11, color: "var(--accent)", padding: "8px 10px",
                    background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 7,
                  }}
                >
                  <ExternalLink size={11} /> YouTube에서 원본 영상 확인
                </a>
              )}

              {/* 영상 파일 업로드 */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px" }}>
                    릴스 영상 파일
                  </span>
                  {uploadState?.status === "done" && (
                    <button
                      onClick={() => { setUploadState(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      style={{ display: "flex", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "var(--text-dim)" }}
                    >
                      <X size={10} /> 제거
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,.mp4,.mov,.avi,.webm,.m4v"
                  onChange={handleFileInput}
                  style={{ display: "none" }}
                />

                {/* 업로드 완료 상태 */}
                {uploadState?.status === "done" ? (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "rgba(76,175,130,.08)", border: "1px solid rgba(76,175,130,.3)",
                    borderRadius: 8, padding: "10px 12px",
                  }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: "rgba(76,175,130,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Film size={16} style={{ color: "var(--green)" } as React.CSSProperties} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {uploadState.file.name}
                      </p>
                      <p style={{ fontSize: 10, color: "var(--green)", marginTop: 2 }}>
                        업로드 완료 · {formatBytes(uploadState.file.size)}
                      </p>
                    </div>
                    <Check size={14} style={{ color: "var(--green)", flexShrink: 0 } as React.CSSProperties} />
                  </div>
                ) : uploadState?.status === "uploading" ? (
                  /* 업로드 중 */
                  <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <Film size={14} style={{ color: "var(--text-muted)", flexShrink: 0 } as React.CSSProperties} />
                      <p style={{ fontSize: 12, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {uploadState.file.name}
                      </p>
                    </div>
                    <div style={{ height: 3, background: "var(--surface3)", borderRadius: 2, overflow: "hidden" }}>
                      <div className="upload-progress-bar" style={{ height: "100%", background: "var(--accent)", borderRadius: 2 }} />
                    </div>
                    <p style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 6 }}>업로드 중...</p>
                  </div>
                ) : uploadState?.status === "error" ? (
                  /* 에러 상태 */
                  <div>
                    <div style={{ background: "rgba(224,92,92,.08)", border: "1px solid rgba(224,92,92,.3)", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                      <p style={{ fontSize: 12, color: "var(--red)" }}>{uploadState.error}</p>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        width: "100%", background: "var(--surface2)", border: "1px dashed var(--border)",
                        borderRadius: 8, padding: "9px 0", fontSize: 12, color: "var(--text-muted)", cursor: "pointer",
                      }}
                    >
                      다시 시도
                    </button>
                  </div>
                ) : (
                  /* 드롭존 */
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDragOver ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: 10,
                      padding: "24px 16px",
                      textAlign: "center",
                      cursor: "pointer",
                      background: isDragOver ? "var(--accent-dim)" : "transparent",
                      transition: "border-color .15s, background .15s",
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: isDragOver ? "rgba(200,169,110,.2)" : "var(--surface2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto 10px",
                      transition: "background .15s",
                    }}>
                      <Upload size={18} style={{ color: isDragOver ? "var(--accent)" : "var(--text-muted)" } as React.CSSProperties} />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: isDragOver ? "var(--accent)" : "var(--text)", marginBottom: 4 }}>
                      {isDragOver ? "여기에 놓으세요" : "영상 파일을 드래그하거나 클릭"}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--text-dim)" }}>
                      mp4, mov, avi, webm · 최대 500MB
                    </p>
                    <p style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 4, opacity: 0.7 }}>
                      선택 사항 — 없어도 예약 가능
                    </p>
                  </div>
                )}
              </div>

              {/* 업로드 예약 일시 */}
              <div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>
                  업로드 예약 일시
                </p>
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
                disabled={uploadState?.status === "uploading"}
                style={{
                  width: "100%", background: "var(--accent)", color: "#1a1400",
                  border: "none", borderRadius: 10, padding: "13px 0",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  opacity: uploadState?.status === "uploading" ? 0.5 : 1,
                }}
              >
                업로드 예약
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 예약 확인 모달 ── */}
      {showModal && editState && selected && (
        <div
          onClick={() => setShowModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, maxWidth: 360, width: "100%" }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "var(--text)" }}>업로드를 예약할까요?</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 20 }}>
              업로드 대기 내역에서 언제든지 수정하거나 취소할 수 있습니다.
            </p>
            <div style={{ background: "var(--surface2)", borderRadius: 8, padding: 12, marginBottom: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "콘텐츠 유형", val: "🎬 릴스" },
                { label: "영상", val: selected.title },
                { label: "예약 일시", val: `${editState.date} ${editState.time}` },
                { label: "해시태그", val: editState.hashtags.trim().split(/\s+/).length + "개" },
                { label: "영상 파일", val: uploadState?.status === "done" ? `✓ ${uploadState.file.name}` : "첨부 없음" },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0" }}>
                  <span style={{ color: "var(--text-muted)" }}>{row.label}</span>
                  <span style={{ fontWeight: 600, color: "var(--text)", maxWidth: 180, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 100,
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
          padding: "12px 16px", display: "flex", gap: 10, alignItems: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,.4)", maxWidth: 320,
        }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(76,175,130,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>
            ✅
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, color: "var(--text)" }}>업로드가 예약됐습니다</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {editState?.date} {editState?.time}에 업로드됩니다
            </p>
          </div>
          <button onClick={() => setShowToast(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
            <X size={14} />
          </button>
        </div>
      )}

      <style>{`
        .skeleton-shimmer {
          background: linear-gradient(90deg, var(--surface2) 25%, var(--surface3) 50%, var(--surface2) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .upload-progress-bar {
          animation: upload-fill 1.8s ease-in-out infinite;
        }
        @keyframes upload-fill {
          0%   { width: 15%; }
          50%  { width: 80%; }
          100% { width: 95%; }
        }
      `}</style>
    </div>
  );
}
