# ⚡ 快速开始指南

## 3 步启动 doubao-2api

### 步骤 1️⃣：安装 Deno

```bash
# Linux / macOS
curl -fsSL https://deno.land/install.sh | sh

# macOS (Homebrew)
brew install deno

# Windows (PowerShell)
irm https://deno.land/install.ps1 | iex
```

---

### 步骤 2️⃣：配置 main.ts

用文本编辑器打开 `main.ts`，找到第 20-72 行的配置区域，修改以下内容：

#### ✅ 必须修改的配置

```typescript
const CONFIG = {
  // 1. 修改 API 密钥（用于保护您的服务）
  API_MASTER_KEY: "sk-your-super-secret-key-here",
  
  // 2. 粘贴您的豆包 Cookie（唯一必需的配置）
  DOUBAO_COOKIES: [
    "在这里粘贴从浏览器复制的完整 Cookie 字符串",
  ],
};
```

#### 🍪 如何获取 Cookie？

1. 访问 https://www.doubao.com/chat/ 并登录
2. 按 `F12` 打开开发者工具
3. 切换到 **Network（网络）** 标签
4. 在豆包界面发送一条测试消息（例如："你好"）
5. 在请求列表中找到 **`completion`** 请求，点击它
6. 在右侧面板的 **Headers（请求头）** 标签中
7. 找到 `Cookie:` 字段，复制完整的 Cookie 值
8. 粘贴到 `CONFIG.DOUBAO_COOKIES` 数组中

---

### 步骤 3️⃣：运行服务

```bash
deno run --allow-net --allow-read --allow-write --allow-env main.ts
```

看到以下输出表示启动成功：

```
✅ 配置验证通过，加载了 1 个凭证
🚀 应用启动中... doubao-2api v1.0.0-deno
✅ 服务器已启动在 http://0.0.0.0:8088
```

---

## 🧪 测试服务

### 测试 1：健康检查

```bash
curl http://localhost:8088/
```

预期响应：
```json
{"message":"欢迎来到 doubao-2api v1.0.0-deno. 服务运行正常。"}
```

### 测试 2：聊天请求

```bash
curl http://localhost:8088/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-your-super-secret-key-here" \
  -d '{
    "model": "doubao-pro-chat",
    "messages": [{"role": "user", "content": "你好"}],
    "stream": true
  }'
```

如果看到流式返回的内容，说明一切正常！🎉

---

## 🐍 在 Python 中使用

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8088/v1",
    api_key="sk-your-super-secret-key-here"
)

response = client.chat.completions.create(
    model="doubao-pro-chat",
    messages=[{"role": "user", "content": "介绍一下你自己"}],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

---

## ❓ 常见问题

### ❌ 启动失败：Cookie 未配置

**错误信息**：`必须在文件顶部的 CONFIG.DOUBAO_COOKIES 中至少配置一个有效的 Cookie`

**解决方法**：
- 确保在 `CONFIG.DOUBAO_COOKIES` 数组中添加了 Cookie
- Cookie 必须用双引号包裹
- Cookie 字符串不能为空

### ❌ 请求失败：401 Unauthorized

**错误信息**：`需要 Bearer Token 认证`

**解决方法**：
- 确保请求头包含：`Authorization: Bearer YOUR_API_KEY`
- `YOUR_API_KEY` 必须与 `CONFIG.API_MASTER_KEY` 匹配
- 或者将 `API_MASTER_KEY` 设置为 `"1"` 禁用认证

### ❌ 请求失败：服务器未返回数据流

**错误信息**：`服务器连接成功但未返回数据流`

**可能原因**：
- Cookie 已过期 → 重新获取
- IP 被限制 → 更换网络

**解决方法**：重新按照步骤 2 获取最新的 Cookie

---

## 🎯 下一步

- 📖 查看完整文档：[README_SINGLE_FILE.md](./README_SINGLE_FILE.md)
- 🔧 了解高级配置：多账号轮询、自定义端口等
- 🚀 生产环境部署：使用 systemd 或 Docker

---

**就是这么简单！** 🚀
