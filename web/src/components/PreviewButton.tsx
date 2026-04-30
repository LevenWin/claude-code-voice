import React, { useState } from "react";
import { preview, TtsConfig } from "../api.ts";

const VOICE_RESOURCE_MAP: Array<{ suffix: string; resourceId: string }> = [
  { suffix: "_uranus_bigtts", resourceId: "seed-tts-2.0" },
  { suffix: "_moon_bigtts",   resourceId: "volc.service_type.10029" },
  { suffix: "_mars_bigtts",   resourceId: "volc.service_type.10029" },
];

function normalizeResourceId(d: Partial<TtsConfig["doubao"]>): Partial<TtsConfig["doubao"]> {
  if (!d?.voice) return d;
  for (const { suffix, resourceId } of VOICE_RESOURCE_MAP) {
    if (d.voice.endsWith(suffix) && d.resource_id !== resourceId) {
      return { ...d, resource_id: resourceId };
    }
  }
  return d;
}

export function PreviewButton({ text, disabled, doubao }: {
  text: string;
  disabled?: boolean;
  doubao?: Partial<TtsConfig["doubao"]>;
}) {
  const [loading, setLoading] = useState(false);

  async function play() {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const blob = await preview(text.trim(), doubao ? normalizeResourceId(doubao) : undefined);
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
