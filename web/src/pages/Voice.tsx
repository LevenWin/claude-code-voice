import React from "react";
import { TtsConfig } from "../api.ts";
import { PreviewButton } from "../components/PreviewButton.tsx";

const VOICES: Array<{ value: string; label: string; group: string }> = [
  // 通用
  { value: "zh_female_roumeinvyou_uranus_bigtts", label: "柔美女友（默认）", group: "通用" },
  { value: "zh_female_shuangkuaisisi_moon_bigtts", label: "爽快思思 / Skye",   group: "通用" },
  { value: "zh_male_wennuanahu_moon_bigtts",      label: "温暖阿虎 / Alvin",    group: "通用" },
  { value: "zh_male_yangguangqingnian_moon_bigtts", label: "阳光青年",          group: "通用" },
  { value: "zh_female_cancan_mars_bigtts",        label: "灿灿 / Shiny",        group: "通用" },
  { value: "zh_female_linjianvhai_moon_bigtts",   label: "邻家女孩",            group: "通用" },
  { value: "zh_male_linjiananhai_moon_bigtts",    label: "邻家男孩",            group: "通用" },
  { value: "zh_male_yuanboxiaoshu_moon_bigtts",   label: "渊博小叔",            group: "通用" },
  { value: "zh_female_kailangjiejie_moon_bigtts", label: "开朗姐姐",            group: "通用" },
  { value: "zh_female_tianmeixiaoyuan_moon_bigtts", label: "甜美小源",          group: "通用" },
  // 方言 / 口音
  { value: "zh_female_wanwanxiaohe_moon_bigtts",   label: "湾湾小何（台湾腔）", group: "方言" },
  { value: "zh_male_jingqiangkanye_moon_bigtts",   label: "京腔侃爷（北京）",   group: "方言" },
  { value: "zh_male_beijingxiaoye_moon_bigtts",    label: "北京小爷（北京）",   group: "方言" },
  { value: "zh_female_wanqudashu_moon_bigtts",     label: "湾区大叔（广东腔）", group: "方言" },
  { value: "zh_male_guozhoudege_moon_bigtts",      label: "广州德哥（粤味）",   group: "方言" },
  { value: "zh_female_daimengchuanmei_moon_bigtts", label: "呆萌川妹（四川）",  group: "方言" },
  { value: "zh_male_haoyuxiaoge_moon_bigtts",      label: "浩宇小哥（青岛）",   group: "方言" },
  { value: "zh_male_guangxiyuanzhou_moon_bigtts",  label: "广西远舟（广西）",   group: "方言" },
  { value: "zh_female_meitoujieer_moon_bigtts",    label: "妹抖洁儿（长沙）",   group: "方言" },
  { value: "zh_male_yuzhouzixuan_moon_bigtts",     label: "豫州子轩（河南）",   group: "方言" },
  // 角色
  { value: "zh_female_gaolengyujie_moon_bigtts",  label: "高冷御姐",            group: "角色" },
  { value: "zh_male_aojiaobazong_moon_bigtts",    label: "傲娇霸总",            group: "角色" },
  { value: "zh_female_meilinvyou_moon_bigtts",    label: "魅力女友",            group: "角色" },
  { value: "zh_male_shenyeboke_moon_bigtts",      label: "深夜博客",            group: "角色" },
  { value: "zh_female_sajiaonvyou_moon_bigtts",   label: "撒娇女友",            group: "角色" },
];

// Doubao speaker suffix → resource_id. Mismatch returns API error 55000000.
const VOICE_RESOURCE_MAP: Array<{ suffix: string; resourceId: string }> = [
  { suffix: "_uranus_bigtts", resourceId: "seed-tts-2.0" },
  { suffix: "_moon_bigtts",   resourceId: "volc.service_type.10029" },
  { suffix: "_mars_bigtts",   resourceId: "volc.service_type.10029" },
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
            {Array.from(new Set(VOICES.map((v) => v.group))).map((group) => (
              <optgroup key={group} label={group}>
                {VOICES.filter((v) => v.group === group).map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </optgroup>
            ))}
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
          <PreviewButton text="试听一下" doubao={config.doubao} />
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
