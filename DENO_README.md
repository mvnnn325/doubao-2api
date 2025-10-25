# 🚀 doubao-2api - Deno 单文件版本

一个将 **doubao.com** 转换为 **OpenAI 兼容 API** 的高性能代理服务，使用 Deno 运行时，单文件架构，零配置启动。

---

## ✨ 特性

- ✅ **单文件架构**：所有功能集成在一个 TypeScript 文件中，无需复杂的项目结构
- ✅ **OpenAI 兼容**：完全兼容 OpenAI Chat Completions API 格式
- ✅ **流式 & 非流式**：支持 SSE 流式响应和传统的非流式响应
- ✅ **a_bogus 签名**：内置 Playwright 自动生成反爬虫签名
- ✅ **多账号轮询**：支持配置多个豆包账号，自动轮询使用
- ✅ **会话管理**：自动维护对话上下文，支持 TTL 缓存
- ✅ **Bearer Token 认证**：可选的 API Key 保护
- ✅ **现代化技术栈**：Deno + TypeScript + Web 标准 API

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

### 2. 配置环境变量

创建 `.env` 文件：

```env
API_MASTER_KEY=sk-doubao-2api-your-secret-key
NGINX_PORT=8088
DOUBAO_COOKIE_1="your_cookie_string_here"
DOUBAO_DEVICE_ID=7524726744148264511
DOUBAO_FP=verify_xxx
DOUBAO_TEA_UUID=7524726753203160619
DOUBAO_WEB_ID=7524726753203160619
SESSION_CACHE_TTL=3600
```

### 3. 运行服务

```bash
deno run --allow-net --allow-env --allow-read main.ts
```

### 4. 测试 API

```bash
curl http://localhost:8088/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-doubao-2api-your-secret-key" \
  -d '{
    "model": "doubao-pro-chat",
    "messages": [{"role": "user", "content": "你好"}],
    "stream": true
  }'
```

---

## 📖 完整文档

请查看 **[DENO_USAGE.md](./DENO_USAGE.md)** 获取完整的使用教程，包括：

- 🔧 详细的环境配置
- 🍪 如何获取 Cookie 和设备指纹
- 🧪 完整的 API 使用示例
- 🐍 Python SDK 集成示例
- 📦 Node.js SDK 集成示例
- ❓ 常见问题解答
- 🛠️ 生产环境部署建议

---

## 🏗️ 架构说明

### 核心模块

```
main.ts (单文件架构)
├── ConfigManager          # 配置管理（从 .env 读取）
├── CredentialManager      # 多账号凭证轮询
├── SessionManager         # 会话管理（TTL 缓存）
├── PlaywrightManager      # a_bogus 签名生成
├── DoubaoProvider         # 核心业务逻辑
│   ├── chatCompletion()   # 聊天补全（流式/非流式）
│   └── getModels()        # 获取模型列表
└── HTTP Server            # Deno.serve 原生服务器
    ├── GET  /             # 健康检查
    ├── GET  /v1/models    # 模型列表
    └── POST /v1/chat/completions  # 聊天补全
```

### 技术栈

- **运行时**：Deno 1.37+
- **语言**：TypeScript
- **HTTP 服务器**：Deno.serve（原生 Web 标准）
- **HTTP 客户端**：fetch API（原生 Web 标准）
- **浏览器自动化**：Playwright (通过 npm:)
- **配置管理**：Deno.env.get()
- **会话缓存**：Map + setTimeout（原生实现）

---

## 🔄 从 Python 版本的主要变更

| 功能 | Python 版本 | Deno 版本 |
|------|------------|----------|
| HTTP 框架 | FastAPI | Deno.serve (原生) |
| HTTP 客户端 | httpx | fetch API (原生) |
| 配置管理 | pydantic-settings | Deno.env.get() |
| 日志系统 | loguru | console.log (原生) |
| 并发控制 | threading.Lock | 单线程（JavaScript 特性） |
| 会话缓存 | cachetools.TTLCache | Map + setTimeout |
| 浏览器自动化 | playwright-python | playwright (npm:) |
| 文件数量 | 多文件 + 目录结构 | 单文件 |
| 依赖管理 | requirements.txt | URL 导入 (ESM) |
| 启动命令 | `python main.py` | `deno run --allow-* main.ts` |

---

## 🔐 安全建议

1. **修改 API_MASTER_KEY**：不要使用默认值，设置复杂密钥
2. **使用 HTTPS**：生产环境务必使用 HTTPS
3. **限制访问来源**：配置防火墙或反向代理
4. **定期更新 Cookie**：Cookie 会过期，需定期更新
5. **监控日志**：及时发现异常请求和错误

---

## 🐛 故障排查

### 启动失败

- ✅ 检查 `.env` 文件是否存在且格式正确
- ✅ 检查所有必需的环境变量是否已配置
- ✅ 确认 Cookie 和设备指纹未过期

### 请求失败

- ✅ 查看服务器日志，查找详细错误信息
- ✅ 验证 API Key 是否正确
- ✅ 确认网络可以访问 doubao.com
- ✅ 检查 Playwright 是否成功初始化

### Playwright 初始化失败

```bash
# 手动安装 Chromium
npx playwright install chromium

# Linux 无头服务器需要安装依赖
sudo apt-get install -y libnss3 libatk1.0-0 libcups2 libdrm2 libxkbcommon0
```

---

## 🚀 性能优化

1. **多账号轮询**：配置多个 `DOUBAO_COOKIE_*` 提升并发能力
2. **调整超时**：根据网络情况调整 `API_REQUEST_TIMEOUT`
3. **使用缓存**：合理设置 `SESSION_CACHE_TTL`
4. **反向代理**：生产环境推荐使用 Nginx
5. **资源监控**：Playwright 占用内存，建议至少 1GB

---

## 📊 系统要求

- **内存**：至少 512MB，推荐 1GB+
- **CPU**：1 核心即可，推荐 2 核心+
- **磁盘**：约 500MB（包括 Chromium 浏览器）
- **网络**：需要稳定访问 doubao.com

---

## 🤝 对比优势

### 为什么选择 Deno 版本？

| 特性 | Python 版本 | Deno 版本 |
|------|------------|----------|
| 部署复杂度 | 需要 Docker / venv | 单文件直接运行 |
| 启动速度 | 慢（需要加载多个模块） | 快（V8 引擎） |
| 内存占用 | 较高（Python 解释器） | 较低（V8 引擎） |
| 类型安全 | 部分（需要 mypy） | 完全（TypeScript） |
| 依赖管理 | pip / requirements.txt | URL 导入（零配置） |
| 安全性 | 默认所有权限 | 显式权限控制 |
| 跨平台 | 需要考虑依赖兼容性 | 原生跨平台 |
| 学习曲线 | 中等 | 低（Web 标准 API） |

---

## 📜 许可证

遵循原项目的许可证。

---

## 🙏 致谢

- 原始 Python 项目：[doubao-2api](https://github.com/yourusername/doubao-2api)
- Deno 团队：提供优秀的现代化运行时
- Playwright 团队：提供强大的浏览器自动化工具

---

## 📞 支持

如有问题，请：

1. 查看 [完整使用教程](./DENO_USAGE.md)
2. 查看 [常见问题解答](./DENO_USAGE.md#常见问题)
3. 提交 GitHub Issue

---

**Happy Coding!** 🎉
