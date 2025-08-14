import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import "../components/CSS/LanguageSelect.css";
import { LuCheck } from "react-icons/lu";

type Props = {
    value: string;
    onChange: (lang: string) => void;
};

export default function LanguageSelect({ value, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

    const containerRef = useRef<HTMLDivElement | null>(null);

    const languages = [
        { code: "ru", label: "Русский" },
        { code: "en", label: "English" },
        { code: "de", label: "Deutsch" },
    ];

    const current = languages.find((l) => l.code === value)?.label || "";

    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (!containerRef.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    useEffect(() => {
        if (open && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY + 10,
                left: rect.left + window.scrollX,
                width: rect.width,
            });
        }
    }, [open]);

    const optionsList = (
        <ul
            className="glass-options"
            role="listbox"
            style={{
                position: "absolute",
                top: coords?.top ?? 0,
                left: coords?.left ?? 0,
                width: coords?.width ?? "auto",
                zIndex: 9999,
            }}
        >
            {languages.map((lang) => (
                <li
                    key={lang.code}
                    className={lang.code === value ? "active" : ""}
                    onClick={(e) => {
                        e.stopPropagation(); // блокируем всплытие
                        onChange(lang.code);
                        setOpen(false);
                    }}
                >
                    <span className="opt-label">{lang.label}</span>
                    {value === lang.code && (
                        <span className="opt-check">
                            <LuCheck size={15} color="white" />
                        </span>
                    )}
                </li>
            ))}
        </ul>
    );

    return (
        <>
            <div
                className={`glass-dropdown ${open ? "open" : ""}`}
                ref={containerRef}
            >
                {/* Перенёс onClick сюда */}
                <div
                    className="glass-selected"
                    tabIndex={0}
                    role="button"
                    onClick={() => setOpen((p) => !p)}
                >
                    <span className="glass-selected__text">{current}</span>
                    <span className="arrow" aria-hidden />
                </div>
            </div>

            {open && coords && ReactDOM.createPortal(optionsList, document.body)}
        </>
    );
}
