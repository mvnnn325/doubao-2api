# doubao-2api Deno 版本 - 完整使用教程

## 📋 目录

- [环境要求](#环境要求)
- [安装 Deno](#安装-deno)
- [配置项目](#配置项目)
- [运行服务](#运行服务)
- [API 使用示例](#api-使用示例)
- [常见问题](#常见问题)

---

## 🔧 环境要求

- **操作系统**：Linux、macOS 或 Windows (推荐使用 WSL2)
- **Deno 版本**：1.37.0 或更高版本
- **网络要求**：能够访问 doubao.com 和 deno.land

---

## 📦 安装 Deno

### 方法一：使用官方安装脚本（推荐）

#### Linux / macOS
```bash
curl -fsSL https://deno.land/install.sh | sh
```

#### Windows (PowerShell)
```powershell
irm https://deno.land/install.ps1 | iex
```

### 方法二：使用包管理器

#### macOS (Homebrew)
```bash
brew install deno
```

#### Linux (Snap)
```bash
snap install deno
```

#### Windows (Chocolatey)
```powershell
choco install deno
```

### 验证安装
```bash
deno --version
```

如果看到版本信息输出（例如 `deno 1.48.0`），说明安装成功。

---

## ⚙️ 配置项目

### 1. 创建 `.env` 文件

在 `main.ts` 文件所在的目录下创建一个名为 `.env` 的文件：

```bash
touch .env
```

### 2. 配置环境变量

打开 `.env` 文件并填入以下配置（请根据您的实际情况修改）：

```env
# --- 核心安全配置 ---
# 用于保护您 API 服务的访问密钥
# 如果设置为 "1"，则不启用认证；建议设置为复杂的密钥
API_MASTER_KEY=sk-doubao-2api-your-secret-key-here

# --- 部署配置 ---
# 服务监听的端口号
NGINX_PORT=8088

# --- 豆包凭证 (必须配置) ---
# 从浏览器开发者工具中获取完整的 Cookie 字符串
# 步骤：
# 1. 打开 https://www.doubao.com/chat/
# 2. 按 F12 打开开发者工具
# 3. 切换到"网络(Network)"面板
# 4. 发送一条消息
# 5. 在请求列表中找到 `completion` 请求
# 6. 右键 -> 复制 -> 复制为 cURL (bash)
# 7. 从 cURL 命令中找到 `--cookie '...'` 部分，将其内容粘贴到下方

DOUBAO_COOKIE_1="在此处粘贴您的完整 Cookie 字符串"

# 支持多账号轮询，只需按格式添加更多 Cookie
# DOUBAO_COOKIE_2="第二个账号的 Cookie 字符串"
# DOUBAO_COOKIE_3="第三个账号的 Cookie 字符串"

# --- 静态设备指纹 (必须配置) ---
# 从浏览器抓包的有效请求中提取以下参数：
# 在开发者工具的网络面板中，找到 completion 请求，查看其查询参数
DOUBAO_DEVICE_ID=7524726744148264511
DOUBAO_FP=verify_mgyqvccs_blJSa2yy_7EW7_4Hyr_Ato6_bIPsXGNXitoz
DOUBAO_TEA_UUID=7524726753203160619
DOUBAO_WEB_ID=7524726753203160619

# --- 会话管理 (可选) ---
# 对话历史在内存中的缓存时间（秒），默认1小时
SESSION_CACHE_TTL=3600
```

### 3. 获取 Cookie 的详细步骤（重要）

1. **登录豆包**：访问 [https://www.doubao.com/chat/](https://www.doubao.com/chat/) 并登录您的账号

2. **打开开发者工具**：按 `F12` 或右键点击页面 -> "检查"

3. **切换到网络面板**：点击顶部的 "Network" (网络) 标签

4. **发送测试消息**：在豆包聊天界面随便发送一条消息，例如 "你好"

5. **找到 completion 请求**：
   - 在网络请求列表中，找到名为 `completion` 的请求
   - 点击该请求

6. **查看请求头**：
   - 在右侧面板切换到 "Headers" (请求头) 标签
   - 向下滚动找到 "Request Headers" (请求头) 部分
   - 找到 `Cookie:` 字段，复制其完整的值

7. **获取设备指纹**：
   - 在同一个 `completion` 请求中
   - 切换到 "Payload" 或 "Query String Parameters" 标签
   - 找到并复制以下参数的值：
     - `device_id`
     - `fp` (fingerprint)
     - `tea_uuid`
     - `web_id`

---

## 🚀 运行服务

### 方法一：直接运行（推荐用于测试）

在项目目录下执行：

```bash
deno run --allow-net --allow-env --allow-read main.ts
```

**权限说明**：
- `--allow-net`：允许网络访问（必需，用于连接 doubao.com）
- `--allow-env`：允许读取环境变量（必需，用于读取 .env 配置）
- `--allow-read`：允许文件读取（Playwright 需要）

### 方法二：添加执行权限后运行

```bash
# 添加执行权限
chmod +x main.ts

# 直接运行
./main.ts
```

### 查看启动日志

如果一切配置正确，您应该看到类似以下的输出：

```
╔════════════════════════════════════════════════════════════════╗
║            doubao-2api - Deno 单文件版本                       ║
║    将 doubao.com 转换为 OpenAI 兼容 API 的高性能代理         ║
╚════════════════════════════════════════════════════════════════╝

✅ 配置验证通过，加载了 1 个凭证
🚀 应用启动中... doubao-2api v1.0.0-deno
🔑 凭证管理器已初始化，共加载 1 个凭证
💾 会话管理器已初始化，缓存 TTL: 3600 秒
🚀 正在初始化 Playwright 管理器 (签名服务模式)...
🍪 正在为初始页面加载设置 Cookie...
✅ 初始 Cookie 设置完成
🌐 正在导航到豆包官网以加载签名脚本 (超时时间: 60秒)...
✅ 页面导航完成 (load 事件触发)
⏳ 正在等待关键签名函数 (window.byted_acrawler.frontierSign) 加载 (超时时间: 30秒)...
✅ 关键签名函数已在启动时成功加载！
✅ 已从配置中加载静态设备指纹: {...}
✅ Playwright 管理器 (签名服务模式) 初始化完成
✅ 服务已进入 'JS-Signature-as-a-Service' 模式
🌐 服务将在 http://localhost:8088 上可用

✅ 服务器已启动在 http://0.0.0.0:8088
```

---

## 🧪 API 使用示例

### 1. 健康检查

检查服务是否正常运行：

```bash
curl http://localhost:8088/
```

**预期响应**：
```json
{
  "message": "欢迎来到 doubao-2api v1.0.0-deno. 服务运行正常。"
}
```

---

### 2. 获取可用模型列表

```bash
curl http://localhost:8088/v1/models \
  -H "Authorization: Bearer sk-doubao-2api-your-secret-key-here"
```

**预期响应**：
```json
{
  "object": "list",
  "data": [
    {
      "id": "doubao-pro-chat",
      "object": "model",
      "created": 1234567890,
      "owned_by": "lzA6"
    }
  ]
}
```

---

### 3. 发送聊天请求（流式响应）

```bash
curl http://localhost:8088/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-doubao-2api-your-secret-key-here" \
  -d '{
    "model": "doubao-pro-chat",
    "messages": [
      {
        "role": "user",
        "content": "你好，请介绍一下自己"
      }
    ],
    "stream": true
  }'
```

**响应格式**（Server-Sent Events）：
```
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"doubao-pro-chat","choices":[{"index":0,"delta":{"content":"你好"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"doubao-pro-chat","choices":[{"index":0,"delta":{"content":"！"},"finish_reason":null}]}

...

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"doubao-pro-chat","choices":[{"index":0,"delta":{"content":""},"finish_reason":"stop"}]}

data: [DONE]
```

---

### 4. 发送聊天请求（非流式响应）

```bash
curl http://localhost:8088/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-doubao-2api-your-secret-key-here" \
  -d '{
    "model": "doubao-pro-chat",
    "messages": [
      {
        "role": "user",
        "content": "1+1等于几？"
      }
    ],
    "stream": false
  }'
```

**预期响应**：
```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "doubao-pro-chat",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "1+1 等于 2。"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  }
}
```

---

### 5. 使用 Python SDK 调用

安装 OpenAI Python SDK：

```bash
pip install openai
```

Python 代码示例：

```python
from openai import OpenAI

# 配置客户端
client = OpenAI(
    base_url="http://localhost:8088/v1",
    api_key="sk-doubao-2api-your-secret-key-here"
)

# 发送聊天请求
response = client.chat.completions.create(
    model="doubao-pro-chat",
    messages=[
        {"role": "user", "content": "你好，请介绍一下自己"}
    ],
    stream=True
)

# 流式输出
for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

---

### 6. 使用 Node.js SDK 调用

安装 OpenAI Node.js SDK：

```bash
npm install openai
```

Node.js 代码示例：

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:8088/v1',
  apiKey: 'sk-doubao-2api-your-secret-key-here',
});

async function main() {
  const stream = await client.chat.completions.create({
    model: 'doubao-pro-chat',
    messages: [{ role: 'user', content: '你好，请介绍一下自己' }],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
  }
}

main();
```

---

## ❓ 常见问题

### Q1: 启动时提示 "必须在 .env 文件中至少配置一个有效的 DOUBAO_COOKIE_1"

**解决方案**：
- 确保您在项目根目录创建了 `.env` 文件
- 确保 `.env` 文件中包含 `DOUBAO_COOKIE_1="..."`（注意等号两边不要有空格）
- 确保 Cookie 字符串用双引号包裹

---

### Q2: 启动时提示 "必须在 .env 文件中配置完整的设备指纹参数"

**解决方案**：
- 确保 `.env` 文件中包含以下四个参数：
  - `DOUBAO_DEVICE_ID`
  - `DOUBAO_FP`
  - `DOUBAO_TEA_UUID`
  - `DOUBAO_WEB_ID`
- 从浏览器开发者工具的网络面板中，查看 `completion` 请求的查询参数获取这些值

---

### Q3: 请求返回 401 Unauthorized

**解决方案**：
- 检查您的 API Key 是否正确
- 如果设置了 `API_MASTER_KEY=1`，则不需要认证
- 确保请求头中包含 `Authorization: Bearer YOUR_API_KEY`

---

### Q4: 请求返回 "服务器连接成功但未返回数据流"

**可能原因**：
1. Cookie 已过期
2. 设备指纹参数失效
3. IP 被豆包限流或封禁

**解决方案**：
1. 重新登录豆包并获取最新的 Cookie
2. 重新抓包获取最新的设备指纹参数
3. 更换网络环境或使用代理

---

### Q5: Playwright 初始化失败

**解决方案**：

首次运行时，Playwright 需要下载 Chromium 浏览器，可能需要一些时间。

如果下载失败，可以手动安装：

```bash
# 使用 npx 安装 Playwright 浏览器
npx playwright install chromium
```

如果在无头服务器上运行，还需要安装依赖：

```bash
# Ubuntu/Debian
sudo apt-get install -y \
  libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libgbm1 \
  libasound2 libpango-1.0-0 libcairo2

# CentOS/RHEL
sudo yum install -y \
  nss nspr atk at-spi2-atk cups-libs libdrm \
  libxkbcommon libXcomposite libXdamage libXfixes \
  libXrandr mesa-libgbm alsa-lib pango cairo
```

---

### Q6: 如何停止服务？

在运行服务的终端按 `Ctrl + C` 即可优雅地停止服务。服务会自动清理资源（关闭 Playwright 浏览器等）。

---

### Q7: 如何在后台运行服务？

**方法一：使用 `nohup`**

```bash
nohup deno run --allow-net --allow-env --allow-read main.ts > doubao-2api.log 2>&1 &
```

**方法二：使用 `screen` 或 `tmux`**

```bash
# 使用 screen
screen -S doubao-2api
deno run --allow-net --allow-env --allow-read main.ts
# 按 Ctrl+A, 然后按 D 退出 screen 会话

# 重新连接
screen -r doubao-2api
```

**方法三：使用 systemd（推荐用于生产环境）**

创建服务文件 `/etc/systemd/system/doubao-2api.service`：

```ini
[Unit]
Description=doubao-2api Deno Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/your/project
ExecStart=/home/your-username/.deno/bin/deno run --allow-net --allow-env --allow-read main.ts
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
```

---

### Q8: 如何查看服务日志？

服务运行时会在终端输出详细的日志，包括：
- 📨 收到的客户端请求
- 🔐 签名生成过程
- ✅ 上游服务器响应
- ❌ 错误信息

如果使用 systemd 运行，可以使用以下命令查看日志：

```bash
sudo journalctl -u doubao-2api -f
```

---

### Q9: 性能优化建议

1. **使用多个 Cookie 轮询**：配置多个 `DOUBAO_COOKIE_*` 可以提高并发处理能力
2. **调整超时时间**：如果网络较慢，可以增加 `API_REQUEST_TIMEOUT` 的值
3. **使用反向代理**：建议在生产环境使用 Nginx 作为反向代理，启用 HTTPS
4. **监控资源使用**：Playwright 会占用一定的内存和 CPU，建议至少分配 1GB 内存

---

### Q10: 安全性建议

1. **修改 API_MASTER_KEY**：不要使用默认值 "1"，设置一个复杂的密钥
2. **使用 HTTPS**：生产环境务必使用 HTTPS 保护 API Key 传输
3. **限制访问来源**：使用防火墙或 Nginx 限制只允许特定 IP 访问
4. **定期更新 Cookie**：Cookie 会过期，建议定期更新以保证服务稳定

---

## 📚 更多资源

- **Deno 官方文档**：https://deno.land/manual
- **OpenAI API 文档**：https://platform.openai.com/docs/api-reference
- **Playwright 文档**：https://playwright.dev/docs/intro

---

## 📄 许可证

本项目遵循原项目的许可证。

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**祝您使用愉快！** 🎉
