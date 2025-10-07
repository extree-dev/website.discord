import React, { useState } from "react";
import { DiscordCommand } from "../pages/CommandsPage.js";
import CommandParams from "./CommandParams.js";
import CommandAccess from "./CommandAccess.js";

type Props = {
  command: DiscordCommand | null;
  onSave: (cmd: DiscordCommand) => void;
  onCancel: () => void;
};

export default function CommandForm({ command, onSave, onCancel }: Props) {
  const [form, setForm] = useState<DiscordCommand>(
    command || {
      id: "",
      name: "",
      description: "",
      enabled: true,
      usageCount: 0,
      params: [],
      access: [],
    }
  );
  const [selectOpen, setSelectOpen] = useState(false);

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>{command ? "Edit Command" : "Create Command"}</h2>

        <label>Command Name:</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <label>Description:</label>
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <CommandParams
          params={form.params}
          onChange={(params) => setForm({ ...form, params })}
          onSelectOpenChange={setSelectOpen}
        />

        <CommandAccess
          access={form.access}
          onChange={(access) => setForm({ ...form, access })}
          className={selectOpen ? "shifted" : ""}
        />

        <div className="modal-actions">
          <button className="btn-primary" onClick={() => onSave(form)}>Save</button>
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
