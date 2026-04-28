import React, { useEffect } from "react";

export type ToastMsg = { kind: "info" | "success" | "error"; text: string } | null;

export function Toast({ toast, onClose }: { toast: ToastMsg; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  return <div className={`toast ${toast.kind}`}>{toast.text}</div>;
}
