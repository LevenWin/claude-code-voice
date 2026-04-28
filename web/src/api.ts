export type EventConfig = {
  enabled: boolean;
  phrase?: string;
  mode?: "fixed-phrase" | "speak-last-message";
};

export type TtsConfig = {
  doubao: {
    voice: string;
    speech_rate: number;
    resource_id: string;
    endpoint: string;
  };
  glm: {
    enabled: boolean;
    model: string;
    summary_threshold: number;
    max_chars: number;
    fallback_chars: number;
    timeout: number;
    endpoint: string;
  };
  events: Record<string, EventConfig>;
};

export type CredentialsStatus = {
  doubaoAppId: boolean;
  doubaoToken: boolean;
  glmKey: boolean;
};

export type InstallStatus = {
  scripts: Record<string, boolean>;
  settingsExists: boolean;
  hookEvents: string[];
};

async function http<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getConfig(): Promise<{
  defaults: TtsConfig;
  user: TtsConfig | null;
  effective: TtsConfig;
}> {
  return http("/api/config");
}

export async function saveConfig(config: TtsConfig): Promise<void> {
  await http("/api/config", { method: "PUT", body: JSON.stringify(config) });
}

export async function getCredentialsStatus(): Promise<CredentialsStatus> {
  return http("/api/credentials/status");
}

export async function saveCredentials(creds: Partial<{
  doubaoAppId: string;
  doubaoToken: string;
  glmKey: string;
}>): Promise<void> {
  await http("/api/credentials", { method: "PUT", body: JSON.stringify(creds) });
}

export async function getInstallStatus(): Promise<InstallStatus> {
  return http("/api/install/status");
}

export async function install(): Promise<unknown> {
  return http("/api/install", { method: "POST", body: "{}" });
}

export async function uninstall(removeScripts = false): Promise<unknown> {
  return http("/api/install/uninstall", {
    method: "POST",
    body: JSON.stringify({ removeScripts }),
  });
}

export async function preview(text: string): Promise<Blob> {
  const res = await fetch("/api/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return res.blob();
}

export async function clearLogs(): Promise<void> {
  await http("/api/logs", { method: "DELETE" });
}
