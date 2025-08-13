import React from "react";
import { CommandParam } from "../pages/CommandsPage";
import '../components/CSS/CommandParamsSelect.css';
import GlassSelect from "./GlassSelect";
import { FiTrash2, FiPlus } from "react-icons/fi";

type Props = {
    params: CommandParam[];
    onChange: (params: CommandParam[]) => void;
};

export default function CommandParams({ params, onChange }: Props) {
    function addParam() {
        onChange([...params, { id: Date.now().toString(), name: "", description: "", type: "string", required: false }]);
    }

    function updateParam(id: string, key: keyof CommandParam, value: any) {
        onChange(params.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
    }

    function removeParam(id: string) {
        onChange(params.filter((p) => p.id !== id));
    }

    return (
        <div>
            <h3>Command Parameters</h3>
            {params.map((p) => (
                <div key={p.id} className="param-item">
                    <input
                        placeholder="Name"
                        value={p.name}
                        onChange={(e) => updateParam(p.id, "name", e.target.value)}
                    />
                    <input
                        placeholder="Description"
                        value={p.description}
                        onChange={(e) => updateParam(p.id, "description", e.target.value)}
                    />
                    <div className="command-param-select-wrapper">
                        <GlassSelect
                            value={p.type}
                            onChange={(val) => updateParam(p.id, "type", val)}
                            options={[
                                { value: "string", label: "String" },
                                { value: "integer", label: "Integer" },
                                { value: "boolean", label: "Boolean" },
                                { value: "user", label: "User" },
                                { value: "channel", label: "Channel" },
                                { value: "role", label: "Role" },
                            ]}
                        />
                    </div>
                    <button
                        className="param-delete-btn"
                        onClick={() => removeParam(p.id)}
                        title="Delete parameter"
                    >
                        <FiTrash2 size={18} />
                    </button>
                </div>
            ))}
            <button onClick={addParam} className="param-add-btn">
                <FiPlus size={18} /> Add parameter
            </button>
        </div>
    );
}
