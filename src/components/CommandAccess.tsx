import React from "react";
import styles from "./CommandAccess.module.scss";
import { FiTrash2 } from "react-icons/fi";

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
        <div className={`${styles.container} ${className}`}>
            <h3 className={styles.header}>Command Access</h3>
            {access.length === 0 && <p className={styles.emptyMessage}>Access is open to everyone</p>}
            <div className={styles.list}>
                {access.map((a) => (
                    <div className={styles.item} key={a}>
                        <span className={styles.idText}>{a}</span>
                        <button 
                            className={styles.removeButton} 
                            onClick={() => removeAccess(a)} 
                            title="Remove access"
                        >
                            <FiTrash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>

            <button className={styles.addButton} onClick={addAccess}>
                Add Access
            </button>
        </div>
    );
}