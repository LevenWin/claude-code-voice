import React, { useState } from "react";
import { preview } from "../api.ts";

export function PreviewButton({ text, disabled }: { text: string; disabled?: boolean }) {
  const [loading, setLoading] = useState(false);

  async function play() {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const blob = await preview(text.trim());
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (err: any) {
      alert("试听失败: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className="btn small secondary"
      onClick={play}
      disabled={disabled || loading || !text.trim()}
      title="试听"
    >
      {loading ? "..." : "▶ 试听"}
    </button>
  );
}
