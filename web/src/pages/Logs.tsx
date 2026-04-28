import React, { useEffect, useRef, useState } from "react";
import { clearLogs } from "../api.ts";

export function Logs() {
  const [lines, setLines] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource("/api/logs/stream");
    es.onmessage = (e) => {
      setLines((prev) => {
        const next = [...prev, e.data];
        return next.length > 500 ? next.slice(-500) : next;
      });
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);

  function classify(line: string): string {
    if (/fail|error|skip/i.test(line)) return "warn";
    return "";
  }

  async function clear() {
    await clearLogs();
    setLines([]);
  }

  return (
    <div>
      <h2>日志</h2>
      <p className="lead">实时跟随 <code>/tmp/claude-tts.log</code>。最多保留 500 行。</p>

      <div className="card">
        <div className="row between">
          <span style={{ color: "var(--text-dim)", fontSize: 12 }}>{lines.length} 行</span>
          <button className="btn small secondary" onClick={clear}>清空</button>
        </div>
        <div ref={ref} className="log-panel">
          {lines.length === 0 ? (
            <p className="line" style={{ color: "var(--text-dim)" }}>等待日志…</p>
          ) : (
            lines.map((l, i) => (
              <p key={i} className={`line ${classify(l)}`}>{l}</p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
