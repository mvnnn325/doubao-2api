# 🔄 更新日志 - 真·单文件版本

## 📅 版本：v1.1.0 - 完全自包含

### 🎯 核心改进

本次更新实现了**真正的单文件架构**，无需任何外部配置文件。

---

## ✨ 主要变更

### 1. 配置集成化

**之前（v1.0.0）**：
- 需要创建 `.env` 文件
- 使用 `Deno.env.get()` 读取环境变量
- 配置分散在两个地方

**现在（v1.1.0）**：
- ✅ 所有配置直接在 `main.ts` 顶部的 `CONFIG` 对象中
- ✅ 无需 `.env` 文件
- ✅ 配置集中在一个地方，清晰明了

**配置示例**：
```typescript
const CONFIG = {
  API_MASTER_KEY: "sk-doubao-2api-your-secret-key",
  PORT: 8088,
  DOUBAO_COOKIES: [
    "您的 Cookie 字符串",
  ],
  DOUBAO_DEVICE_ID: "7524726744148264511",
  DOUBAO_FP: "verify_xxx",
  DOUBAO_TEA_UUID: "7524726753203160619",
  DOUBAO_WEB_ID: "7524726753203160619",
  // ...
};
```

---

### 2. 权限简化

**之前**：
```bash
deno run --allow-net --allow-env --allow-read main.ts
```

**现在**：
```bash
deno run --allow-net --allow-read main.ts
```

移除了 `--allow-env` 权限，因为不再需要读取环境变量。

---

### 3. 文档更新

新增文档：
- ✅ `README_SINGLE_FILE.md` - 完整的单文件版本使用说明
- ✅ `QUICKSTART.md` - 3 步快速开始指南
- ✅ `UPDATE_LOG.md` - 本文档，记录版本变更

---

## 📊 对比表

| 特性 | v1.0.0 (需要.env) | v1.1.0 (真·单文件) |
|------|-------------------|-------------------|
| **配置文件数量** | 2 个 (main.ts + .env) | 1 个 (main.ts) |
| **修改配置方式** | 编辑 .env 文件 | 编辑 main.ts 顶部 |
| **所需权限** | `--allow-net --allow-env --allow-read` | `--allow-net --allow-read` |
| **配置可见性** | 需要查看 .env 文件 | 直接在代码中可见 |
| **部署复杂度** | 需要同时管理两个文件 | 只需一个文件 |
| **配置验证** | 运行时检查 | 运行时检查（相同） |
| **多账号支持** | ✅ | ✅ |
| **适合场景** | 需要分离配置的场景 | 快速部署、学习、小项目 |

---

## 🎯 使用场景建议

### ✅ 推荐使用 v1.1.0（真·单文件）的场景：

1. **快速原型开发** - 一个文件搞定一切
2. **个人项目** - 配置简单，易于管理
3. **学习和教学** - 代码和配置都在一个文件中
4. **Docker 部署** - 只需复制一个文件
5. **快速分享** - 发送一个文件即可

### ⚠️ 可能更适合使用 .env 版本的场景：

1. **团队协作** - 配置需要单独管理
2. **多环境部署** - 开发、测试、生产环境配置不同
3. **敏感信息管理** - 配置文件需要独立加密
4. **CI/CD 集成** - 环境变量由部署系统注入

---

## 🔧 迁移指南

如果您已经在使用 v1.0.0 版本（需要 .env 文件），可以按以下步骤迁移到 v1.1.0：

### 步骤 1：备份现有配置

```bash
# 备份您的 .env 文件
cp .env .env.backup
```

### 步骤 2：更新 main.ts

下载新版本的 `main.ts` 文件，或者手动修改：

1. 找到文件顶部（第 20-72 行）
2. 将 `.env` 文件中的配置值复制到 `CONFIG` 对象中

### 步骤 3：配置映射

| .env 中的变量名 | CONFIG 中的属性名 |
|----------------|------------------|
| `API_MASTER_KEY` | `CONFIG.API_MASTER_KEY` |
| `NGINX_PORT` | `CONFIG.PORT` |
| `DOUBAO_COOKIE_1` | `CONFIG.DOUBAO_COOKIES[0]` |
| `DOUBAO_COOKIE_2` | `CONFIG.DOUBAO_COOKIES[1]` |
| `DOUBAO_DEVICE_ID` | `CONFIG.DOUBAO_DEVICE_ID` |
| `DOUBAO_FP` | `CONFIG.DOUBAO_FP` |
| `DOUBAO_TEA_UUID` | `CONFIG.DOUBAO_TEA_UUID` |
| `DOUBAO_WEB_ID` | `CONFIG.DOUBAO_WEB_ID` |
| `SESSION_CACHE_TTL` | `CONFIG.SESSION_CACHE_TTL` |

