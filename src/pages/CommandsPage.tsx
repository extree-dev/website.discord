import React, { useState } from "react";
import CommandTable from "../components/CommandTable";
import CommandForm from "../components/CommandForm";
import "../components/CSS/CommandsPage.css";
import Sidebars from "@/components/Saidbar";
import { FiPlus } from "react-icons/fi";

export type CommandParam = {
    id: string;
    name: string;
    description: string;
    type: string;
    required: boolean;
};

export type DiscordCommand = {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    usageCount: number;
    params: CommandParam[];
    access: string[]; // list of role or user IDs
};

export default function CommandsPage() {
    const [commands, setCommands] = useState<DiscordCommand[]>([
        {
            id: "1",
            name: "ping",
            description: "Responds with pong",
            enabled: true,
            usageCount: 25,
            params: [],
            access: [],
        },
        {
            id: "2",
            name: "ban",
            description: "Ban a user",
            enabled: false,
            usageCount: 5,
            params: [
                { id: "p1", name: "user", description: "User to ban", type: "user", required: true },
                { id: "p2", name: "reason", description: "Reason", type: "string", required: false },
            ],
            access: ["admin"],
        },
    ]);

    const [editing, setEditing] = useState<DiscordCommand | null>(null);
    const [openForm, setOpenForm] = useState(false);

    function handleCreate() {
        setEditing(null);
        setOpenForm(true);
    }

    function handleEdit(cmd: DiscordCommand) {
        setEditing(cmd);
        setOpenForm(true);
    }

    function handleSave(command: DiscordCommand) {
        setCommands((prev) => {
            if (editing) {
                return prev.map((c) => (c.id === editing.id ? command : c));
            }
            return [...prev, { ...command, id: Date.now().toString() }];
        });
        setOpenForm(false);
    }

    function handleToggle(id: string, enabled: boolean) {
        setCommands((prev) =>
            prev.map((cmd) => (cmd.id === id ? { ...cmd, enabled } : cmd))
        );
    }

    function handleDelete(id: string) {
        if (!window.confirm("Delete this command?")) return;
        setCommands((prev) => prev.filter((cmd) => cmd.id !== id));
    }

    return (
        <div className="mp-layout">
            <Sidebars />
            <div className="commands-page">
                <div className="commands-header">
                    <h1>Bot Command Management</h1>
                    <button className="btn-primary" onClick={handleCreate}>
                        Create Command
                    </button>
                </div>

                <CommandTable
                    commands={commands}
                    onToggle={handleToggle}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />

                {openForm && (
                    <CommandForm
                        command={editing}
                        onSave={handleSave}
                        onCancel={() => setOpenForm(false)}
                    />
                )}
            </div>
        </div>
    );
}
