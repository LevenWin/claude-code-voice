import React from "react";
import { TtsConfig } from "../api.ts";
import { Toggle } from "../components/Toggle.tsx";

export function Compression({ config, onChange }: {
  config: TtsConfig;
  onChange: (next: TtsConfig) => void;
}) {
  const update = (patch: Partial<TtsConfig["glm"]>) => {
    onChange({ ...config, glm: { ...config.glm, ...patch } });
  };

  return (
    <div>
      <h2>GLM 压缩</h2>
      <p className="lead">
        长回复直接朗读会很啰嗦。开启后，超过阈值的文本会先送给 GLM 压缩成播报句，再合成。
        失败时回退到硬截断。
      </p>

      <div className="card">
        <div className="row">
          <label>启用压缩</label>
          <Toggle checked={config.glm.enabled} onChange={(v) => update({ enabled: v })} />
        </div>
        <div className="row">
          <label>模型</label>
          <select value={config.glm.model} onChange={(e) => update({ model: e.target.value })}>
            <option value="glm-4-flash">glm-4-flash（快，免费）</option>
            <option value="glm-4-air">glm-4-air</option>
            <option value="glm-4-plus">glm-4-plus</option>
          </select>
        </div>
        <div className="row">
          <label>压缩阈值（字数）</label>
          <input
            type="number"
            min={20}
            max={1000}
            value={config.glm.summary_threshold}
            onChange={(e) => update({ summary_threshold: Number(e.target.value) })}
          />
          <span style={{ color: "var(--text-dim)", fontSize: 12 }}>低于此字数不压缩，直接念</span>
        </div>
        <div className="row">
          <label>原文最大字数</label>
          <input
            type="number"
            min={100}
            max={2000}
            value={config.glm.max_chars}
            onChange={(e) => update({ max_chars: Number(e.target.value) })}
          />
          <span style={{ color: "var(--text-dim)", fontSize: 12 }}>超过此长度先截断再送 GLM</span>
        </div>
        <div className="row">
          <label>回退字数</label>
          <input
            type="number"
            min={50}
            max={500}
            value={config.glm.fallback_chars}
            onChange={(e) => update({ fallback_chars: Number(e.target.value) })}
          />
          <span style={{ color: "var(--text-dim)", fontSize: 12 }}>GLM 失败时硬截断到多少字</span>
        </div>
        <div className="row">
          <label>请求超时（秒）</label>
          <input
            type="number"
            min={1}
            max={30}
            value={config.glm.timeout}
            onChange={(e) => update({ timeout: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}
