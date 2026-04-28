import React from "react";
import { TtsConfig } from "../api.ts";
import { PreviewButton } from "../components/PreviewButton.tsx";

const VOICES: Array<{ value: string; label: string }> = [
  { value: "zh_female_roumeinvyou_uranus_bigtts", label: "柔美女友（中文，默认）" },
  { value: "zh_female_wanwanxiaohe_moon_bigtts", label: "湾湾小何（中文台湾）" },
  { value: "zh_male_wennuanahu_moon_bigtts", label: "温暖阿虎（中文男声）" },
  { value: "zh_male_yangguangqingnian_moon_bigtts", label: "阳光青年（中文男声）" },
  { value: "zh_female_shuangkuaisisi_moon_bigtts", label: "爽快思思（中文女声）" },
];

// Doubao speaker suffix → resource_id. Mismatch returns API error 55000000.
const VOICE_RESOURCE_MAP: Array<{ suffix: string; resourceId: string }> = [
  { suffix: "_uranus_bigtts", resourceId: "seed-tts-2.0" },
  { suffix: "_moon_bigtts", resourceId: "volc.service_type.10029" },
];

function resourceIdForVoice(voice: string): string | null {
  for (const { suffix, resourceId } of VOICE_RESOURCE_MAP) {
    if (voice.endsWith(suffix)) return resourceId;
  }
  return null;
}

export function Voice({ config, onChange }: {
  config: TtsConfig;
  onChange: (next: TtsConfig) => void;
}) {
  const update = (patch: Partial<TtsConfig["doubao"]>) => {
    const next = { ...config.doubao, ...patch };
    if (patch.voice !== undefined && patch.resource_id === undefined) {
      const expected = resourceIdForVoice(patch.voice);
      if (expected) next.resource_id = expected;
    }
    onChange({ ...config, doubao: next });
  };

  const expectedResourceId = resourceIdForVoice(config.doubao.voice);
  const resourceMismatch = expectedResourceId !== null
    && expectedResourceId !== config.doubao.resource_id;

  return (
    <div>
      <h2>音色与语速</h2>
      <p className="lead">选一个豆包音色。语速 -50 到 +100，0 为正常，20 约为 1.2 倍速。</p>

      <div className="card">
        <div className="row">
          <label>音色</label>
          <select value={config.doubao.voice} onChange={(e) => update({ voice: e.target.value })}>
            {VOICES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            {!VOICES.find((v) => v.value === config.doubao.voice) && (
              <option value={config.doubao.voice}>{config.doubao.voice}（自定义）</option>
            )}
          </select>
        </div>
        <div className="row">
          <label>自定义音色 ID</label>
          <input
            type="text"
            value={config.doubao.voice}
            onChange={(e) => update({ voice: e.target.value })}
            placeholder="zh_female_xxx_bigtts"
          />
        </div>
        <div className="row">
          <label>语速 ({config.doubao.speech_rate})</label>
          <input
            type="range"
            min={-50}
            max={100}
            value={config.doubao.speech_rate}
            onChange={(e) => update({ speech_rate: Number(e.target.value) })}
          />
          <span style={{ width: 60, textAlign: "right", color: "var(--text-dim)" }}>
            {(1 + config.doubao.speech_rate / 100).toFixed(2)}x
          </span>
        </div>
        <div className="row between">
          <span style={{ color: "var(--text-dim)", fontSize: 13 }}>
            ⏵ 用当前设置试听一句
          </span>
          <PreviewButton text="试听一下" />
        </div>
      </div>

      <div className="card">
        <h3>豆包高级</h3>
        <div className="row">
          <label>Resource ID</label>
          <input
            type="text"
            value={config.doubao.resource_id}
            onChange={(e) => update({ resource_id: e.target.value })}
          />
        </div>
        {resourceMismatch && (
          <div style={{ color: "#d97706", fontSize: 12, marginTop: -4 }}>
            ⚠ 当前音色推荐 Resource ID：<code>{expectedResourceId}</code>。不匹配会返回错误码 55000000（resource ID is mismatched with speaker）。
          </div>
        )}
        <div className="row">
          <label>Endpoint</label>
          <input
            type="text"
            value={config.doubao.endpoint}
            onChange={(e) => update({ endpoint: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
