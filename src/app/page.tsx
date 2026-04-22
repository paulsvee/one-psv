"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import ColorImageOverlay from "../components/ColorImageOverlay";
import { DotsIcon } from "../components/icons";

// ── Types ─────────────────────────────────────────────────────
type Folder = { id: string; name: string; createdAt: number; image?: string | null };
type Memo = {
  id: string;
  folderId: string | null;
  date: string;
  text: string;
  createdAt: number;
  color?: string | null;
  image?: string | null;
  note?: string | null;
};
type AppState = {
  version: 1;
  appTitle: string;
  folders: Folder[];
  memos: Memo[];
  activeFolder: string;
};

// dropTarget: 어느 날짜의 어느 index 앞에 삽입할지
// insertIndex = 0 → 맨 앞, insertIndex = length → 맨 뒤
type DropTarget = { date: string; insertIndex: number } | null;

// ── Storage ───────────────────────────────────────────────────
const STORAGE_KEY = "one_psv_v1";
function loadLegacyState(): AppState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const d = JSON.parse(raw);
    if (d?.version !== 1) return seed();
    if (!d.appTitle) d.appTitle = "One";
    return d as AppState;
  } catch { return seed(); }
}
function seed(): AppState {
  return { version: 1, appTitle: "One", folders: [], memos: [], activeFolder: "all" };
}

// ── Constants ─────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const PALETTE = [
  "#FFEA00", "#00E5FF", "#FF3D00", "#00E676", "#B388FF",
  "#FF80AB", "#FFD180", "#69F0AE", "#82B1FF", "#FFFFFF",
];
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function monthKey(d: string) { return d.slice(0, 7); }
function dayNum(d: string)   { return parseInt(d.slice(8, 10), 10); }
function fmtMonth(ym: string) {
  const [y, m] = ym.split("-");
  return `${y}년 ${parseInt(m, 10)}월`;
}

// ── NotePanel ─────────────────────────────────────────────────
function NotePanel({ memo, onSave, onClose }: {
  memo: Memo; onSave: (id: string, note: string) => void; onClose: () => void;
}) {
  const [val, setVal] = useState(memo.note ?? "");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const commitRef = useRef<() => void>(() => {});
  commitRef.current = () => onSave(memo.id, val);
  useEffect(() => { taRef.current?.focus(); }, []);
  useEffect(() => () => { commitRef.current(); }, []);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "var(--surface)" }}>
      <div style={{ height: 39, minHeight: 39, display: "flex", alignItems: "center", padding: "0 14px 0 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", gap: 8 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: "rgba(255,255,255,0.22)" }}>
          <path d="M4 6h16M4 10h10M4 14h7M4 18h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontFamily: "'JetBrains Mono',monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {memo.text}
        </span>
        <button onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.22)", fontSize: 18, lineHeight: 1, padding: "2px 4px" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.22)")}
        >×</button>
      </div>
      <textarea ref={taRef} value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => onSave(memo.id, val)}
        placeholder="노트를 입력하세요…"
        style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", padding: "16px 18px", color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 1.8, fontFamily: "'Noto Sans KR',sans-serif" }}
      />
    </div>
  );
}

