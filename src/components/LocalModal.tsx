// LocalModal.tsx - ОБНОВЛЕННЫЙ
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaDiscord } from "react-icons/fa";
import styles from "../styles/components/LocalModal.module.scss";

interface LockModalProps {
  message: string;
  lockUntil: number | null; // Добавляем пропс
  onClose?: () => void;
}

export const LockModal: React.FC<LockModalProps> = ({ message, lockUntil, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!lockUntil) {
      setIsVisible(false);
      return;
    }

    const updateRemainingTime = () => {
      const now = Date.now();
      const remaining = lockUntil - now;
      
      if (remaining <= 0) {
        setRemainingMs(0);
        setIsVisible(false);
        onClose?.();
      } else {
        setRemainingMs(remaining);
      }
    };

    // Первоначальное обновление
    updateRemainingTime();

    const interval = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(interval);
  }, [lockUntil, onClose]);

  // Добавляем класс к body когда модалка открыта
  useEffect(() => {
    if (isVisible && lockUntil) {
      document.body.classList.add(styles.bodyBlur);
    } else {
      document.body.classList.remove(styles.bodyBlur);
    }

    return () => {
      document.body.classList.remove(styles.bodyBlur);
    };
  }, [isVisible, lockUntil]);

  if (!isVisible || !lockUntil) return null;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  const progressPercentage = (remainingMs / (2 * 60 * 1000)) * 100;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className={styles.modal}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className={styles.header}>
            <FaDiscord className={styles.icon} />
            <h2 className={styles.title}>Security Lock</h2>
          </div>

          {/* Message */}
          <div className={styles.message}>
            {message}
          </div>

          {/* Timer */}
          <div className={styles.timer}>
            <div className={styles.time}>{minutes}:{seconds}</div>
            <div className={styles.timerLabel}>remaining</div>
          </div>

          {/* Progress Bar */}
          <div className={styles.progress}>
            <motion.div
              className={styles.progressBar}
              initial={{ width: "100%" }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};