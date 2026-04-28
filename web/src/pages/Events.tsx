import React from "react";
import { TtsConfig, EventConfig } from "../api.ts";
import { Toggle } from "../components/Toggle.tsx";
import { PreviewButton } from "../components/PreviewButton.tsx";

const EVENT_LABELS: Record<string, { label: string; desc: string }> = {
  stop:            { label: "回合结束 (Stop)",          desc: "Claude 完成一轮回复后" },
  notification:    { label: "需要授权 (Notification)",  desc: "权限请求弹出时" },
  "stop-failure":  { label: "出错 (StopFailure)",       desc: "Claude 回合中出错" },
  "session-start": { label: "开始会话 (SessionStart)",  desc: "进入项目目录启动" },
  "session-end":   { label: "结束会话 (SessionEnd)",    desc: "退出 Claude Code" },
  "subagent-stop": { label: "子代理完成 (SubagentStop)", desc: "Agent 子任务返回" },
  "task-completed":{ label: "任务完成 (TaskCompleted)", desc: "TaskCreate 项标记完成" },
  "pre-compact":   { label: "压缩前 (PreCompact)",      desc: "上下文将被压缩前" },
  "worktree-create":{label: "Worktree 创建",            desc: "git worktree 准备好" },
};

export function Events({ config, onChange }: {
  config: TtsConfig;
  onChange: (next: TtsConfig) => void;
}) {
  const update = (key: string, patch: Partial<EventConfig>) => {
    const events = { ...config.events, [key]: { ...config.events[key], ...patch } as EventConfig };
    onChange({ ...config, events });
  };

  return (
    <div>
      <h2>事件 & 短语</h2>
      <p className="lead">每个事件可独立开关，并自定义播报短语。</p>

      <div className="card">
        <h3>Stop 模式</h3>
        <p className="desc">回合结束时播什么？</p>
        <div className="row">
          <label>模式</label>
          <select
            value={config.events.stop?.mode ?? "fixed-phrase"}
            onChange={(e) => update("stop", { mode: e.target.value as EventConfig["mode"] })}
          >
            <option value="fixed-phrase">固定短语（缓存，零延迟）</option>
            <option value="speak-last-message">朗读最后回复（GLM 压缩）</option>
          </select>
        </div>
      </div>

      <div className="card">
        {Object.keys(EVENT_LABELS).map((key) => {
          const evt = config.events[key] ?? { enabled: false, phrase: "" };
          const meta = EVENT_LABELS[key];
          const showPhrase = key !== "stop" || (evt.mode ?? "fixed-phrase") === "fixed-phrase";
          return (
            <div key={key} className={`event-row ${evt.enabled ? "" : "disabled"}`}>
              <Toggle
                checked={evt.enabled}
                onChange={(v) => update(key, { enabled: v })}
              />
              <div className="label">
                {meta.label}
                <span className="key">{meta.desc}</span>
              </div>
              {showPhrase ? (
                <input
                  type="text"
                  value={evt.phrase ?? ""}
                  disabled={!evt.enabled}
                  onChange={(e) => update(key, { phrase: e.target.value })}
                  placeholder="播报短语"
                />
              ) : (
                <span style={{ color: "var(--text-dim)", fontSize: 12 }}>
                  朗读最后回复（无固定短语）
                </span>
              )}
              {showPhrase ? (
                <PreviewButton text={evt.phrase ?? ""} disabled={!evt.enabled} />
              ) : <span />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
