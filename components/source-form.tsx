"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, AlertCircle, X } from "lucide-react";
import {
  createSource,
  updateSource,
  validateYouTubeHandle,
  validateYouTubePlaylist,
  type SourceFormData,
} from "@/app/sources/actions";
import type { Database } from "@/lib/database.types";

type Source = Database["public"]["Tables"]["sources"]["Row"];

interface Props {
  source?: Source;       // 수정 시 전달
  onClose: () => void;
}

const ERA_OPTIONS  = [{ value: "classic", label: "Classic (올드팝/발라드)" }, { value: "modern", label: "Modern (2015년~)" }] as const;
const TYPE_OPTIONS = [{ value: "handle",   label: "@채널 핸들" }, { value: "playlist", label: "재생목록 ID" }] as const;

export function SourceForm({ source, onClose }: Props) {
  const isEdit = !!source;

  const [name,        setName]        = useState(source?.name         ?? "");
  const [type,        setType]        = useState<"handle"|"playlist">(source?.type ?? "handle");
  const [sourceValue, setSourceValue] = useState(source?.source_value ?? "");
  const [era,         setEra]         = useState<"classic"|"modern">(source?.era ?? "classic");
  const [note,        setNote]        = useState(source?.note         ?? "");

  const [validating,  setValidating]  = useState(false);
  const [validation,  setValidation]  = useState<{ ok: boolean; label?: string; error?: string } | null>(null);
  const [isPending,   startTransition] = useTransition();
  const [formError,   setFormError]   = useState<string | null>(null);

  async function handleValidate() {
    if (!sourceValue.trim()) return;
    setValidating(true);
    setValidation(null);
    try {
      if (type === "handle") {
        const r = await validateYouTubeHandle(sourceValue.trim());
        setValidation({ ok: r.ok, label: r.channelTitle, error: r.error });
      } else {
        const r = await validateYouTubePlaylist(sourceValue.trim());
        setValidation({ ok: r.ok, label: r.playlistTitle, error: r.error });
      }
    } finally {
      setValidating(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim())        return setFormError("이름을 입력하세요");
    if (!sourceValue.trim()) return setFormError("채널/재생목록 값을 입력하세요");

    const data: SourceFormData = { name, type, source_value: sourceValue, era, note };
    startTransition(async () => {
      try {
        if (isEdit) {
          await updateSource(source.id, data);
        } else {
          await createSource(data);
        }
        onClose();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "오류가 발생했습니다");
      }
    });
  }

  const inputCls = "w-full px-3 py-[7px] rounded-[8px] text-[13px] outline-none";
  const inputStyle = { background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" };
  const labelCls  = "text-[11px] font-semibold mb-[5px] block";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.7)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[480px] rounded-[12px] p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-bold" style={{ color: "var(--text)" }}>
            {isEdit ? "소스 수정" : "소스 추가"}
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 이름 */}
          <div>
            <label className={labelCls} style={{ color: "var(--text-muted)" }}>소스 이름</label>
            <input
              className={inputCls}
              style={inputStyle}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="예: Classic Pop Hits"
            />
          </div>

          {/* 타입 */}
          <div>
            <label className={labelCls} style={{ color: "var(--text-muted)" }}>타입</label>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { setType(o.value); setValidation(null); }}
                  className="flex-1 py-[7px] rounded-[8px] text-[12px] font-semibold transition-colors"
                  style={
                    type === o.value
                      ? { background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent)" }
                      : { background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }
                  }
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* 채널/재생목록 값 + 검증 */}
          <div>
            <label className={labelCls} style={{ color: "var(--text-muted)" }}>
              {type === "handle" ? "YouTube 채널 핸들 (@포함 또는 제외)" : "YouTube 재생목록 ID"}
            </label>
            <div className="flex gap-2">
              <input
                className={inputCls}
                style={{ ...inputStyle, flex: 1 }}
                value={sourceValue}
                onChange={e => { setSourceValue(e.target.value); setValidation(null); }}
                placeholder={type === "handle" ? "@channelname" : "PLxxxxxxxx"}
              />
              <button
                type="button"
                onClick={handleValidate}
                disabled={validating || !sourceValue.trim()}
                className="px-3 py-[7px] rounded-[8px] text-[12px] font-semibold flex items-center gap-1 flex-shrink-0"
                style={{ background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
              >
                {validating ? <Loader2 size={12} className="animate-spin" /> : "검증"}
              </button>
            </div>
            {/* 검증 결과 */}
            {validation && (
              <div
                className="mt-[6px] flex items-center gap-2 text-[12px] px-3 py-[6px] rounded-[7px]"
                style={
                  validation.ok
                    ? { background: "rgba(76,175,130,.15)", color: "var(--green)" }
                    : { background: "rgba(230,85,85,.15)",  color: "var(--red)" }
                }
              >
                {validation.ok ? <Check size={12} /> : <AlertCircle size={12} />}
                {validation.ok ? validation.label : validation.error}
              </div>
            )}
          </div>

          {/* Era */}
          <div>
            <label className={labelCls} style={{ color: "var(--text-muted)" }}>시대 구분</label>
            <div className="flex gap-2">
              {ERA_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setEra(o.value)}
                  className="flex-1 py-[7px] rounded-[8px] text-[12px] font-semibold transition-colors"
                  style={
                    era === o.value
                      ? { background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent)" }
                      : { background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }
                  }
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className={labelCls} style={{ color: "var(--text-muted)" }}>메모 (선택)</label>
            <input
              className={inputCls}
              style={inputStyle}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="이 소스에 대한 간단한 메모"
            />
          </div>

          {/* 오류 */}
          {formError && (
            <div className="flex items-center gap-2 text-[12px] px-3 py-[6px] rounded-[7px]"
              style={{ background: "rgba(230,85,85,.15)", color: "var(--red)" }}>
              <AlertCircle size={12} />
              {formError}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-[9px] rounded-[8px] text-[13px] font-semibold"
              style={{ background: "var(--surface2)", color: "var(--text-muted)" }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-[9px] rounded-[8px] text-[13px] font-semibold flex items-center justify-center gap-2"
              style={{ background: "var(--accent)", color: "#1a1400" }}
            >
              {isPending && <Loader2 size={13} className="animate-spin" />}
              {isEdit ? "수정 저장" : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
