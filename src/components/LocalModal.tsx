// LocalModal.tsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button.js";
import { FaDiscord } from "react-icons/fa";
import "./CSS/LocalModal.css"; // Подключаем CSS

interface LockModalProps {
  message: string;
  onClose?: () => void;
}

export const LockModal: React.FC<LockModalProps> = ({ message, onClose }) => {
  const TWO_MINUTES_MS = 2 * 60 * 1000;
  const [remainingMs, setRemainingMs] = useState(TWO_MINUTES_MS);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setRemainingMs(prev => {
        if (prev <= 1000) {
          clearInterval(interval);
          setIsVisible(false);
          onClose?.();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return (
    <AnimatePresence>
      <motion.div
        className="lockmodal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="lockmodal-container"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
        >
          <FaDiscord size={96} className="lockmodal-image" />
          <h2 className="lockmodal-title">{message}</h2>
          <p className="lockmodal-text">Try again</p>
          <div className="lockmodal-timer">{minutes}:{seconds}</div>
          <Button
            className="lockmodal-button"
            onClick={() => {
              setIsVisible(false);
              onClose?.();
            }}
          >
            OK
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
