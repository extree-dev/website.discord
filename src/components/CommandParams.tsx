import React from "react";
import { CommandParam } from "../pages/CommandsPage.js";
import GlassSelect from "./GlassSelect.js";
import { FiTrash2 } from "react-icons/fi";
import styles from "../styles/components/CommandParams.module.scss";

type Props = {
    params: CommandParam[];
    onChange: (params: CommandParam[]) => void;
    onSelectOpenChange?: (open: boolean) => void;
};

export default function CommandParams({ params, onChange, onSelectOpenChange }: Props) {
    function addParam() {
        onChange([
            ...params,
            { id: Date.now().toString(), name: "", description: "", type: "string", required: false }
        ]);
    }

    function updateParam(id: string, key: keyof CommandParam, value: any) {
        onChange(params.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
    }

    function removeParam(id: string) {
        onChange(params.filter((p) => p.id !== id));
    }

    return (
        <div className={styles.wrapper}>
            <h3 className={styles.title}>Command Parameters</h3>
            {params.map((p) => (
                <div key={p.id} className={styles.paramItem}>
                    <input
                        className={styles.input}
                        placeholder="Name"
                        value={p.name}
                        onChange={(e) => updateParam(p.id, "name", e.target.value)}
                    />
                    <input
                        className={styles.input}
                        placeholder="Description"
                        value={p.description}
                        onChange={(e) => updateParam(p.id, "description", e.target.value)}
                    />

                    <div className={styles.selectWrapper}>
                        <GlassSelect
                            value={p.type}
                            onChange={(val) => updateParam(p.id, "type", val)}
                            options={[
                                { value: "string", label: "String" },
                                { value: "integer", label: "Integer" },
                                { value: "boolean", label: "Boolean" },
                                { value: "user", label: "User" },
                                { value: "channel", label: "Channel" },
                                { value: "role", label: "Role" }
                            ]}
                            onOpenChange={onSelectOpenChange}
                        />
                    </div>

                    <button
                        className={styles.deleteBtn}
                        onClick={() => removeParam(p.id)}
                        title="Delete parameter"
                    >
                        <FiTrash2 />
                    </button>
                </div>
            ))}
            <button onClick={addParam} className={styles.addBtn}>
                Add parameter
            </button>
        </div>
    );
}
