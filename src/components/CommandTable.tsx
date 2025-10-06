import React from "react";
import { DiscordCommand } from "../pages/CommandsPage.js";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import styles from "../styles/components/CommandTable.module.scss";

type Props = {
  commands: DiscordCommand[];
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (cmd: DiscordCommand) => void;
  onDelete: (id: string) => void;
};

export default function CommandTable({ commands, onToggle, onEdit, onDelete }: Props) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Enable / Disable</th>
            <th>Usage Count</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {commands.map((cmd) => (
            <tr key={cmd.id}>
              <td className={styles.nameCell}>/{cmd.name}</td>
              <td>{cmd.description}</td>
              <td>
                <label className={styles.toggleWrapper}>
                  <input
                    type="checkbox"
                    checked={cmd.enabled}
                    onChange={(e) => onToggle(cmd.id, e.target.checked)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </td>
              <td>{cmd.usageCount}</td>
              <td className={styles.actions}>
                <button
                  className={`${styles.iconBtn} ${styles.editBtn}`}
                  onClick={() => onEdit(cmd)}
                  title="Edit command"
                >
                  <FiEdit2 />
                </button>
                <button
                  className={`${styles.iconBtn} ${styles.deleteBtn}`}
                  onClick={() => onDelete(cmd.id)}
                  title="Delete command"
                >
                  <FiTrash2 />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
