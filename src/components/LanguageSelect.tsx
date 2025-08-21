import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import "../components/CSS/LanguageSelect.css";
import { LuCheck } from "react-icons/lu";

type Props = {
    options: string[];
    defaultValue?: string;
    onChange: (value: string) => void;
};


export default function LanguageSelect({ options, defaultValue, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
    const [value, setValue] = useState(defaultValue || options[0]);

    const containerRef = useRef<HTMLDivElement | null>(null);

    const current = value;

    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
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
            {options.map((opt: string) => (
                <li
                    key={opt}
                    className={opt === value ? "active" : ""}
                    onClick={(e) => {
                        e.stopPropagation();
                        setValue(opt);
                        onChange(opt);
                        setOpen(false);
                    }}
                >
                    <span className="opt-label">{opt}</span>
                </li>
            ))}
        </ul>
    );

    return (
        <>
            <div className={`glass-dropdown ${open ? "open" : ""}`} ref={containerRef}>
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