**示例**：

**.env 文件中**：
```env
API_MASTER_KEY=sk-my-secret-key
NGINX_PORT=8088
DOUBAO_COOKIE_1="cookie_string_1"
DOUBAO_COOKIE_2="cookie_string_2"
DOUBAO_DEVICE_ID=7524726744148264511
```

**main.ts 中**：
```typescript
const CONFIG = {
  API_MASTER_KEY: "sk-my-secret-key",
  PORT: 8088,
  DOUBAO_COOKIES: [
    "cookie_string_1",
    "cookie_string_2",
  ],
  DOUBAO_DEVICE_ID: "7524726744148264511",
  // ...
};
```

### 步骤 4：测试

```bash
# 使用新的权限标志运行
deno run --allow-net --allow-read main.ts
```

### 步骤 5：清理（可选）

迁移成功后，可以删除 `.env` 文件：

```bash
rm .env
```

---

## 🐛 Bug 修复

- 修复了 Cookie 中包含特殊字符 `$` 导致的解析问题
- 改进了配置验证错误提示信息
- 优化了启动日志输出

---

## 🚀 性能优化

- 移除了环境变量读取开销（虽然微小，但更纯粹）
- 简化了配置加载逻辑
- 减少了运行时权限检查

---

## 📝 文档改进

- 新增快速开始指南（QUICKSTART.md）
- 新增单文件版本专用文档（README_SINGLE_FILE.md）
- 改进了配置说明和示例
- 增加了更多使用场景和最佳实践

---

## ⚙️ 技术细节

### ConfigManager 改动

**之前**：
```typescript
private loadConfig(): AppConfig {
  const cookies: string[] = [];
  let i = 1;
  while (true) {
    const cookieStr = Deno.env.get(`DOUBAO_COOKIE_${i}`);
    if (cookieStr) {
      cookies.push(cookieStr);
      i++;
    } else {
      break;
    }
  }
  
  return {
    API_MASTER_KEY: Deno.env.get("API_MASTER_KEY") || "1",
    // ...
  };
}
```

**现在**：
```typescript
private loadConfig(): AppConfig {
  return {
    API_MASTER_KEY: CONFIG.API_MASTER_KEY,
    NGINX_PORT: CONFIG.PORT,
    DOUBAO_COOKIES: CONFIG.DOUBAO_COOKIES.filter(c => c && c.trim() !== ""),
    // ...
  };
}
```

更简洁，更直接！

---

## 🔮 未来计划

可能的后续改进：

1. **配置验证增强** - 添加更详细的配置格式检查
2. **配置生成工具** - 提供交互式配置生成脚本
3. **多配置文件支持** - 支持在单文件中定义多套配置
4. **配置导入导出** - 支持从 JSON/YAML 导入配置

---

## 💡 最佳实践

1. **定期更新 Cookie** - Cookie 会过期，建议定期（每周）更新
2. **使用复杂密钥** - `API_MASTER_KEY` 应使用强密码
3. **备份配置** - 定期备份您修改后的 `main.ts` 文件
4. **版本控制** - 如果使用 Git，确保 `main.ts` 中的敏感信息不要提交到公共仓库
5. **多账号轮询** - 配置多个 Cookie 可以提高稳定性和并发能力

---

## 📞 反馈

如果您在使用过程中遇到问题或有改进建议，欢迎：

- 提交 GitHub Issue
- 发送 Pull Request
- 在社区讨论区留言

---

## 🎉 总结

v1.1.0 版本实现了真正的**单文件架构**，让部署和使用变得更加简单。无需任何外部配置文件，只需修改一个文件即可完成所有配置。

**核心优势**：
- ✅ 配置更直观（在代码中可见）
- ✅ 部署更简单（只需一个文件）
- ✅ 权限更少（不需要 --allow-env）
- ✅ 维护更容易（单点修改）

**适合所有追求简洁和高效的开发者！** 🚀

---

*更新时间：2025-01-21*
