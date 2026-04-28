# Claude Code Voice

> 给 Claude Code 加上中文语音播报，全程通过本地 Web UI 配置。

Claude 跑完一轮、需要授权、出错了——你正盯着别的窗口写代码？让它**说出来**。

- 🎙️ **豆包 TTS** 高质量中文语音合成（多种音色可选）
- 🤖 **GLM-4 Flash** 把长回复压缩成口播句（可选，免费档够用）
- 🎛️ **本地 Web UI** 改音色、改短语、试听、一键安装到 `~/.claude/`
- 🔌 接入 Claude Code 的 10 个 hook（Stop / Notification / SessionStart / TaskCompleted / …）
- 🔐 凭据存本地 600 权限文件，从不上传

> 当前仅支持 **macOS**（依赖 `afplay`）。

---

## 30 秒上手

```bash
npx github:LevenWin/claude-code-voice
```

浏览器自动打开 `http://127.0.0.1:7654`：

1. **凭据** 标签页填豆包 App ID / Token（必需）和 GLM API Key（可选）
2. **音色** 试听几句，选个喜欢的
3. **事件** 决定哪些时刻播报、说什么话
4. **安装** 点 "应用到 Claude Code"，下次启动 Claude Code 即生效

> 修改音色/短语后**不需要重新安装**——脚本会自动读最新配置。

## 申请凭据

| 服务 | 用途 | 申请入口 |
|------|------|----------|
| 豆包 TTS | 文本转语音（必需） | [火山方舟控制台 → 大模型语音合成](https://console.volcengine.com/speech/service/8) |
| 智谱 GLM | 长文压缩为播报句（可选） | [智谱 AI 开放平台](https://open.bigmodel.cn/usercenter/apikeys) |

详细步骤见 [docs/doubao-setup.md](docs/doubao-setup.md) 和 [docs/glm-setup.md](docs/glm-setup.md)。

## 默认事件

只有 **Stop**（回合结束）和 **Notification**（请求授权）默认开启。其他事件（出错、子代理完成、会话开始/结束、压缩前、Worktree 创建等）默认关，按需在 Web UI 里打开。

每个事件都有独立的播报短语：

| 事件 | 默认短语 |
|------|----------|
| Stop | 老公，我做完啦 |
| Notification | 老公，需要你授权哦 |
| StopFailure | 老公，出错啦 |
| SessionStart | 老公，开工啦 |

短语自由改。也可以把 Stop 切到"朗读最后回复"模式，由 GLM 自动压缩。

## 配置文件位置

| 文件 | 说明 |
|------|------|
| `~/.claude/scripts/tts-config.json` | 你的配置（Web UI 写入） |
| `~/.claude/scripts/tts-*.sh` | 9 个 bash 脚本（安装时拷贝） |
| `~/.claude/scripts/.doubao-appid` / `.doubao-token` / `.glm-key` | 凭据，权限 600 |
| `~/.claude/settings.json` | hooks 段被合并（保留你已有的其他 hook） |
| `/tmp/claude-tts.log` | 运行日志，Web UI "日志" 标签页实时查看 |

## 卸载

Web UI → **安装** 标签 → "完全卸载"。或手动：

```bash
rm -rf ~/.claude/scripts/tts-* ~/.claude/scripts/.doubao-* ~/.claude/scripts/.glm-key
# 再编辑 ~/.claude/settings.json，移除 hooks 段里 command 含 "tts-" 的条目
```

## 本地开发

```bash
git clone https://github.com/LevenWin/claude-code-voice
cd claude-code-voice
npm install
npm run dev          # Vite + Express，端口 5173
# 或
npm start            # 构建后用 7654 启动
```

## 故障排查

听不到声音？

1. **日志** 标签页有没有 `[tts ok]` 行？没有就是合成失败——检查凭据
2. 命令行试试：`afplay ~/.claude/cache/tts-stop-*.mp3` 能不能播
3. 确认 `jq`、`python3` 已装：`brew install jq` / Python 3.7+
4. settings.json 里 hooks 是否真的写入：`jq '.hooks' ~/.claude/settings.json`
5. Claude Code 是否需要重启读取新 settings？退出再进试试

## License

MIT © [LevenWin](https://github.com/LevenWin)
