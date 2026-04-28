# 豆包 TTS 凭据申请

豆包（火山引擎语音合成）是默认的 TTS 提供商，用 v3 单向 HTTP 接口。

## 步骤

1. 注册并登录 [火山引擎控制台](https://console.volcengine.com/)
2. 进入 [语音合成大模型](https://console.volcengine.com/speech/service/8)
3. 开通 **大模型语音合成 (Seed TTS)** 服务（首次需实名认证；新用户有免费额度）
4. 在服务页面找到：
   - **App ID**（一串数字）
   - **Access Token**（一串字母数字混合的密钥）
5. 把这两个值填到 Claude Code Voice 的 **凭据** 标签页

## 音色

默认音色 `zh_female_roumeinvyou_uranus_bigtts`（柔美女友）。
所有可用音色见 [音色列表](https://www.volcengine.com/docs/6561/97465)。
在 **音色** 标签页可以下拉选择，或直接填自定义 ID。

## 计费

按字符数计费，默认音色每千字符约几分钱。
固定短语（"老公，我做完啦" 等）合成一次后会缓存到 `~/.claude/cache/`，永久复用——所以日常成本几乎为零。

只有 Stop 模式选 "朗读最后回复" 时，每次都要新合成（先 GLM 压缩再 TTS）。
