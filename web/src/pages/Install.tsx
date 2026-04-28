import React, { useEffect, useState } from "react";
import { getInstallStatus, install, uninstall, InstallStatus } from "../api.ts";

export function Install({ onSaved }: { onSaved: (msg: string) => void }) {
  const [status, setStatus] = useState<InstallStatus | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setStatus(await getInstallStatus());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function doInstall() {
    setBusy(true);
    try {
      await install();
      await refresh();
      onSaved("已安装到 ~/.claude/，hooks 已合并到 settings.json");
    } finally {
      setBusy(false);
    }
  }

  async function doUninstall(removeScripts: boolean) {
    if (!confirm(removeScripts
      ? "卸载并删除 ~/.claude/scripts/ 下所有 tts-* 脚本？"
      : "从 settings.json 移除 hooks（保留脚本文件）？"
    )) return;
    setBusy(true);
    try {
      await uninstall(removeScripts);
      await refresh();
      onSaved(removeScripts ? "已完全卸载" : "已移除 hooks");
    } finally {
      setBusy(false);
    }
  }

  if (!status) return <div>加载中…</div>;

  const allScriptsInstalled = Object.values(status.scripts).every(Boolean);
  const anyHookInstalled = status.hookEvents.length > 0;

  return (
    <div>
      <h2>安装到 Claude Code</h2>
      <p className="lead">把脚本拷到 <code>~/.claude/scripts/</code>，把 hooks 合并到 <code>~/.claude/settings.json</code>。</p>

      <div className="card">
        <h3>当前状态</h3>
        <div className="row">
          <label>脚本</label>
          <span className={`status-pill ${allScriptsInstalled ? "ok" : "warn"}`}>
            {allScriptsInstalled ? "全部已安装" : `${Object.values(status.scripts).filter(Boolean).length} / ${Object.keys(status.scripts).length} 已安装`}
          </span>
        </div>
        <div className="row">
          <label>Hooks</label>
          <span className={`status-pill ${anyHookInstalled ? "ok" : "warn"}`}>
            {anyHookInstalled ? `${status.hookEvents.length} 个事件已绑定` : "未绑定"}
          </span>
          {anyHookInstalled && (
            <span style={{ color: "var(--text-dim)", fontSize: 12, fontFamily: "var(--mono)" }}>
              {status.hookEvents.join(", ")}
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <h3>操作</h3>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="btn" onClick={doInstall} disabled={busy}>
            {busy ? "处理中…" : (allScriptsInstalled && anyHookInstalled ? "重新安装" : "应用到 Claude Code")}
          </button>
          {anyHookInstalled && (
            <button className="btn secondary" onClick={() => doUninstall(false)} disabled={busy}>
              仅移除 Hooks
            </button>
          )}
          {allScriptsInstalled && (
            <button className="btn danger" onClick={() => doUninstall(true)} disabled={busy}>
              完全卸载
            </button>
          )}
        </div>
        <p className="desc" style={{ marginTop: 12 }}>
          安装后，下次启动 Claude Code（或运行 <code>/reload</code>）就会触发播报。
          你修改了配置（如音色、短语）后，<strong>不需要重新安装</strong>——脚本会读最新的 <code>tts-config.json</code>。
        </p>
      </div>
    </div>
  );
}
