import React, { useEffect, useState } from "react";
import { getCredentialsStatus, saveCredentials, CredentialsStatus } from "../api.ts";

export function Credentials({ onSaved }: { onSaved: (msg: string) => void }) {
  const [status, setStatus] = useState<CredentialsStatus | null>(null);
  const [appId, setAppId] = useState("");
  const [token, setToken] = useState("");
  const [glmKey, setGlmKey] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCredentialsStatus().then(setStatus);
  }, []);

  async function save() {
    setSaving(true);
    try {
      await saveCredentials({
        ...(appId && { doubaoAppId: appId }),
        ...(token && { doubaoToken: token }),
        ...(glmKey && { glmKey }),
      });
      const fresh = await getCredentialsStatus();
      setStatus(fresh);
      setAppId(""); setToken(""); setGlmKey("");
      onSaved("凭据已保存到 ~/.claude/scripts/");
    } finally {
      setSaving(false);
    }
  }

  const pill = (ok: boolean) =>
    <span className={`status-pill ${ok ? "ok" : "warn"}`}>{ok ? "已配置" : "未配置"}</span>;

  return (
    <div>
      <h2>凭据</h2>
      <p className="lead">填一次就好，存到 <code>~/.claude/scripts/</code> 下，权限 600。已存在的字段留空即不修改。</p>

      <div className="card">
        <h3>豆包 TTS（必需） {status && (
          <span style={{ marginLeft: 8 }}>
            {pill(status.doubaoAppId && status.doubaoToken)}
          </span>
        )}</h3>
        <p className="desc">
          用于把文本合成为语音。
          <a className="help-link" href="https://www.volcengine.com/docs/6561/79817" target="_blank" rel="noreferrer">
            申请步骤 →
          </a>
        </p>
        <div className="row">
          <label>App ID</label>
          <input
            type="text"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            placeholder={status?.doubaoAppId ? "已配置（留空保持不变）" : "X-Api-App-Id"}
          />
        </div>
        <div className="row">
          <label>Access Token</label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={status?.doubaoToken ? "已配置（留空保持不变）" : "X-Api-Access-Key"}
          />
        </div>
      </div>

      <div className="card">
        <h3>智谱 GLM（可选） {status && (
          <span style={{ marginLeft: 8 }}>{pill(status.glmKey)}</span>
        )}</h3>
        <p className="desc">
          用于把 Claude 的长回复压缩为播报句。不填则跳过压缩，按字数硬截断。
          <a className="help-link" href="https://open.bigmodel.cn/usercenter/apikeys" target="_blank" rel="noreferrer">
            申请 API Key →
          </a>
        </p>
        <div className="row">
          <label>API Key</label>
          <input
            type="password"
            value={glmKey}
            onChange={(e) => setGlmKey(e.target.value)}
            placeholder={status?.glmKey ? "已配置（留空保持不变）" : "Bearer key"}
          />
        </div>
      </div>

      <button
        className="btn"
        onClick={save}
        disabled={saving || (!appId && !token && !glmKey)}
      >
        {saving ? "保存中…" : "保存凭据"}
      </button>
    </div>
  );
}
