import { useEffect } from "react";
import "./CSS/Toast.css";

interface ToastProps {
    message: string;
    type: "success" | "error";
    onClose: () => void;
    duration?: number;
}

export const Toast = ({ message, type, onClose, duration = 3000 }: ToastProps) => {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [onClose, duration]);

    return (
        <div className={`toast toast-${type}`}>
            <span>{message}</span>
            <button onClick={onClose}>×</button>
        </div>
    );
};