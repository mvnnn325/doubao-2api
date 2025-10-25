# 🚀 doubao-2api - Deno 真·单文件版本

> **完全自包含的单文件解决方案 - 无需任何外部配置文件！**

一个将 **doubao.com** 转换为 **OpenAI 兼容 API** 的高性能代理服务，使用 Deno 运行时，**真正的单文件架构**，配置直接在代码中修改。

---

## ✨ 特性

- ✅ **真·单文件**：所有配置和代码都在一个 TypeScript 文件中
- ✅ **零外部依赖**：无需 `.env` 文件或任何配置文件
- ✅ **开箱即用**：修改文件顶部的配置，一条命令启动
- ✅ **OpenAI 兼容**：完全兼容 OpenAI Chat Completions API 格式
- ✅ **流式 & 非流式**：支持 SSE 流式响应和传统的非流式响应
- ✅ **a_bogus 签名**：内置 Playwright 自动生成反爬虫签名
- ✅ **多账号轮询**：支持配置多个豆包账号，自动轮询使用
- ✅ **会话管理**：自动维护对话上下文，支持 TTL 缓存
- ✅ **Bearer Token 认证**：可选的 API Key 保护

---

## 📦 快速开始

### 1. 安装 Deno

```bash
# Linux / macOS
curl -fsSL https://deno.land/install.sh | sh

# macOS (Homebrew)
brew install deno

# Windows (PowerShell)
irm https://deno.land/install.ps1 | iex
```

### 2. 下载 main.ts 文件

```bash
# 使用 wget
wget https://your-domain.com/main.ts

# 或使用 curl
curl -O https://your-domain.com/main.ts
```

### 3. 配置（在文件顶部修改）

用任何文本编辑器打开 `main.ts`，找到顶部的配置区域（第 20-72 行）：

```typescript
const CONFIG = {
  // --- 核心安全配置 ---
  API_MASTER_KEY: "sk-doubao-2api-your-secret-key-please-change-me",
  
  // --- 部署配置 ---
  PORT: 8088,
  
  // --- 豆包凭证 (必须配置) ---
  DOUBAO_COOKIES: [
    "在此处粘贴您从浏览器获取的完整 Cookie 字符串",
    // 可以添加更多账号
  ],
  
  // --- 静态设备指纹 (必须配置) ---
  DOUBAO_DEVICE_ID: "7524726744148264511",
  DOUBAO_FP: "verify_xxx",
  DOUBAO_TEA_UUID: "7524726753203160619",
  DOUBAO_WEB_ID: "7524726753203160619",
  
  // ... 其他可选配置
};
```

#### 🍪 获取 Cookie 和设备指纹的步骤：

1. **登录豆包**：访问 [https://www.doubao.com/chat/](https://www.doubao.com/chat/)
2. **打开开发者工具**：按 `F12`
3. **切换到网络面板**：点击 "Network" (网络)
4. **发送测试消息**：在豆包界面发送一条消息
5. **找到 completion 请求**：在请求列表中找到 `completion` 请求，点击它
6. **复制 Cookie**：
   - 在右侧面板的 "Headers" 标签下
   - 找到 `Cookie:` 字段
   - 复制完整的 Cookie 值
7. **复制设备指纹**：
   - 在同一请求的 "Payload" 或 "Query String Parameters" 标签下
   - 找到并复制：`device_id`, `fp`, `tea_uuid`, `web_id`

### 4. 运行服务

```bash
deno run --allow-net --allow-read main.ts
```

就这么简单！服务将在 `http://localhost:8088` 上启动。

---

## 🎯 使用示例

### 基础测试

```bash
# 健康检查
curl http://localhost:8088/

# 获取模型列表
curl http://localhost:8088/v1/models \
  -H "Authorization: Bearer sk-doubao-2api-your-secret-key-please-change-me"

# 聊天补全（流式）
curl http://localhost:8088/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-doubao-2api-your-secret-key-please-change-me" \
  -d '{
    "model": "doubao-pro-chat",
    "messages": [{"role": "user", "content": "你好"}],
    "stream": true
  }'
```

### 使用 Python OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8088/v1",
    api_key="sk-doubao-2api-your-secret-key-please-change-me"
)

response = client.chat.completions.create(
    model="doubao-pro-chat",
    messages=[{"role": "user", "content": "你好"}],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

### 使用 Node.js OpenAI SDK

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:8088/v1',
  apiKey: 'sk-doubao-2api-your-secret-key-please-change-me',
});

