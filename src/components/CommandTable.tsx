import React from "react";
import { DiscordCommand } from "../pages/CommandsPage";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import '../components/CSS/CommandsTable.css';

type Props = {
  commands: DiscordCommand[];
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (cmd: DiscordCommand) => void;
  onDelete: (id: string) => void;
};

export default function CommandTable({ commands, onToggle, onEdit, onDelete }: Props) {
  return (
    <table className="commands-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Description</th>
          <th>Enable/Disable</th>
          <th>Usage Count</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {commands.map((cmd) => (
          <tr key={cmd.id}>
            <td>/{cmd.name}</td>
            <td>{cmd.description}</td>
            <td>
              <input
                type="checkbox"
                checked={cmd.enabled}
                onChange={(e) => onToggle(cmd.id, e.target.checked)}
              />
            </td>
            <td>{cmd.usageCount}</td>
            <td className="command-actions">
              <button className="icon-btn edit-btn" onClick={() => onEdit(cmd)}>
                <FiEdit2 />
              </button>
              <button className="icon-btn delete-btn" onClick={() => onDelete(cmd.id)}>
                <FiTrash2 />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
