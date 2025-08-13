// components/GlassSelect.tsx
import React, { useState, useRef, useEffect } from "react";
import { FiCheck } from "react-icons/fi";

type Option = { value: string; label: string };

interface GlassSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
}

export default function GlassSelect({ value, onChange, options }: GlassSelectProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedLabel = options.find(o => o.value === value)?.label || "Select...";

    return (
        <div
            className={`glass-dropdown ${open ? "open" : ""}`}
            ref={ref}
            onClick={() => setOpen(o => !o)}
        >
            <div className="glass-selected">
                <span className="glass-selected__text">{selectedLabel}</span>
                <span className="arrow" />
            </div>
            {open && (
                <ul className="glass-options">
                    {options.map(opt => (
                        <li
                            key={opt.value}
                            className={opt.value === value ? "active" : ""}
                            onClick={() => {
                                onChange(opt.value);
                                setOpen(false);
                            }}
                        >
                            {opt.label}
                            {opt.value === value && <FiCheck size={16} className="opt-check" />}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
