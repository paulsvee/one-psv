"use client";

import React, { useMemo, useRef } from "react";

type FolderOption = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  currentColor?: string | null;
  palette: string[];
  hasImage?: boolean;
  onPickColor: (color: string | null) => void;
  onPickImage: (dataUrl: string) => void;
  onClearImage?: () => void;
  onOpenNote?: () => void;   // PSV One 확장: 노트 열기
  onDelete?: () => void;     // PSV One 확장: 메모 삭제
  onClose: () => void;
  // 카테고리(폴더) 관련
  folders?: FolderOption[];
  currentFolderId?: string | null;
  onMoveFolder?: (folderId: string | null) => void;
};

const fileToDataUrl = (f: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(f);
  });

export default function ColorImageOverlay(props: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const palette = useMemo(() => {
    const uniq = Array.from(new Set(props.palette.filter(Boolean)));
    return uniq;
  }, [props.palette]);

  const stopAll = (e: any) => {
    // IMPORTANT: do NOT call preventDefault here.
    // preventDefault on pointerdown can suppress the subsequent click,
    // which breaks the hidden file input trigger.
    try { e.stopPropagation?.(); } catch {}
  };

  if (!props.open) return null;

  const onDimClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (e.target === e.currentTarget) props.onClose();
  };

  const onDimPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (e.target === e.currentTarget) props.onClose();
  };

  const pickColor = (c: string | null) => {
    props.onPickColor(c);
    props.onClose();
  };

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const input = e.currentTarget;
    const f = input.files?.[0];
    if (!f) return;
    const dataUrl = await fileToDataUrl(f);
    try { input.value = ""; } catch {}
    props.onPickImage(dataUrl);
    props.onClose();
  };

  return (
    <div
      onPointerDown={onDimPointerDown}
      onMouseDown={onDimClick}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.42)",
        backdropFilter: "blur(1px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9000,
        padding: 18,
      }}
    >
      <div
        onPointerDownCapture={(e) => stopAll(e)}
        onMouseDown={(e) => stopAll(e)}
        onClick={(e) => stopAll(e)}
        style={{
          width: "min(560px, 100%)",
          borderRadius: 18,
          background: "rgba(15,16,18,0.92)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
          padding: 14,
          pointerEvents: "auto",
        }}
      >
        {/* 색상 팔레트 행 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {palette.map((c) => {
            const active = (props.currentColor ?? "").toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                onPointerDownCapture={(e) => stopAll(e)}
                onMouseDown={(e) => stopAll(e)}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  pickColor(c);
                }}
                title={c}
                style={{
                  width: 26, height: 26, borderRadius: 999, background: c,
                  border: active
                    ? "3px solid rgba(255,255,255,0.95)"
                    : "2px solid rgba(255,255,255,0.18)",
                  boxShadow: active ? "0 0 0 3px rgba(255,255,255,0.10)" : "none",
                  cursor: "pointer",
                }}
              />
            );
          })}

          <button
            type="button"
            onPointerDownCapture={(e) => stopAll(e)}
            onMouseDown={(e) => stopAll(e)}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              pickColor(null);
            }}
            style={{
              marginLeft: "auto",
              height: 30, padding: "0 12px", borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.88)",
              cursor: "pointer", fontSize: 12, whiteSpace: "nowrap",
            }}
          >
            색상 사용 안함
          </button>

          <button
            type="button"
            onPointerDownCapture={(e) => stopAll(e)}
            onMouseDown={(e) => stopAll(e)}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              props.onClose();
            }}
            aria-label="close"
            style={{
              height: 30, width: 30, borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.88)",
              cursor: "pointer", display: "inline-flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 16, lineHeight: 1,
            }}
          >×</button>
        </div>

        {/* IMG + 노트 + Del memo 행 */}
        <div style={{ height: 10 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label
            onPointerDownCapture={(e) => stopAll(e)}
            onMouseDown={(e) => stopAll(e)}
            onClick={(e) => stopAll(e)}
            style={{
              height: 38, padding: "0 14px", borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "rgba(255,255,255,0.92)",
              cursor: "pointer", fontWeight: 700,
              display: "inline-flex", alignItems: "center",
              userSelect: "none",
            }}
          >
            IMG
            <input
              ref={inputRef} type="file" accept="image/*"
              onChange={onFileChange} style={{ display: "none" }}
            />
          </label>

          {props.hasImage && props.onClearImage && (
            <button
              type="button"
              onPointerDownCapture={(e) => stopAll(e)}
              onMouseDown={(e) => stopAll(e)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                props.onClearImage!();
                props.onClose();
              }}
              style={{
                height: 38, padding: "0 14px", borderRadius: 999,
                background: "rgba(255,80,80,0.12)",
                border: "1px solid rgba(255,100,100,0.28)",
                color: "rgba(255,180,180,0.95)",
                cursor: "pointer", fontWeight: 700,
              }}
            >IMG ×</button>
          )}

          {props.onOpenNote && (
            <button
              type="button"
              onPointerDownCapture={(e) => stopAll(e)}
              onMouseDown={(e) => stopAll(e)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                props.onClose();
                props.onOpenNote!();
              }}
              style={{
                marginLeft: "auto",
                height: 38, padding: "0 16px", borderRadius: 999,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "rgba(255,255,255,0.88)",
                cursor: "pointer", fontSize: 13,
                display: "inline-flex", alignItems: "center", gap: 7,
                whiteSpace: "nowrap",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16M4 10h10M4 14h7M4 18h5"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              노트
            </button>
          )}

          {props.onDelete && (
            <button
              type="button"
              onPointerDownCapture={(e) => stopAll(e)}
              onMouseDown={(e) => stopAll(e)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                props.onClose();
                props.onDelete!();
              }}
              style={{
                marginLeft: props.onOpenNote ? 0 : "auto",
                height: 38, padding: "0 16px", borderRadius: 999,
                background: "rgba(255,60,60,0.10)",
                border: "1px solid rgba(255,80,80,0.22)",
                color: "rgba(255,160,160,0.90)",
                cursor: "pointer", fontSize: 13,
                display: "inline-flex", alignItems: "center", gap: 7,
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(255,60,60,0.20)";
                e.currentTarget.style.borderColor = "rgba(255,80,80,0.45)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(255,60,60,0.10)";
                e.currentTarget.style.borderColor = "rgba(255,80,80,0.22)";
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Del memo
            </button>
          )}
        </div>

        {/* 폴더 선택 행 — PSV One 확장 */}
        {props.folders && props.onMoveFolder && (
          <>
            <div style={{ height: 10 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
                <select
                  value={props.currentFolderId ?? ""}
                  onPointerDownCapture={(e) => stopAll(e)}
                  onMouseDown={(e) => stopAll(e)}
                  onChange={(e) => {
                    e.stopPropagation();
                    const val = e.currentTarget.value;
                    props.onMoveFolder!(val === "" ? null : val);
                  }}
                  style={{
                    width: "100%",
                    height: 34, padding: "0 32px 0 14px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    color: "rgba(255,255,255,0.90)",
                    fontSize: 13, fontWeight: 500,
                    cursor: "pointer",
                    appearance: "none",
                    WebkitAppearance: "none",
                    outline: "none",
                  }}
                >
                  <option value="" style={{ background: "#1a1b1e", color: "#ccc" }}>
                    All
                  </option>
                  {props.folders.map((f) => (
                    <option key={f.id} value={f.id} style={{ background: "#1a1b1e", color: "#fff" }}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  style={{
                    position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                    color: "rgba(255,255,255,0.45)",
                  }}
                >
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
