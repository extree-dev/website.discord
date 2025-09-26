import React from "react";

export function Badge({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${className}`}>
      {children}
    </span>
  );
}
