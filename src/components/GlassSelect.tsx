import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { FiCheck } from "react-icons/fi";
import styles from "../styles/components/GlassSelect.module.scss";

type Option = { value: string; label: string };

interface GlassSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  onOpenChange?: (open: boolean) => void;
}

export default function GlassSelect({
  value,
  onChange,
  options,
  onOpenChange,
}: GlassSelectProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label || "Select...";

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      if (open) setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

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
      setCoords((c) => (c ? { ...c, top: newTop } : c));
    }
  }, [open, coords]);

  const list = (
    <ul
      ref={listRef}
      className={styles.options}
      role="listbox"
      style={{
        top: coords?.top ?? -9999,
        left: coords?.left ?? -9999,
        width: coords?.width ?? "auto",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {options.map((opt) => (
        <li
          key={opt.value}
          className={`${styles.option} ${opt.value === value ? styles.active : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onChange(opt.value);
            setOpen(false);
          }}
        >
          {opt.label}
          {opt.value === value && <FiCheck size={16} className={styles.checkIcon} />}
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <div className={`${styles.dropdown} ${open ? styles.open : ""}`}>
        <div className={styles.selected} ref={triggerRef} onClick={toggle}>
          <span className={styles.selectedText}>{selectedLabel}</span>
          <span className={styles.arrow} />
        </div>
      </div>
      {open && coords && ReactDOM.createPortal(list, document.body)}
    </>
  );
}
