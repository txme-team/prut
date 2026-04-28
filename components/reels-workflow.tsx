"use client";

import { useState, useTransition } from "react";
import { ExternalLink, RotateCcw, Sparkles, Copy, Check, X } from "lucide-react";
import { generateReelsContent, type ReelsVersion } from "@/app/reels/actions";

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
}

interface EditState {
  thumbnailTitle: string;
  caption: string;
  hashtags: string;
  date: string;
  time: string;
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

function ColLabel({ num, label, color = "var(--blue)" }: { num: string; label: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: ".5px" }}>{num}</span>
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
  const [selectedId, setSelectedId] = useState<string | null>(candidates[0]?.id ?? null);
  const [versions, setVersions] = useState<ReelsVersion[]>([]);
  const [selectedVersionIdx, setSelectedVersionIdx] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [isPending, startTransition] = useTransition();
  const [regenIdx, setRegenIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  function handleReserve() {
    setShowModal(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
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
            예약 확정 영상 {candidates.length}개
          </p>
        </div>

        <div style={COL_BODY}>
          {candidates.length === 0 ? (
            <EmptyState icon="🎬" text={"YouTube 큐에서 영상을\n예약 확정하면 여기에 표시됩니다"} />
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
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt={c.title}
                      style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ width: "100%", aspectRatio: "16/9", background: "var(--surface3)" }} />
                  )}
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
                style={{ width: "100%", background: "var(--accent)", color: "#1a1400", border: "none", borderRadius: 10, padding: "13px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
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
                style={{ flex: 1, background: "var(--accent)", border: "none", borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 700, color: "#1a1400", cursor: "pointer" }}
              >
                예약 확정
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
      `}</style>
    </div>
  );
}