const stream = await client.chat.completions.create({
  model: 'doubao-pro-chat',
  messages: [{ role: 'user', content: '你好' }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

---

## ⚙️ 配置说明

### 必须配置的项

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `DOUBAO_COOKIES` | 豆包的 Cookie（数组，支持多账号） | `["your_cookie_1", "your_cookie_2"]` |
| `DOUBAO_DEVICE_ID` | 设备 ID | `"7524726744148264511"` |
| `DOUBAO_FP` | 设备指纹 | `"verify_xxx"` |
| `DOUBAO_TEA_UUID` | Tea UUID | `"7524726753203160619"` |
| `DOUBAO_WEB_ID` | Web ID | `"7524726753203160619"` |

### 可选配置的项

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `API_MASTER_KEY` | API 访问密钥（Bearer Token） | `"sk-doubao-2api-..."` |
| `PORT` | 服务监听端口 | `8088` |
| `SESSION_CACHE_TTL` | 会话缓存时间（秒） | `3600` |
| `API_REQUEST_TIMEOUT` | 上游请求超时（毫秒） | `180000` |
| `DEFAULT_MODEL` | 默认模型名称 | `"doubao-pro-chat"` |

---

## 🔄 多账号配置

支持多个豆包账号轮询，提高并发能力：

```typescript
const CONFIG = {
  DOUBAO_COOKIES: [
    "第一个账号的完整 Cookie 字符串",
    "第二个账号的完整 Cookie 字符串",
    "第三个账号的完整 Cookie 字符串",
  ],
  // ... 其他配置
};
```

系统会自动在多个账号之间轮询，实现负载均衡。

---

## 🛡️ 安全建议

1. **修改 API_MASTER_KEY**：不要使用默认值，设置一个复杂的密钥
2. **使用 HTTPS**：生产环境建议使用 Nginx 反向代理并启用 HTTPS
3. **限制访问来源**：配置防火墙规则，只允许特定 IP 访问
4. **定期更新 Cookie**：Cookie 会过期，需要定期更新
5. **不要公开分享**：包含敏感信息的 `main.ts` 文件不要上传到公共仓库

---

## 🚀 后台运行

### 使用 nohup

```bash
nohup deno run --allow-net --allow-read main.ts > doubao-2api.log 2>&1 &
```

### 使用 screen

```bash
screen -S doubao-2api
deno run --allow-net --allow-read main.ts
# 按 Ctrl+A 然后按 D 退出 screen

# 重新连接
screen -r doubao-2api
```

### 使用 tmux

```bash
tmux new -s doubao-2api
deno run --allow-net --allow-read main.ts
# 按 Ctrl+B 然后按 D 退出 tmux

# 重新连接
tmux attach -t doubao-2api
```

### 使用 systemd（推荐生产环境）

创建服务文件 `/etc/systemd/system/doubao-2api.service`：

```ini
[Unit]
Description=doubao-2api Deno Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/your/project
ExecStart=/home/your-username/.deno/bin/deno run --allow-net --allow-read /path/to/main.ts
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable doubao-2api
sudo systemctl start doubao-2api
sudo systemctl status doubao-2api

# 查看日志
sudo journalctl -u doubao-2api -f
```

---

## ❓ 常见问题

### Q1: 如何修改配置？

**答**：直接编辑 `main.ts` 文件顶部的 `CONFIG` 对象，保存后重启服务即可。

### Q2: Cookie 在哪里配置？

**答**：在 `main.ts` 文件的第 46-52 行，`CONFIG.DOUBAO_COOKIES` 数组中。

### Q3: 如何禁用 API 认证？

**答**：将 `CONFIG.API_MASTER_KEY` 设置为 `"1"`：

```typescript
const CONFIG = {
  API_MASTER_KEY: "1",  // 禁用认证
  // ...
};
```

### Q4: 启动时提示 Cookie 未配置

**答**：确保在 `CONFIG.DOUBAO_COOKIES` 数组中至少添加了一个有效的 Cookie 字符串，并且用双引号包裹。

### Q5: 请求失败，提示被拦截

**答**：可能原因：
- Cookie 已过期 → 重新获取 Cookie
- 设备指纹失效 → 重新获取设备指纹参数
- IP 被限制 → 更换网络或使用代理

### Q6: 如何添加第二个模型？

**答**：修改 `CONFIG.MODEL_MAPPING`：

```typescript
const CONFIG = {
  MODEL_MAPPING: {
    "doubao-pro-chat": "7338286299411103781",
    "doubao-lite-chat": "另一个Bot ID",  // 添加新模型
  },
  // ...
};
```

---

## 📊 性能优化

1. **多账号轮询**：配置多个 Cookie 提升并发能力
2. **调整超时时间**：根据网络情况调整 `API_REQUEST_TIMEOUT`
3. **会话缓存**：合理设置 `SESSION_CACHE_TTL`
4. **使用反向代理**：生产环境推荐使用 Nginx
5. **资源监控**：Playwright 会占用约 200-500MB 内存

---

## 🔍 查看日志

服务运行时会在终端输出详细日志：

```
✅ 配置验证通过，加载了 1 个凭证
🚀 应用启动中... doubao-2api v1.0.0-deno
🔑 凭证管理器已初始化，共加载 1 个凭证
💾 会话管理器已初始化，缓存 TTL: 3600 秒
🚀 正在初始化 Playwright 管理器 (签名服务模式)...
✅ Playwright 管理器 (签名服务模式) 初始化完成
✅ 服务器已启动在 http://0.0.0.0:8088
```

---

## 📂 文件结构

```
main.ts       # 单个文件包含所有内容：
              # - 配置（文件顶部）
              # - 凭证管理器
              # - 会话管理器
              # - Playwright 管理器
              # - DoubaoProvider 核心业务逻辑
              # - HTTP 服务器
              # - 路由处理
```

---

## 🆚 与多文件版本的对比

| 特性 | 多文件版本 | 单文件版本 |
|------|-----------|----------|
| 文件数量 | 7+ 文件 | 1 个文件 |
| 配置方式 | `.env` 文件 | 文件顶部的 `CONFIG` 对象 |
| 部署复杂度 | 需要多个文件 | 只需一个文件 |
| 修改配置 | 编辑 `.env` | 编辑 `main.ts` 顶部 |
| 适用场景 | 复杂项目 | 快速部署、学习、小项目 |

---

## 🎓 适用场景

✅ **适合：**
- 快速原型开发
- 个人项目或小团队
- 学习和教学
- 轻量级生产环境
- 需要快速部署的场景

❌ **不适合：**
- 超大规模生产环境（建议使用微服务）
- 需要复杂配置管理的项目
- 多人协作且配置经常变动的场景

---

## 🔧 高级用法

### 自定义端口

```typescript
const CONFIG = {
  PORT: 3000,  // 修改为您想要的端口
  // ...
};
```

### 调整请求超时

```typescript
const CONFIG = {
  API_REQUEST_TIMEOUT: 300000,  // 5分钟（毫秒）
  // ...
};
```

### 添加更多模型映射

```typescript
const CONFIG = {
  MODEL_MAPPING: {
    "doubao-pro-chat": "7338286299411103781",
    "gpt-3.5-turbo": "7338286299411103781",  // 别名
    "gpt-4": "7338286299411103781",         // 别名
  },
  // ...
};
```

---

## 🛠️ 故障排查

### Playwright 初始化失败

首次运行时，Playwright 需要下载 Chromium（约 200MB）：

```bash
# 手动安装
npx playwright install chromium

# Linux 无头服务器需要额外依赖
sudo apt-get install -y libnss3 libatk1.0-0 libcups2 libdrm2 libxkbcommon0
```

### 内存不足

Playwright 需要至少 512MB 内存，推荐 1GB+。如果内存不足，考虑：
- 增加系统内存
- 使用 swap 交换空间
- 减少并发请求

### 权限问题

确保运行命令包含必要的权限标志：

```bash
# 必需的权限
deno run --allow-net --allow-read main.ts

# --allow-net: 网络访问（连接 doubao.com）
# --allow-read: 文件读取（Playwright 需要）
```

---

## 📜 许可证

遵循原项目的许可证。

---

## 🙏 致谢

- 原始 Python 项目：doubao-2api
- Deno 团队：提供优秀的现代化运行时
- Playwright 团队：提供强大的浏览器自动化工具

---

## 📞 获取帮助

如有问题，请：

1. 检查配置是否正确（Cookie 和设备指纹）
2. 查看终端日志输出
3. 确认网络可以访问 doubao.com
4. 提交 GitHub Issue

---

**Happy Coding!** 🎉

*真正的单文件解决方案 - 一个文件搞定一切！*
