import React from "react";
import "../components/CSS/CommandAccess.css";
import { FiTrash2, FiPlus } from "react-icons/fi";

type Props = {
    access: string[];
    onChange: (access: string[]) => void;
};

export default function CommandAccess({ access, onChange, className = "" }: Props & { className?: string }) {
    function addAccess() {
        const role = prompt("Enter the Role ID or User ID:");
        if (role) onChange([...access, role]);
    }

    function removeAccess(role: string) {
        onChange(access.filter((a) => a !== role));
    }

    return (
        <div className={`command-access ${className}`}>
            <h3>Command Access</h3>
            {access.length === 0 && <p>Access is open to everyone</p>}
            <div className="command-access-list">
                {access.map((a) => (
                    <div className="command-access-item" key={a}>
                        <span>{a}</span>
                        <button onClick={() => removeAccess(a)} title="Remove access">
                            <FiTrash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>

            <button className="command-access-add-btn" onClick={addAccess}>
                Add Access
            </button>
        </div>
    );
}
