import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { FiCheck } from "react-icons/fi";

type Option = { value: string; label: string };

interface GlassSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  onOpenChange?: (open: boolean) => void; // ✅ новый проп
}

export default function GlassSelect({ value, onChange, options, onOpenChange }: GlassSelectProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label || "Select...";

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(o => {
      const newState = !o;
      onOpenChange?.(newState); // ✅ сообщаем родителю
      return newState;
    });
  };

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      if (open) onOpenChange?.(false); // ✅ при клике вне — сообщаем
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    const updatePos = () => {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: r.bottom + window.scrollY + 10,
        left: r.left + window.scrollX,
        width: r.width,
      });
    };
    if (open) {
      updatePos();
      window.addEventListener("scroll", updatePos, true);
      window.addEventListener("resize", updatePos);
      return () => {
        window.removeEventListener("scroll", updatePos, true);
        window.removeEventListener("resize", updatePos);
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current || !coords) return;
    const listRect = listRef.current.getBoundingClientRect();
    const overflowBottom = listRect.bottom > window.innerHeight - 8;
    if (overflowBottom) {
      const newTop = coords.top - listRect.height - 20;
      setCoords(c => (c ? { ...c, top: newTop } : c));
    }
  }, [open, coords]);

  const list = (
    <ul
      ref={listRef}
      className="glass-options"
      role="listbox"
      style={{
        position: "absolute",
        top: coords?.top ?? -9999,
        left: coords?.left ?? -9999,
        width: coords?.width ?? "auto",
        zIndex: 100000,
        pointerEvents: "auto",
      }}
      onClick={e => e.stopPropagation()}
    >
      {options.map(opt => (
        <li
          key={opt.value}
          className={opt.value === value ? "active" : ""}
          onClick={(e) => {
            e.stopPropagation();
            onChange(opt.value);
            setOpen(false);
            onOpenChange?.(false); // ✅ при выборе — закрываем
          }}
        >
          {opt.label}
          {opt.value === value && <FiCheck size={16} className="opt-check" />}
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <div className={`glass-dropdown ${open ? "open" : ""}`}>
        <div className="glass-selected" ref={triggerRef} onClick={toggle}>
          <span className="glass-selected__text">{selectedLabel}</span>
          <span className="arrow" />
        </div>
      </div>
      {open && coords && ReactDOM.createPortal(list, document.body)}
    </>
  );
}
