import { useEffect, useState } from "react";

/**
 * Хук для обратного отсчета времени до заданного timestamp
 * @param targetTime - timestamp в миллисекундах
 */
export const useCountdown = (targetTime: number) => {
  const [remaining, setRemaining] = useState(Math.max(0, targetTime - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      const newRemaining = Math.max(0, targetTime - Date.now());
      setRemaining(newRemaining);
      if (newRemaining === 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  return remaining;
};