// ── Pill ──────────────────────────────────────────────────────
function Pill({
  memo, openMenu, isDragging, isFocused,
  onUpdate, onOpenMenu, onCloseMenu,
  onPickColor, onPickImage, onClearImage, onOpenNote, onDelete, onMoveFolder,
  onDragStart, onDragEnd, folders,
}: {
  memo: Memo; openMenu: boolean; isDragging: boolean; isFocused?: boolean;
  onUpdate: (id: string, text: string) => void;
  onOpenMenu: (id: string) => void; onCloseMenu: () => void;
  onPickColor: (id: string, color: string | null) => void;
  onPickImage: (id: string, dataUrl: string) => void;
  onClearImage: (id: string) => void;
  onOpenNote: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveFolder: (id: string, folderId: string | null) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  folders: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const spanRef = useRef<HTMLSpanElement>(null);
  const origRef = useRef(memo.text);

  const startEdit = (e: React.MouseEvent) => {
    if (openMenu) return;
    e.stopPropagation();
    origRef.current = memo.text;
    setEditing(true);
    setTimeout(() => {
      const el = spanRef.current;
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }, 0);
  };

  const finish = () => {
    setEditing(false);
    const newText = spanRef.current?.textContent?.trim() ?? "";
    if (newText && newText !== origRef.current) onUpdate(memo.id, newText);
    else if (spanRef.current) spanRef.current.textContent = origRef.current;
  };

  const hasImage = !!memo.image;

  const hasNote = !!(memo.note && memo.note.trim());
  const color = memo.color ?? null;
  const borderColor = editing ? "var(--point)" : color ? `${color}99` : "var(--border2)";
  const bgColor = hasImage
    ? "transparent"
    : color
      ? `linear-gradient(var(--pill-overlay), var(--pill-overlay)), ${color}`
      : editing ? "rgba(184,255,106,0.07)" : "var(--pill-bg)";

  return (
    <div
      draggable={!editing}
      onDragStart={e => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", memo.id);
        const ghost = document.createElement("div");
        ghost.style.cssText = "position:fixed;top:-9999px;opacity:0;";
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 0, 0);
        setTimeout(() => document.body.removeChild(ghost), 0);
        onDragStart(memo.id);
      }}
      onDragEnd={onDragEnd}
      onDoubleClick={startEdit}
      onMouseEnter={e => {
        if (editing || openMenu) return;
        e.currentTarget.style.borderColor = "var(--border2)";
        const btn = e.currentTarget.querySelector<HTMLElement>(".pill-dots");
        if (btn) btn.style.opacity = "1";
      }}
      onMouseLeave={e => {
        if (editing || openMenu) return;
        e.currentTarget.style.borderColor = borderColor;
        const btn = e.currentTarget.querySelector<HTMLElement>(".pill-dots");
        if (btn) btn.style.opacity = "0";
      }}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: hasImage ? "0" : "4px 11px",
        borderRadius: hasImage ? 12 : 999,
        border: `1px solid ${borderColor}`,
        background: bgColor,
        // 이미지 배경
        ...(hasImage ? {
          backgroundImage: `url(${memo.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          minWidth: 120,
          minHeight: 52,
          overflow: "hidden",
        } : {}),
        fontSize: 13, color: (hasImage || color) ? "var(--pill-text)" : "var(--pill-text)",
        whiteSpace: "nowrap", flexShrink: 0,
        transition: "border-color 0.15s, opacity 0.15s",
        userSelect: editing ? "text" : "none",
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.3 : 1,
        position: "relative",
      }}
    >
      {/* 이미지 배경일 때 어두운 오버레이 + 텍스트 */}
      {hasImage && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: 11,
          background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center",
          padding: "0 10px", gap: 5,
        }}>
          {hasNote && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", flexShrink: 0, display: "inline-block", opacity: 0.85 }} />}
          <span ref={spanRef} contentEditable={editing} suppressContentEditableWarning
            onBlur={finish}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); spanRef.current?.blur(); }
              if (e.key === "Escape") { if (spanRef.current) spanRef.current.textContent = origRef.current; setEditing(false); }
              e.stopPropagation();
            }}
            style={{ outline: "none", color: "rgba(255,255,255,0.92)", fontSize: 13 }}
          >{memo.text}</span>
          <button className="pill-dots"
            onClick={e => { e.stopPropagation(); onOpenMenu(memo.id); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.55)", padding: "0 1px", lineHeight: 1, opacity: openMenu ? 1 : 0, transition: "opacity 0.15s", flexShrink: 0, display: "flex", alignItems: "center" }}
          ><DotsIcon size={14} /></button>
        </div>
      )}

      {/* 일반 pill (이미지 없을 때) */}
      {!hasImage && (<>
        {hasNote && (
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: color ?? "var(--point)", flexShrink: 0, display: "inline-block" }} />
        )}
        <span ref={spanRef} contentEditable={editing} suppressContentEditableWarning
          onBlur={finish}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); spanRef.current?.blur(); }
            if (e.key === "Escape") { if (spanRef.current) spanRef.current.textContent = origRef.current; setEditing(false); }
            e.stopPropagation();
          }}
          style={{ outline: "none" }}
        >{memo.text}</span>
        <button className="pill-dots"
          onClick={e => { e.stopPropagation(); onOpenMenu(memo.id); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: "0 1px", lineHeight: 1, opacity: openMenu ? 1 : 0, transition: "opacity 0.15s, color 0.15s", flexShrink: 0, display: "flex", alignItems: "center" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
        ><DotsIcon size={14} /></button>
      </>)}
      <ColorImageOverlay
        open={openMenu} currentColor={color} palette={PALETTE} hasImage={!!memo.image}
        onPickColor={c => onPickColor(memo.id, c)}
        onPickImage={async (dataUrl) => onPickImage(memo.id, dataUrl)}
        onClearImage={() => onClearImage(memo.id)}
        onOpenNote={() => onOpenNote(memo.id)}
        onDelete={() => onDelete(memo.id)}
        onClose={onCloseMenu}
        folders={folders}
        currentFolderId={memo.folderId}
        onMoveFolder={(fid) => onMoveFolder(memo.id, fid)}
      />
    </div>
  );
}

// ── PillRow — 같은 날 같은 폴더 한 줄 ───────────────────────
// folderId 기준으로 그룹핑, 그룹 간 줄바꿈
function PillRow({
  dateStr, memos, openMenuId, draggingId, dropTarget,
  folderRowIndex, focusedDate,
  onUpdate, onOpenMenu, onCloseMenu,
  onPickColor, onPickImage, onClearImage, onOpenNote, onDelete, onClickEmpty,
  onMoveFolder, folders,
  onDragStart, onDragEnd, onDragOverSlot, onDropSlot,
}: {
  dateStr: string; memos: Memo[]; openMenuId: string | null;
  draggingId: string | null; dropTarget: DropTarget;
  folderRowIndex: number; focusedDate?: string | null;
  onUpdate: (id: string, text: string) => void;
  onOpenMenu: (id: string) => void; onCloseMenu: () => void;
  onPickColor: (id: string, color: string | null) => void;
  onPickImage: (id: string, dataUrl: string) => void;
  onClearImage: (id: string) => void;
  onOpenNote: (id: string) => void;
  onDelete: (id: string) => void;
  onClickEmpty: (d: string) => void;
  onMoveFolder: (id: string, folderId: string | null) => void;
  folders: { id: string; name: string }[];
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOverSlot: (date: string, insertIndex: number) => void;
  onDropSlot: (date: string, insertIndex: number) => void;
}) {
  const sorted = [...memos].sort((a, b) => a.createdAt - b.createdAt);

  const isTarget = (idx: number) =>
    !!draggingId && dropTarget?.date === dateStr && dropTarget?.insertIndex === idx;

  return (
    <div
      className="pill-row"
      style={{
        flex: 1, display: "flex", flexWrap: "nowrap", alignItems: "flex-start",
        overflowX: "auto", padding: "0",
        scrollbarWidth: "none",
        msOverflowStyle: "none" as any,
        WebkitOverflowScrolling: "touch" as any,
        marginTop: folderRowIndex > 0 ? 10 : 0,
      } as React.CSSProperties}
      onClick={e => { if (e.target === e.currentTarget) onClickEmpty(dateStr); }}
      onDragOver={e => { e.preventDefault(); onDragOverSlot(dateStr, sorted.length); }}
      onDrop={e => { e.preventDefault(); onDropSlot(dateStr, sorted.length); }}
    >
      {sorted.map((m, i) => (
        <React.Fragment key={m.id}>
          {/* 슬롯: index i 앞에 삽입 */}
          <div
            style={{
              display: "inline-flex", alignItems: "center",
              width: isTarget(i) ? 14 : 7,
              minWidth: isTarget(i) ? 14 : 7,
              height: 24,
              flexShrink: 0,
              position: "relative",
              transition: "width 0.08s",
            }}
            onDragOver={e => { e.stopPropagation(); e.preventDefault(); onDragOverSlot(dateStr, i); }}
            onDrop={e => { e.stopPropagation(); e.preventDefault(); onDropSlot(dateStr, i); }}
          >
            {isTarget(i) && (
              <div style={{
                position: "absolute", top: 0, bottom: 0, left: "50%",
                transform: "translateX(-50%)",
                width: 2, borderRadius: 2,
                background: "var(--point)",
                boxShadow: "0 0 8px var(--point)",
              }} />
            )}
          </div>

          <Pill
            memo={m} openMenu={openMenuId === m.id} isDragging={draggingId === m.id}
            onUpdate={onUpdate} onOpenMenu={onOpenMenu} onCloseMenu={onCloseMenu}
            onPickColor={onPickColor} onPickImage={onPickImage} onClearImage={onClearImage}
            onOpenNote={onOpenNote} onDelete={onDelete} onMoveFolder={onMoveFolder}
            folders={folders}
            onDragStart={onDragStart} onDragEnd={onDragEnd}
          />

          {/* 마지막 pill 뒤 슬롯 */}
          {i === sorted.length - 1 && (
            <div
              style={{
                display: "inline-flex", alignItems: "center",
                width: isTarget(sorted.length) ? 14 : 4,
                minWidth: isTarget(sorted.length) ? 14 : 4,
                height: 24,
                flexShrink: 0,
                position: "relative",
                transition: "width 0.08s",
              }}
              onDragOver={e => { e.stopPropagation(); e.preventDefault(); onDragOverSlot(dateStr, sorted.length); }}
              onDrop={e => { e.stopPropagation(); e.preventDefault(); onDropSlot(dateStr, sorted.length); }}
            >
              {isTarget(sorted.length) && (
        <div style={{
        position: "absolute", top: 0, bottom: 0, left: "50%",
        transform: "translateX(-50%)",
        width: 2, borderRadius: 2,
        background: "var(--point)",
        boxShadow: "0 0 8px var(--point)",
      }} />
              )}
            </div>
          )}
        </React.Fragment>
      ))}

      {memos.length === 0 && (
        <span onClick={() => onClickEmpty(dateStr)}
          style={{ fontSize: 12, color: "var(--text3)", paddingTop: 6, cursor: "text", userSelect: "none", paddingLeft: 4 }}
        >—</span>
      )}
    </div>
  );
}

// ── DayRow — 날짜 1행, 폴더별 PillRow 들 ────────────────────
function DayRow({
  dateStr, memos, openMenuId, draggingId, dropTarget,
  focusedDate,
  onUpdate, onOpenMenu, onCloseMenu,
  onPickColor, onPickImage, onClearImage, onOpenNote, onDelete, onClickEmpty,
  onMoveFolder, folders,
  onDragStart, onDragEnd, onDragOverSlot, onDropSlot,
}: {
  dateStr: string; memos: Memo[]; openMenuId: string | null;
  draggingId: string | null; dropTarget: DropTarget;
  focusedDate?: string | null;
  onUpdate: (id: string, text: string) => void;
  onOpenMenu: (id: string) => void; onCloseMenu: () => void;
  onPickColor: (id: string, color: string | null) => void;
  onPickImage: (id: string, dataUrl: string) => void;
  onClearImage: (id: string) => void;
  onOpenNote: (id: string) => void;
  onDelete: (id: string) => void;
  onClickEmpty: (d: string) => void;
  onMoveFolder: (id: string, folderId: string | null) => void;
  folders: { id: string; name: string }[];
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOverSlot: (date: string, insertIndex: number) => void;
  onDropSlot: (date: string, insertIndex: number) => void;
}) {
  const today = dateStr === todayStr();

  // folderId 순서 유지하면서 그룹핑 (첫 등장 순)
  const folderOrder: (string | null)[] = [];
  memos.sort((a, b) => a.createdAt - b.createdAt).forEach(m => {
    if (!folderOrder.includes(m.folderId)) folderOrder.push(m.folderId);
  });
  const groups = folderOrder.map(fid => ({
    folderId: fid,
    memos: memos.filter(m => m.folderId === fid).sort((a, b) => a.createdAt - b.createdAt),
  }));

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      background: focusedDate === dateStr ? "var(--today-outer)" : "transparent",
      borderRadius: 0,
      margin: focusedDate === dateStr ? "-14px 0" : "0",
      padding: focusedDate === dateStr ? "14px 0" : "0",
      transition: "background 0.2s",
    }}>
      {/* 날짜 */}
      <div style={{
        fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
        color: (today || focusedDate === dateStr) ? "var(--point)" : "var(--text3)",
        fontWeight: (today || focusedDate === dateStr) ? 500 : 400,
        minWidth: 28, paddingTop: 2, flexShrink: 0, textAlign: "right",
      }}>
        {String(dayNum(dateStr)).padStart(2, "0")}
      </div>

      {/* 폴더별 PillRow */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {groups.length === 0 ? (
          <PillRow
            dateStr={dateStr} memos={[]} openMenuId={openMenuId}
            draggingId={draggingId} dropTarget={dropTarget}
            folderRowIndex={0} focusedDate={focusedDate}
            onUpdate={onUpdate} onOpenMenu={onOpenMenu} onCloseMenu={onCloseMenu}
            onPickColor={onPickColor} onPickImage={onPickImage} onClearImage={onClearImage}
            onOpenNote={onOpenNote} onDelete={onDelete} onClickEmpty={onClickEmpty}
            onMoveFolder={onMoveFolder} folders={folders}
            onDragStart={onDragStart} onDragEnd={onDragEnd}
            onDragOverSlot={onDragOverSlot} onDropSlot={onDropSlot}
          />
        ) : groups.map((g, gi) => (
          <PillRow
            key={g.folderId ?? "__null__"}
            dateStr={dateStr} memos={g.memos} openMenuId={openMenuId}
            draggingId={draggingId} dropTarget={dropTarget}
            folderRowIndex={gi} focusedDate={focusedDate}
            onUpdate={onUpdate} onOpenMenu={onOpenMenu} onCloseMenu={onCloseMenu}
            onPickColor={onPickColor} onPickImage={onPickImage} onClearImage={onClearImage}
            onOpenNote={onOpenNote} onDelete={onDelete} onClickEmpty={onClickEmpty}
            onMoveFolder={onMoveFolder} folders={folders}
            onDragStart={onDragStart} onDragEnd={onDragEnd}
            onDragOverSlot={onDragOverSlot} onDropSlot={onDropSlot}
          />
        ))}
      </div>
    </div>
  );
}

// ── MonthPanel ────────────────────────────────────────────────
function MonthPanel({
  mk, byDay, openMenuId, draggingId, dropTarget,
  focusedDate,
  onUpdate, onOpenMenu, onCloseMenu,
  onPickColor, onPickImage, onClearImage, onOpenNote, onDelete, onClickEmpty,
  onMoveFolder, folders,
  onDragStart, onDragEnd, onDragOverSlot, onDropSlot,
}: {
  mk: string; byDay: Record<string, Memo[]>; openMenuId: string | null;
  draggingId: string | null; dropTarget: DropTarget;
  focusedDate?: string | null;
  onUpdate: (id: string, text: string) => void;
  onOpenMenu: (id: string) => void; onCloseMenu: () => void;
  onPickColor: (id: string, color: string | null) => void;
  onPickImage: (id: string, dataUrl: string) => void;
  onClearImage: (id: string) => void;
  onOpenNote: (id: string) => void;
  onDelete: (id: string) => void;
  onClickEmpty: (d: string) => void;
  onMoveFolder: (id: string, folderId: string | null) => void;
  folders: { id: string; name: string }[];
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOverSlot: (date: string, insertIndex: number) => void;
  onDropSlot: (date: string, insertIndex: number) => void;
}) {
  const days = Object.keys(byDay).sort().reverse();
  const total = days.reduce((s, d) => s + byDay[d].length, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }} data-month={mk}>
      {/* 월 헤더 — 오른쪽 패딩 유지 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, paddingRight: 20 }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--text3)", letterSpacing: "0.07em" }}>
          {fmtMonth(mk)}
        </span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "var(--text3)" }}>{total}</span>
      </div>

      {/* 날짜별 행 — 날짜 사이 구분선 포함 */}
      {days.map((d, di) => (
        <React.Fragment key={d}>
          {di > 0 && (
            <div style={{ height: 0, borderTop: "1px dashed var(--divider)", margin: "14px 0" }} />
          )}
          <DayRow
            dateStr={d} memos={byDay[d]} openMenuId={openMenuId}
            draggingId={draggingId} dropTarget={dropTarget}
            focusedDate={focusedDate}
            onUpdate={onUpdate} onOpenMenu={onOpenMenu} onCloseMenu={onCloseMenu}
            onPickColor={onPickColor} onPickImage={onPickImage} onClearImage={onClearImage}
            onOpenNote={onOpenNote} onDelete={onDelete} onClickEmpty={onClickEmpty}
            onMoveFolder={onMoveFolder} folders={folders}
            onDragStart={onDragStart} onDragEnd={onDragEnd}
            onDragOverSlot={onDragOverSlot} onDropSlot={onDropSlot}
          />
        </React.Fragment>
      ))}
    </div>
  );
}

// ── FolderModal ───────────────────────────────────────────────
function FolderModal({ onConfirm, onCancel }: { onConfirm: (n: string) => void; onCancel: () => void }) {
  const [val, setVal] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
      style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 14, padding: "22px 22px 18px", minWidth: 280, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 14 }}>새 폴더</div>
        <input ref={ref} value={val} onChange={e => setVal(e.target.value)} placeholder="폴더 이름" maxLength={40}
          onKeyDown={e => { if (e.key === "Enter" && val.trim()) onConfirm(val.trim()); if (e.key === "Escape") onCancel(); }}
          style={{ width: "100%", padding: "9px 12px", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none", fontFamily: "'Noto Sans KR',sans-serif" }}
          onFocus={e => (e.target.style.borderColor = "var(--point)")}
          onBlur={e => (e.target.style.borderColor = "var(--border2)")} />
        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid var(--border2)", background: "none", color: "var(--text2)", cursor: "pointer", fontSize: 12, fontFamily: "'Noto Sans KR',sans-serif" }}>취소</button>
          <button onClick={() => val.trim() && onConfirm(val.trim())} disabled={!val.trim()}
            style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: val.trim() ? "var(--point)" : "var(--surface2)", color: val.trim() ? "var(--point-fg)" : "var(--text3)", cursor: val.trim() ? "pointer" : "default", fontSize: 12, fontWeight: 600, fontFamily: "'Noto Sans KR',sans-serif" }}>만들기</button>
        </div>
      </div>
    </div>
  );
}

// ── DeleteFolderModal ─────────────────────────────────────────
function DeleteFolderModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
      style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 14, padding: "22px 22px 18px", minWidth: 280, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>폴더 삭제</div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 20 }}>
          <span style={{ color: "var(--text)", fontWeight: 500 }}>"{name}"</span> 폴더를 삭제할까요?<br />
          <span style={{ fontSize: 12, color: "var(--text3)" }}>메모는 All로 이동됩니다.</span>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid var(--border2)", background: "none", color: "var(--text2)", cursor: "pointer", fontSize: 12, fontFamily: "'Noto Sans KR',sans-serif" }}>취소</button>
          <button onClick={onConfirm} style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: "#ff5252", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'Noto Sans KR',sans-serif" }}>삭제</button>
        </div>
      </div>
    </div>
  );
}

// 폴더 아바타 색상 (id 기반 결정론적)
const AVATAR_COLORS = ["#4a90d9","#5c6bc0","#26a69a","#66bb6a","#ef5350","#ab47bc","#ff7043","#42a5f5"];
function folderAvatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── FolderItem ────────────────────────────────────────────────
function FolderItem({ folder, isActive, memoCount, latestMemoText, onSelect, onDelete, onRename, onSetImage }: {
  folder: Folder; isActive: boolean; memoCount: number; latestMemoText?: string;
  onSelect: () => void; onDelete: () => void; onRename: (n: string) => void;
  onSetImage: (id: string, dataUrl: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(folder.name);
  const ref = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const commit = () => {
    setEditing(false);
    if (val.trim() && val.trim() !== folder.name) onRename(val.trim());
    else setVal(folder.name);
  };
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onSetImage(folder.id, ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const avatarColor = folderAvatarColor(folder.id);

  if (editing) return (
    <input ref={ref} value={val} onChange={e => setVal(e.target.value)} onBlur={commit} autoFocus
      onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(folder.name); setEditing(false); } }}
      style={{ width: "100%", padding: "7px 10px", margin: "1px 0", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 7, color: "var(--text)", fontSize: 14, outline: "none", fontFamily: "'Noto Sans KR',sans-serif" }} />
  );
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}
      onMouseEnter={e => { const b = e.currentTarget.querySelector<HTMLElement>(".fdel"); if (b) b.style.opacity = "1"; }}
      onMouseLeave={e => { const b = e.currentTarget.querySelector<HTMLElement>(".fdel"); if (b) b.style.opacity = "0"; }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageFile} />
      <button onClick={onSelect} onDoubleClick={e => { e.stopPropagation(); setEditing(true); }}
        className={`psv-sidebar-item${isActive ? " is-active" : ""}`}
        style={{ paddingRight: 28, gap: 9, alignItems: "center" }}>
        {/* 아바타 */}
        <span
          onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
          title="이미지 변경"
          style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            background: folder.image ? "transparent" : avatarColor,
            backgroundImage: folder.image ? `url(${folder.image})` : undefined,
            backgroundSize: "cover", backgroundPosition: "center",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 700, color: "#fff",
            cursor: "pointer", overflow: "hidden",
          }}
        >
          {!folder.image && (folder.name[0]?.toUpperCase() ?? "?")}
        </span>
        {/* 이름 + 미리보기 */}
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>{folder.name}</span>
          {latestMemoText && (
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11, color: "var(--text3)", fontWeight: 400 }}>
              {latestMemoText}
            </span>
          )}
        </span>
      </button>
      <button className="fdel" onClick={e => { e.stopPropagation(); onDelete(); }}
        style={{ position: "absolute", right: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 13, padding: "2px 4px", borderRadius: 4, opacity: 0, transition: "opacity 0.15s" }}
        onMouseEnter={e => (e.currentTarget.style.color = "#ff6b6b")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
      >✕</button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function Page() {
  const [state, setState]           = useState<AppState>(() => seed());
  const [hydrated, setHydrated]     = useState(false);
  const [theme, setTheme]           = useState<"dark"|"light">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("psv-theme") as "dark"|"light" | null;
      if (saved) return saved;
    }
    return "dark";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("psv_sidebar_collapsed") === "1"; } catch { return false; }
  });
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try { return Number(localStorage.getItem("psv_sidebar_w")) || 260; } catch { return 260; }
  });
  const sidebarResizing = useRef(false);
  const [focusedDate, setFocusedDate] = useState<string | null>(todayStr());
  const [dateVal, setDateVal]       = useState(todayStr());
  const [inputText, setInputText]   = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Folder | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [noteMemoId, setNoteMemoId] = useState<string | null>(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loaded = loadLegacyState();
    setState(loaded);
    if (loaded.appTitle) document.title = loaded.appTitle;

    // ── SQLite 자동 마이그레이션 ────────────────────────────────
    (async () => {
      try {
        // 서버 DB에 폴더가 이미 있으면 마이그레이션 불필요
        const check = await fetch("/api/folders").catch(() => null);
        if (!check?.ok) { setHydrated(true); return; }
        await check.json();

        const shouldSync =
          loaded.folders.length > 0 || loaded.memos.length > 0 || (!!loaded.appTitle && loaded.appTitle !== "One");

        if (shouldSync) {
          await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appTitle: loaded.appTitle || "One" }),
          }).catch(() => {});
          // 폴더 먼저 (FK 참조)
          for (const f of loaded.folders) {
            await fetch("/api/folders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: f.id, name: f.name, image: f.image ?? null }),
            }).catch(() => {});
          }
          // 메모
          for (const m of loaded.memos) {
            await fetch("/api/memos", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: m.id,
                folderId: m.folderId ?? null,
                text: m.text,
                date: m.date,
                createdAt: m.createdAt,
                color: m.color ?? null,
                image: m.image ?? null,
                note: m.note ?? null,
              }),
            }).catch(() => {});
          }
        }
      } catch { /* 무시 */ }
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    (async () => {
      try {
        const [foldersRes, memosRes, settingsRes] = await Promise.all([
          fetch("/api/folders"),
          fetch("/api/memos"),
          fetch("/api/settings"),
        ]);

        if (!foldersRes.ok || !memosRes.ok || !settingsRes.ok) return;

        const [{ folders }, { memos }, { appTitle }] = await Promise.all([
          foldersRes.json(),
          memosRes.json(),
          settingsRes.json(),
        ]);

        setState((prev) => ({
          version: 1,
          appTitle: appTitle || "One",
          folders: folders.map((folder: any) => ({
            id: folder.id,
            name: folder.name,
            createdAt: folder.created_at ?? folder.createdAt,
            image: folder.image ?? null,
          })),
          memos: memos.map((memo: any) => ({
            id: memo.id,
            folderId: memo.folder_id ?? memo.folderId ?? null,
            date: memo.date,
            text: memo.text,
            createdAt: memo.created_at ?? memo.createdAt,
            color: memo.color ?? null,
            image: memo.image ?? null,
            note: memo.note ?? null,
          })),
          activeFolder:
            prev.activeFolder !== "all" && folders.some((folder: Folder) => folder.id === prev.activeFolder)
              ? prev.activeFolder
              : "all",
        }));

        try { localStorage.removeItem(STORAGE_KEY); } catch {}
      } catch {}
    })();
  }, [hydrated]);

  // 탭 타이틀 동기화
  useEffect(() => {
    if (hydrated) document.title = state.appTitle || "One";
  }, [state.appTitle, hydrated]);

  // 테마 변경 시 저장 + 적용
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("psv-theme", theme);
  }, [theme]);

  const update = useCallback((updater: (s: AppState) => AppState) => {
    setState(prev => updater(prev));
  }, []);

  // ── API helpers ───────────────────────────────────────────
  const apiPost  = (url: string, body: object) =>
    fetch(url, { method: "POST",   headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  const apiPatch = (url: string, body: object) =>
    fetch(url, { method: "PATCH",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  const apiDel   = (url: string) =>
    fetch(url, { method: "DELETE" }).catch(() => {});

  // ── Memo actions ──────────────────────────────────────────
  const addMemo = () => {
    const text = inputText.trim();
    if (!text || !dateVal) return;
    const folderId = state.activeFolder === "all" ? null : state.activeFolder;
    const memo: Memo = { id: uid(), folderId, date: dateVal, text, createdAt: Date.now() };
    update(s => ({ ...s, memos: [...s.memos, memo] }));
    apiPost("/api/memos", { id: memo.id, folderId: memo.folderId, text: memo.text, date: memo.date });
    setInputText("");
    setTimeout(() => {
      document.querySelector(`[data-month="${monthKey(dateVal)}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
  };

  const updateMemo  = (id: string, text: string) => {
    update(s => ({ ...s, memos: s.memos.map(m => m.id === id ? { ...m, text } : m) }));
    apiPatch(`/api/memos/${id}`, { text });
  };
  const deleteMemo  = (id: string) => {
    update(s => ({ ...s, memos: s.memos.filter(m => m.id !== id) }));
    apiDel(`/api/memos/${id}`);
    if (noteMemoId === id) setNoteMemoId(null);
    setOpenMenuId(null);
  };
  const pickColor   = (id: string, color: string | null) =>
    (update(s => ({ ...s, memos: s.memos.map(m => m.id === id ? { ...m, color } : m) })), apiPatch(`/api/memos/${id}`, { color }));
  const pickImage   = async (id: string, dataUrl: string) =>
    (update(s => ({ ...s, memos: s.memos.map(m => m.id === id ? { ...m, image: dataUrl } : m) })), apiPatch(`/api/memos/${id}`, { image: dataUrl }));
  const clearImage  = (id: string) =>
    (update(s => ({ ...s, memos: s.memos.map(m => m.id === id ? { ...m, image: null } : m) })), apiPatch(`/api/memos/${id}`, { image: null }));
  const moveFolder  = (id: string, folderId: string | null) => {
    update(s => ({ ...s, memos: s.memos.map(m => m.id === id ? { ...m, folderId } : m) }));
    apiPatch(`/api/memos/${id}`, { folderId: folderId ?? null });
  };
  const saveNote    = (id: string, note: string) =>
    (update(s => ({ ...s, memos: s.memos.map(m => m.id === id ? { ...m, note } : m) })), apiPatch(`/api/memos/${id}`, { note }));

  // ── Drag & Drop ───────────────────────────────────────────
  const handleDragStart = useCallback((id: string) => {
    setDraggingId(id);
    setDropTarget(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTarget(null);
  }, []);

  const handleDragOverSlot = useCallback((date: string, insertIndex: number) => {
    setDropTarget(prev => {
      if (prev?.date === date && prev?.insertIndex === insertIndex) return prev;
      return { date, insertIndex };
    });
  }, []);

  const handleDropSlot = useCallback((date: string, insertIndex: number) => {
    const dragId = draggingId;
    setDraggingId(null);
    setDropTarget(null);
    if (!dragId) return;

    update(s => {
      const memo = s.memos.find(m => m.id === dragId);
      if (!memo) return s;

      // 드롭 대상 날짜의 메모들 (드래그 중인 것 제외), createdAt 순
      const targetMemos = s.memos
        .filter(m => m.date === date && m.id !== dragId)
        .sort((a, b) => a.createdAt - b.createdAt);

      const clampedIdx = Math.max(0, Math.min(insertIndex, targetMemos.length));

      // 같은 날, 같은 위치면 no-op
      if (memo.date === date) {
        const currentIdx = targetMemos.findIndex((_, i) => {
          const before = i > 0 ? targetMemos[i - 1] : null;
          return !before || before.createdAt < memo.createdAt;
        });
        // 간단하게 — 삽입 위치가 실질적으로 같으면 skip
      }

      const now = Date.now();
      const prevCreatedAt = clampedIdx > 0 ? targetMemos[clampedIdx - 1].createdAt : now - 1000000;
      const nextCreatedAt = clampedIdx < targetMemos.length ? targetMemos[clampedIdx].createdAt : now + 1000000;
      const newCreatedAt  = Math.round((prevCreatedAt + nextCreatedAt) / 2);

      return {
        ...s,
        memos: s.memos.map(m =>
          m.id === dragId ? { ...m, date, createdAt: newCreatedAt } : m
        ),
      };
    });
  }, [draggingId, update]);

  // ── Folder actions ─────────────────────────────────────────
  const createFolder = (name: string) => {
    const f: Folder = { id: uid(), name, createdAt: Date.now() };
    update(s => ({ ...s, folders: [...s.folders, f] }));
    apiPost("/api/folders", { id: f.id, name: f.name });
    setShowCreate(false);
  };
  const deleteFolder = (id: string) => {
    update(s => ({
      ...s,
      folders: s.folders.filter(f => f.id !== id),
      memos: s.memos.map(m => m.folderId === id ? { ...m, folderId: null } : m),
      activeFolder: s.activeFolder === id ? "all" : s.activeFolder,
    }));
    apiDel(`/api/folders/${id}`);
    setDeleteTarget(null);
  };
  const renameFolder = (id: string, name: string) => {
    update(s => ({ ...s, folders: s.folders.map(f => f.id === id ? { ...f, name } : f) }));
    apiPatch(`/api/folders/${id}`, { name });
  };
  const setFolderImage = (id: string, dataUrl: string | null) =>
    (update(s => ({ ...s, folders: s.folders.map(f => f.id === id ? { ...f, image: dataUrl } : f) })), apiPatch(`/api/folders/${id}`, { image: dataUrl }));
  const setActiveFolder = (id: string) =>
    update(s => ({ ...s, activeFolder: id }));

  // ── 커서 키 네비게이션 (오늘 날짜 메모 위아래 이동) ─────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      // 날짜 목록 (최신순)
      const dates = Array.from(new Set(state.memos.map(m => m.date))).sort().reverse();
      if (dates.length === 0) return;
      // 초기값: 오늘 날짜
      const startDate = focusedDate ?? todayStr();
      const curIdx = dates.indexOf(startDate);
      let nextIdx = curIdx < 0 ? 0 : curIdx;
      if (e.key === "ArrowDown") nextIdx = curIdx < dates.length - 1 ? curIdx + 1 : dates.length - 1;
      if (e.key === "ArrowUp")   nextIdx = curIdx > 0 ? curIdx - 1 : 0;
      setFocusedDate(dates[nextIdx]);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.memos, focusedDate]);

  // ── Grouping ───────────────────────────────────────────────
  const visibleMemos = state.activeFolder === "all"
    ? state.memos
    : state.memos.filter(m => m.folderId === state.activeFolder);

  const grouped: Record<string, Record<string, Memo[]>> = {};
  visibleMemos.forEach(m => {
    const mk = monthKey(m.date);
    if (!grouped[mk]) grouped[mk] = {};
    if (!grouped[mk][m.date]) grouped[mk][m.date] = [];
    grouped[mk][m.date].push(m);
  });
  const months = Object.keys(grouped).sort().reverse();
  const handleClickEmpty = (d: string) => { setDateVal(d); inputRef.current?.focus(); };

  const today = new Date();
  const todayLabel = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
  const noteMemo = noteMemoId ? state.memos.find(m => m.id === noteMemoId) ?? null : null;

  useEffect(() => {
    if (!showSettingsMenu) return;
    const handler = (e: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSettingsMenu]);

  if (!hydrated) return null;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* 모바일 딤 오버레이 */}
      {sidebarOpen && (
        <div className="psv-sidebar-dim" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR (로고 포함) ───────────────────────────────── */}
      <div className={`psv-sidebar${sidebarOpen ? " psv-sidebar--open" : ""}${sidebarCollapsed ? " psv-sidebar--collapsed" : ""}`}
        style={sidebarCollapsed ? { width: 0, minWidth: 0, padding: 0, borderRight: "none", overflow: "hidden" } : { width: sidebarWidth, minWidth: sidebarWidth }}>

        {/* 로고 영역 */}
        <div className="psv-sidebar-logo">
          <div className="psv-brand" style={{ flex: 1, minWidth: 0 }}>
            <input
              className="psv-titleText psv-titleInput"
              value={state.appTitle}
              onChange={e => {
                const v = e.target.value;
                setState(s => ({ ...s, appTitle: v }));
                document.title = v || "One";
                apiPost("/api/settings", { appTitle: v || "One" });
              }}
              aria-label="앱 타이틀"
            />
            <div className="psv-subText">
              {state.activeFolder === "all"
                ? "한줄 메모장"
                : (state.folders.find(f => f.id === state.activeFolder)?.name ?? "한줄 메모장")}
            </div>
          </div>
          <button
            title="사이드바 접기"
            className="psv-sidebar-iconbtn psv-sidebar-collapse-btn"
            onClick={() => {
              setSidebarCollapsed(true);
              try { localStorage.setItem("psv_sidebar_collapsed", "1"); } catch {}
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* 스크롤 영역 (로고 아래만 스크롤) */}
        <div className="psv-sidebar-scroll">

        {/* All 행 */}
        <div className={`psv-sidebar-all-row${state.activeFolder === "all" ? " is-active" : ""}`}>
          <button onClick={() => { setActiveFolder("all"); setSidebarOpen(false); }}
            className="psv-sidebar-item psv-sidebar-item--all"
            style={{ alignItems: "center", gap: 9, flex: 1, paddingRight: 6 }}>
            <span style={{
              width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg,#4a90d9,#5c6bc0)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}>≡</span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>All</span>
              {state.memos.length > 0 && (
                <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 400 }}>{state.memos.length}개의 메모</span>
              )}
            </span>
          </button>
          <button onClick={() => setShowCreate(true)}
            title="폴더 만들기"
            className="psv-sidebar-iconbtn"
            style={{ marginRight: 6 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {[...state.folders].sort((a, b) => {
          const aMax = state.memos.filter(m => m.folderId === a.id).reduce((max, m) => Math.max(max, m.createdAt), a.createdAt);
          const bMax = state.memos.filter(m => m.folderId === b.id).reduce((max, m) => Math.max(max, m.createdAt), b.createdAt);
          return bMax - aMax;
        }).map(f => {
          const folderMemos = state.memos.filter(m => m.folderId === f.id);
          const latest = folderMemos.sort((a, b) => b.createdAt - a.createdAt)[0]?.text;
          return (
            <FolderItem key={f.id} folder={f} isActive={state.activeFolder === f.id}
              memoCount={folderMemos.length}
              latestMemoText={latest}
              onSelect={() => { setActiveFolder(f.id); setSidebarOpen(false); }}
              onDelete={() => setDeleteTarget(f)}
              onRename={name => renameFolder(f.id, name)}
              onSetImage={setFolderImage} />
          );
        })}

        </div>{/* /psv-sidebar-scroll */}

        {/* 리사이즈 핸들 */}
        <div
          style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 5, cursor: "col-resize", zIndex: 300 }}
          onMouseDown={e => {
            e.preventDefault();
            sidebarResizing.current = true;
            const startX = e.clientX;
            const startW = sidebarWidth;
            const onMove = (ev: MouseEvent) => {
              if (!sidebarResizing.current) return;
              const next = Math.min(400, Math.max(180, startW + ev.clientX - startX));
              setSidebarWidth(next);
            };
            const onUp = (ev: MouseEvent) => {
              sidebarResizing.current = false;
              const next = Math.min(400, Math.max(180, startW + ev.clientX - startX));
              try { localStorage.setItem("psv_sidebar_w", String(next)); } catch {}
              window.removeEventListener("mousemove", onMove);
              window.removeEventListener("mouseup", onUp);
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
          }}
        />
      </div>

      {/* ── MAIN + NOTE ──────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* INPUT BAR 행 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px 4px", flexShrink: 0 }}>
            {/* 모바일 햄버거 / 데스크탑 collapse 복원 */}
            <button
              className="psv-hamburger"
              style={sidebarCollapsed ? { display: "inline-flex", flexShrink: 0 } : undefined}
              onClick={() => {
                if (sidebarCollapsed) {
                  setSidebarCollapsed(false);
                  try { localStorage.setItem("psv_sidebar_collapsed", "0"); } catch {}
                } else {
                  setSidebarOpen(o => !o);
                }
              }}
              aria-label="메뉴"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            <div className="psv-input-bar" style={{ flex: 1, height: "var(--input-h)", minHeight: "var(--input-h)", display: "flex", alignItems: "center", padding: "0 12px 0 8px", gap: 10, border: "1px solid var(--point)", borderRadius: 10, background: "var(--input-bg)" }}>
              <input type="date" value={dateVal} onChange={e => setDateVal(e.target.value)}
                style={{ background: "var(--date-bg)", border: "1px solid var(--date-border)", borderRadius: 8, color: "var(--input-text)", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, padding: "6px 10px", outline: "none", cursor: "pointer", flexShrink: 0, colorScheme: theme === "dark" ? "dark" : "light", fontWeight: 500 }} />
              <input ref={inputRef} type="text" value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addMemo(); }}
                placeholder="메모를 입력하고 Enter…" maxLength={200}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--input-text)", fontFamily: "'Noto Sans KR',sans-serif", fontSize: 14, padding: "0 4px" }} />
            </div>

            {/* ⋯ 설정 메뉴 */}
            <div style={{ position: "relative", flexShrink: 0 }} ref={settingsMenuRef}>
              <button
                className="psv-kebab-btn"
                onClick={() => setShowSettingsMenu(v => !v)}
                title="설정"
              >
                <svg width="4" height="18" viewBox="0 0 4 18" fill="none">
                  <circle cx="2" cy="2" r="2" fill="currentColor"/>
                  <circle cx="2" cy="9" r="2" fill="currentColor"/>
                  <circle cx="2" cy="16" r="2" fill="currentColor"/>
                </svg>
              </button>
              {showSettingsMenu && (
                <div className="psv-settings-dropdown" onClick={e => e.stopPropagation()}>
                  <div className="psv-settings-label">
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--point)", letterSpacing: "0.05em", opacity: 0.8 }}>{todayLabel}</span>
                  </div>
                  <button
                    className="psv-settings-item"
                    onClick={() => { setTheme(t => t === "dark" ? "light" : "dark"); setShowSettingsMenu(false); }}
                  >
                    <span>{theme === "dark" ? "☀︎" : "☾"}</span>
                    <span>{theme === "dark" ? "라이트 모드" : "다크 모드"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

            {/* PANELS */}
            <div
              className="psv-scroll"
              style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "20px 0 40px 20px", display: "flex", flexDirection: "column", gap: 28 }}
              onClick={() => { if (openMenuId) setOpenMenuId(null); }}
              onDragOver={e => e.preventDefault()}
            >
              {months.length === 0 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 80, color: "var(--text3)", fontSize: 13 }}>
                  <div style={{ fontSize: 28 }}>✦</div>
                  <div>메모를 입력해 시작하세요</div>
                </div>
              )}
              {months.map(mk => (
                <MonthPanel
                  key={mk} mk={mk} byDay={grouped[mk]} openMenuId={openMenuId}
                  draggingId={draggingId} dropTarget={dropTarget}
                  focusedDate={focusedDate}
                  onUpdate={updateMemo}
                  onOpenMenu={id => setOpenMenuId(id)}
                  onCloseMenu={() => setOpenMenuId(null)}
                  onPickColor={pickColor}
                  onPickImage={async (id, dataUrl) => { await pickImage(id, dataUrl); setOpenMenuId(null); }}
                  onClearImage={id => { clearImage(id); setOpenMenuId(null); }}
                  onOpenNote={id => setNoteMemoId(noteMemoId === id ? null : id)}
                  onDelete={deleteMemo}
                  onMoveFolder={moveFolder}
                  folders={state.folders}
                  onClickEmpty={handleClickEmpty}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOverSlot={handleDragOverSlot}
                  onDropSlot={handleDropSlot}
                />
              ))}
            </div>
          </div>

          {/* NOTE PANEL */}
          <div style={{ width: noteMemo ? "46%" : 0, minWidth: 0, overflow: "hidden", flexShrink: 0, transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)", borderLeft: noteMemo ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
            {noteMemo && <NotePanel memo={noteMemo} onSave={saveNote} onClose={() => setNoteMemoId(null)} />}
          </div>
        </div>

      {showCreate && <FolderModal onConfirm={createFolder} onCancel={() => setShowCreate(false)} />}
      {deleteTarget && (
        <DeleteFolderModal name={deleteTarget.name}
          onConfirm={() => deleteFolder(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
