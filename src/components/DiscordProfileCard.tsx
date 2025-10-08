import React from "react";
import { Calendar, Crown, Circle } from "lucide-react";
import styles from "../styles/components/DiscordProfileCard.module.scss";

interface DiscordProfileCardProps {
  nickname: string;
  discordId: string;
  avatar: string;
  highestRole: string;
  roleHexColor: string;
  createdAt?: string;
  status?: "online" | "idle" | "dnd" | "offline";
}

const statusLabels: Record<string, string> = {
  online: "Online",
  idle: "Idle",
  dnd: "Do Not Disturb",
  offline: "Offline",
};

const statusColors: Record<string, string> = {
  online: "#43b581",
  idle: "#faa61a",
  dnd: "#f04747",
  offline: "#747f8d",
};

const DiscordProfileCard: React.FC<DiscordProfileCardProps> = ({
  nickname,
  discordId,
  avatar,
  highestRole,
  roleHexColor,
  createdAt,
  status = "online",
}) => {
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Unknown";

  return (
    <div className={styles.card}>
      <div className={styles.avatarSection}>
        <img src={avatar} alt={nickname} className={styles.avatar} />
        <div className={`${styles.statusDot} ${styles[status]}`} />
      </div>

      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.nickname}>{nickname}</span>
          <span className={styles.discordTag}>#{discordId.slice(-4)}</span>
        </div>

        <div className={styles.statusRow}>
          <Circle
            size={8}
            style={{
              color: statusColors[status],
              marginRight: 4,
              flexShrink: 0,
            }}
            fill={statusColors[status]}
          />
          <span className={styles.statusText}>{statusLabels[status]}</span>
        </div>

        <div className={styles.roleRow}>
          <Crown
            size={12}
            className={styles.roleIcon}
            style={{ color: roleHexColor }}
          />
          <span className={styles.role} style={{ color: roleHexColor }}>
            {highestRole}
          </span>
        </div>

        <div className={styles.createdRow}>
          <Calendar size={12} className={styles.calendarIcon} />
          <span className={styles.createdText}>Joined {formattedDate}</span>
        </div>
      </div>
    </div>
  );
};

export default DiscordProfileCard;
