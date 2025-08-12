import React, { useEffect, useRef, useState } from "react";
import "../components/CSS/LanguageSelect.css";
import { FiCheck } from "react-icons/fi";        // Feather Icons, тонкая
import { LuCheck } from "react-icons/lu";        // Lucide, чуть современнее Fi
import { HiOutlineCheck } from "react-icons/hi"; // Heroicons Outline
import { FaCheck } from "react-icons/fa";        // Font Awesome, классическая жирная
import { HiCheck } from "react-icons/hi";        // Heroicons Solid
import { BsCheck } from "react-icons/bs";        // Bootstrap Icons
import { GiCheckMark } from "react-icons/gi";



type Props = {
    value: string;
    onChange: (lang: string) => void;
};

export default function LanguageSelect({ value, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const optionsRef = useRef<HTMLUListElement | null>(null);

    const languages = [
        { code: "ru", label: "Русский" },
        { code: "en", label: "English" },
        { code: "de", label: "Deutsch" },
    ];

    const current = languages.find((l) => l.code === value)?.label || "";

    // close on click outside
    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }
        document.addEventListener("mousedown", onDoc);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDoc);
            document.removeEventListener("keydown", onKey);
        };
    }, []);

    // keyboard: Enter / Space open, arrows navigate (simple)
    const onKeyDownSelected = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((s) => !s);
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            // focus first option
            setTimeout(() => optionsRef.current?.querySelector("li")?.focus(), 0);
        }
    };

    return (
        <div
            className={`glass-dropdown ${open ? "open" : ""}`}
            ref={containerRef}
            aria-haspopup="listbox"
            aria-expanded={open}
        >
            <div
                className="glass-selected"
                tabIndex={0}
                role="button"
                onClick={() => setOpen((p) => !p)}
                onKeyDown={onKeyDownSelected}
                aria-label="Выбор языка"
            >
                <span className="glass-selected__text">{current}</span>
                <span className="arrow" aria-hidden />
            </div>

            {open && (
                <ul
                    className="glass-options"
                    role="listbox"
                    ref={optionsRef}
                    aria-activedescendant={value}
                >
                    {languages.map((lang) => (
                        <li
                            key={lang.code}
                            id={lang.code}
                            tabIndex={0}
                            role="option"
                            aria-selected={value === lang.code}
                            className={lang.code === value ? "active" : ""}
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange(lang.code);
                                setOpen(false);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onChange(lang.code);
                                    setOpen(false);
                                }
                                if (e.key === "ArrowDown") {
                                    e.preventDefault();
                                    (e.currentTarget.nextSibling as HTMLElement | null)?.focus();
                                }
                                if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    (e.currentTarget.previousSibling as HTMLElement | null)?.focus();
                                }
                                if (e.key === "Escape") {
                                    setOpen(false);
                                }
                            }}
                        >
                            <span className="opt-label">{lang.label}</span>
                            {value === lang.code && <span className="opt-check">
                                <LuCheck size={15} color="white" />
                            </span>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
