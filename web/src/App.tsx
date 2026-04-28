import React, { useEffect, useState } from "react";
import { getConfig, saveConfig, TtsConfig } from "./api.ts";
import { Credentials } from "./pages/Credentials.tsx";
import { Voice } from "./pages/Voice.tsx";
import { Events } from "./pages/Events.tsx";
import { Compression } from "./pages/Compression.tsx";
import { Install } from "./pages/Install.tsx";
import { Logs } from "./pages/Logs.tsx";
import { Toast, ToastMsg } from "./components/Toast.tsx";

type Tab = "credentials" | "voice" | "events" | "compression" | "install" | "logs";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "credentials", label: "凭据" },
  { id: "voice", label: "音色" },
  { id: "events", label: "事件" },
  { id: "compression", label: "GLM 压缩" },
  { id: "install", label: "安装" },
  { id: "logs", label: "日志" },
];

export function App() {
  const [tab, setTab] = useState<Tab>("credentials");
  const [config, setConfig] = useState<TtsConfig | null>(null);
  const [original, setOriginal] = useState<string>("");
  const [toast, setToast] = useState<ToastMsg>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getConfig().then(({ effective }) => {
      setConfig(effective);
      setOriginal(JSON.stringify(effective));
    });
  }, []);

  const dirty = config && JSON.stringify(config) !== original;

  async function save() {
    if (!config) return;
    setSaving(true);
    try {
      await saveConfig(config);
      setOriginal(JSON.stringify(config));
      setToast({ kind: "success", text: "配置已保存" });
    } catch (err: any) {
      setToast({ kind: "error", text: "保存失败: " + err.message });
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    if (!original) return;
    setConfig(JSON.parse(original));
  }

  const showToast = (text: string) => setToast({ kind: "success", text });

  if (!config) {
    return <div style={{ padding: 40 }}>加载中…</div>;
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>
          Claude Code Voice
          <span className="subtitle">语音播报配置</span>
        </h1>
        <ul className="nav">
          {TABS.map((t) => (
            <li key={t.id}>
              <button
                className={tab === t.id ? "active" : ""}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="main">
        {tab === "credentials" && <Credentials onSaved={showToast} />}
        {tab === "voice" && <Voice config={config} onChange={setConfig} />}
        {tab === "events" && <Events config={config} onChange={setConfig} />}
        {tab === "compression" && <Compression config={config} onChange={setConfig} />}
        {tab === "install" && <Install onSaved={showToast} />}
        {tab === "logs" && <Logs />}
      </main>

      {dirty && (
        <div className="dirty-bar">
          <span style={{ color: "var(--text-dim)" }}>有未保存的更改</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn secondary" onClick={discard} disabled={saving}>放弃</button>
            <button className="btn" onClick={save} disabled={saving}>
              {saving ? "保存中…" : "保存配置"}
            </button>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
