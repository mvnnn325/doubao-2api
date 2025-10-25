#!/usr/bin/env -S deno run --allow-net --allow-read
/**
 * doubao-2api - Deno 单文件版本（完全自包含）
 * 
 * 一个将 doubao.com 转换为兼容 OpenAI 格式 API 的高性能代理
 * 内置 a_bogus 签名解决方案（使用 Playwright）
 * 
 * 使用方法：
 *   deno run --allow-net --allow-read main.ts
 * 
 * 或者添加执行权限后直接运行：
 *   chmod +x main.ts
 *   ./main.ts
 */

import { chromium } from "npm:playwright@1.48.2";
import type { Browser, Page } from "npm:playwright@1.48.2";
import { default as stealthPlugin } from "npm:puppeteer-extra-plugin-stealth@2.11.2";

// ============================================================================
// 🔧 配置区域 - 请在此处修改您的配置
// ============================================================================

const CONFIG = {
  // --- 核心安全配置 ---
  // 用于保护您 API 服务的访问密钥
  // 如果设置为 "1"，则不启用认证；建议设置为复杂的密钥
  API_MASTER_KEY: "sk-doubao-2api-your-secret-key-please-change-me",
  
  // --- 部署配置 ---
  // 服务监听的端口号
  PORT: 8088,
  
  // --- 豆包凭证 (必须配置) ---
  // 从浏览器开发者工具中获取完整的 Cookie 字符串
  // 步骤：
  // 1. 打开 https://www.doubao.com/chat/
  // 2. 按 F12 打开开发者工具
  // 3. 切换到"网络(Network)"面板
  // 4. 发送一条消息
  // 5. 在请求列表中找到 `completion` 请求
  // 6. 右键 -> 复制 -> 复制为 cURL (bash)
  // 7. 从 cURL 命令中找到 `--cookie '...'` 部分，将其内容粘贴到下方
  //
  // 支持多账号轮询，只需在数组中添加更多 Cookie 字符串
  DOUBAO_COOKIES: [
    "在此处粘贴您的完整 Cookie 字符串",
    // 第二个账号的 Cookie（可选）
    // "在此处粘贴第二个账号的 Cookie 字符串",
  ],
  
  // --- 会话管理 (可选) ---
  // 对话历史在内存中的缓存时间（秒），默认1小时
  SESSION_CACHE_TTL: 3600,
  
  // --- 高级配置 (可选) ---
  API_REQUEST_TIMEOUT: 180000, // 上游请求超时时间（毫秒）
  DEFAULT_MODEL: "doubao-pro-chat", // 默认模型
  MODEL_MAPPING: {
    "doubao-pro-chat": "7338286299411103781", // 模型 ID 映射
  },
};

// ============================================================================
// 配置管理模块（自动化处理）
// ============================================================================

interface AppConfig {
  APP_NAME: string;
  APP_VERSION: string;
  DESCRIPTION: string;
  API_MASTER_KEY: string;
  NGINX_PORT: number;
  DOUBAO_COOKIES: string[];
  API_REQUEST_TIMEOUT: number;
  SESSION_CACHE_TTL: number;
  DEFAULT_MODEL: string;
  MODEL_MAPPING: Record<string, string>;
}

class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  private loadConfig(): AppConfig {
    return {
      APP_NAME: "doubao-2api",
      APP_VERSION: "1.0.0-deno",
      DESCRIPTION: "一个将 doubao.com 转换为兼容 OpenAI 格式 API 的高性能代理（Deno版）",
      API_MASTER_KEY: CONFIG.API_MASTER_KEY,
      NGINX_PORT: CONFIG.PORT,
      DOUBAO_COOKIES: CONFIG.DOUBAO_COOKIES.filter(c => c && c.trim() !== "" && !c.startsWith("在此处粘贴")),
      API_REQUEST_TIMEOUT: CONFIG.API_REQUEST_TIMEOUT,
      SESSION_CACHE_TTL: CONFIG.SESSION_CACHE_TTL,
      DEFAULT_MODEL: CONFIG.DEFAULT_MODEL,
      MODEL_MAPPING: CONFIG.MODEL_MAPPING,
    };
  }

  private validateConfig(): void {
    if (this.config.DOUBAO_COOKIES.length === 0) {
      throw new Error("❌ 必须在文件顶部的 CONFIG.DOUBAO_COOKIES 中至少配置一个有效的 Cookie");
    }

    console.log(`✅ 配置验证通过，加载了 ${this.config.DOUBAO_COOKIES.length} 个凭证`);
  }

  public getConfig(): AppConfig {
    return this.config;
  }
}

// ============================================================================
// 凭证管理器 - 负责多账号轮询
// ============================================================================

class CredentialManager {
  private credentials: string[];
  private index: number;

  constructor(credentials: string[]) {
    if (!credentials || credentials.length === 0) {
      throw new Error("凭证列表不能为空");
    }
    this.credentials = credentials;
    this.index = 0;
    console.log(`🔑 凭证管理器已初始化，共加载 ${this.credentials.length} 个凭证`);
  }

  public getCredential(): string {
    const credential = this.credentials[this.index];
    this.index = (this.index + 1) % this.credentials.length;
    return credential;
  }
}

// ============================================================================
// 会话管理器 - 使用 TTL 缓存保存 conversation_id
// ============================================================================

class SessionManager {
  private cache: Map<string, { data: Record<string, unknown>; timer: number }>;
  private ttl: number;

  constructor(ttl: number) {
    this.cache = new Map();
    this.ttl = ttl * 1000; // 转换为毫秒
    console.log(`💾 会话管理器已初始化，缓存 TTL: ${ttl} 秒`);
  }

  public getSession(sessionId: string): Record<string, unknown> | null {
    const entry = this.cache.get(sessionId);
    if (!entry) {
      return null;
    }
    return entry.data;
  }

  public updateSession(sessionId: string, data: Record<string, unknown>): void {
    const existing = this.cache.get(sessionId);
    if (existing) {
      clearTimeout(existing.timer);
    }

    const timer = setTimeout(() => {
      this.cache.delete(sessionId);
    }, this.ttl);

    this.cache.set(sessionId, { data, timer });
  }
}

// ============================================================================
// Playwright 管理器 - 生成 a_bogus 签名
// ============================================================================

class PlaywrightManager {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private initialized = false;
  private msToken: string | null = null;
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
  }

  public async initialize(cookies: string[]): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log("🚀 正在初始化 Playwright 管理器 (签名服务模式)...");

    try {
      this.browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      this.page = await this.browser.newPage();

      await this.page.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", {
          get: () => undefined,
        });
      });

      this.page.on("console", (msg) => {
        const text = msg.text();
        if (
          text.includes("Failed to load resource") ||
          text.includes("net::ERR_FAILED") ||
          text.includes("WebSocket connection") ||
          text.includes("Content Security Policy")
        ) {
          return;
        }
      });

      this.page.on("response", async (response) => {
        try {
          const headers = await response.allHeaders();
          if (headers["x-ms-token"]) {
            const token = headers["x-ms-token"];
            if (token !== this.msToken) {
              this.msToken = token;
              console.log(`✅ 通过响应头捕获到新的 msToken: ${this.msToken}`);
            }
          }
        } catch (_e) {
          // Ignore errors
        }
      });

      if (!cookies || cookies.length === 0) {
        throw new Error("Playwright 初始化需要至少一个有效的 Cookie");
      }

      console.log("🍪 正在为初始页面加载设置 Cookie...");
      const initialCookieStr = cookies[0];
      const cookieList = initialCookieStr.split(";")
        .filter(c => c.includes("="))
        .map(c => {
          const [name, ...valueParts] = c.split("=");
          return {
            name: name.trim(),
            value: valueParts.join("=").trim(),
            domain: ".doubao.com",
            path: "/",
          };
        });

      await this.page.context().addCookies(cookieList);
      console.log("✅ 初始 Cookie 设置完成");

      console.log("🌐 正在导航到豆包官网以加载签名脚本 (超时时间: 60秒)...");
      await this.page.goto("https://www.doubao.com/chat/", {
        waitUntil: "load",
        timeout: 60000,
      });
      console.log("✅ 页面导航完成 (load 事件触发)");

      console.log("⏳ 正在等待关键签名函数 (window.byted_acrawler.frontierSign) 加载 (超时时间: 30秒)...");
      await this.page.waitForFunction(
        "() => typeof window.byted_acrawler?.frontierSign === 'function'",
        { timeout: 30000 }
      );
      console.log("✅ 关键签名函数已在启动时成功加载！");

      if (!this.msToken) {
        console.log("⏳ 等待 msToken 出现，最长等待 10 秒...");
        await new Promise(resolve => setTimeout(resolve, 10000));
        if (!this.msToken) {
          console.warn("⚠️ 在额外等待后，依然未能捕获到初始 msToken。后续请求将依赖响应头更新。");
        }
      }

      console.log("✅ Playwright 管理器 (签名服务模式) 初始化完成");
      this.initialized = true;
    } catch (error) {
      console.error(`❌ Playwright 初始化失败: ${error}`);
      throw error;
    }
  }

  public updateMsToken(token: string): void {
    this.msToken = token;
  }

  public getMsToken(): string | null {
    return this.msToken;
  }

  public async getSignedUrl(baseUrl: string, baseParams: Record<string, string>): Promise<string | null> {
    if (!this.initialized || !this.page) {
      throw new Error("PlaywrightManager 未初始化");
    }

    try {
      console.log("🔐 正在使用 Playwright 生成 a_bogus 签名...");

      const finalParams = { ...baseParams };
      finalParams.web_tab_id = crypto.randomUUID();

      if (this.msToken) {
        finalParams.msToken = this.msToken;
      } else {
        console.error("❌ msToken 未被初始化，无法构建有效请求！");
        return null;
      }

      const sortedParams = Object.keys(finalParams)
        .sort()
        .reduce((acc, key) => {
          acc[key] = finalParams[key];
          return acc;
        }, {} as Record<string, string>);

      const finalQueryString = new URLSearchParams(sortedParams).toString();
      const urlWithParams = `${baseUrl}?${finalQueryString}`;

      console.log(`🔐 正在调用 window.byted_acrawler.frontierSign 生成签名: "${finalQueryString}"`);
      const signatureObj = await this.page.evaluate(
        (queryString: string) => {
          return (window as any).byted_acrawler.frontierSign(queryString);
        },
        finalQueryString
      );

      if (typeof signatureObj === "object" && (signatureObj.a_bogus || signatureObj["X-Bogus"])) {
        const bogusValue = signatureObj.a_bogus || signatureObj["X-Bogus"];
        console.log(`✅ 成功解析签名对象，获取到 a_bogus: ${bogusValue}`);
        const signedUrl = `${urlWithParams}&a_bogus=${bogusValue}`;
        return signedUrl;
      } else {
        console.error(`❌ 调用签名函数失败，返回值不是预期的格式或缺少 a_bogus: ${JSON.stringify(signatureObj)}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Playwright 签名时发生严重错误: ${error}`);
      return null;
    }
  }

  public async close(): Promise<void> {
    if (this.initialized && this.browser) {
      await this.browser.close();
      this.initialized = false;
      console.log("👋 Playwright 管理器已关闭");
    }
  }
}

// ============================================================================
// Doubao Provider - 核心业务逻辑
// ============================================================================

class DoubaoProvider {
  private credentialManager: CredentialManager;
  private sessionManager: SessionManager;
  private playwrightManager: PlaywrightManager;
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
    this.credentialManager = new CredentialManager(config.DOUBAO_COOKIES);
    this.sessionManager = new SessionManager(config.SESSION_CACHE_TTL);
    this.playwrightManager = new PlaywrightManager(config);
  }

  public async initialize(): Promise<void> {
    await this.playwrightManager.initialize(this.config.DOUBAO_COOKIES);
  }

  public async close(): Promise<void> {
    await this.playwrightManager.close();
  }

  private getDynamicCookie(baseCookie: string): string {
    const latestMsToken = this.playwrightManager.getMsToken();
    if (!latestMsToken) {
      console.warn("⚠️ 动态 Cookie 更新失败：Playwright 管理器中没有可用的 msToken。将使用原始 Cookie。");
      return baseCookie;
    }

    if (baseCookie.includes("msToken=")) {
      const newCookie = baseCookie.replace(/msToken=[^;]+/, `msToken=${latestMsToken}`);
      console.log("✅ 成功将动态 msToken 更新到 Cookie 头中");
      return newCookie;
    } else {
      const newCookie = `${baseCookie.replace(/;$/, "")}; msToken=${latestMsToken}`;
      console.log("✅ 原始 Cookie 中未找到 msToken，已追加最新的 msToken");
      return newCookie;
    }
  }

  private prepareHeaders(cookie: string): Record<string, string> {
    return {
      "Accept": "*/*",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Content-Type": "application/json",
      "Cookie": cookie,
      "Origin": "https://www.doubao.com",
      "Referer": "https://www.doubao.com/chat/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
      "agw-js-conv": "str, str",
      "sec-ch-ua": '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
    };
  }

  private preparePayload(messages: Array<{ role: string; content: string }>, botId: string, conversationId: string): Record<string, unknown> {
    const lastUserMessage = messages.slice().reverse().find(m => m.role === "user");
    if (!lastUserMessage) {
      throw new Error("未找到用户消息");
    }

    const payload: Record<string, unknown> = {
      messages: [{
        content: JSON.stringify({ text: lastUserMessage.content }),
        content_type: 2001,
        attachments: [],
        references: [],
      }],
      completion_option: {
        is_regen: false,
        with_suggest: true,
        need_create_conversation: conversationId === "0",
        launch_stage: 1,
        is_replace: false,
        is_delete: false,
        message_from: 0,
        action_bar_skill_id: 0,
        use_deep_think: false,
        use_auto_cot: true,
        resend_for_regen: false,
        enable_commerce_credit: false,
        event_id: "0",
      },
      evaluate_option: {
        web_ab_params: "",
      },
      conversation_id: conversationId,
      local_conversation_id: `local_${crypto.randomUUID().replace(/-/g, "")}`,
      local_message_id: crypto.randomUUID(),
    };

    if (conversationId !== "0") {
      payload.bot_id = botId;
    }

    return payload;
  }

  public async chatCompletion(requestData: Record<string, unknown>): Promise<Response> {
    const isStream = requestData.stream !== false;

    if (isStream) {
      return this.streamCompletion(requestData);
    } else {
      return this.nonStreamCompletion(requestData);
    }
  }

  private async nonStreamCompletion(requestData: Record<string, unknown>): Promise<Response> {
    const sessionId = (requestData.user as string) || `session-${crypto.randomUUID().replace(/-/g, "")}`;
    const messages = (requestData.messages as Array<{ role: string; content: string }>) || [];
    const userModel = (requestData.model as string) || this.config.DEFAULT_MODEL;

    const botId = this.config.MODEL_MAPPING[userModel];
    if (!botId) {
      return new Response(
        JSON.stringify({ error: { message: `不支持的模型: ${userModel}`, type: "invalid_request_error" } }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const sessionData = this.sessionManager.getSession(sessionId) || {};
    const conversationId = (sessionData.conversation_id as string) || "0";
    const isNewConversation = conversationId === "0";

    const requestId = `chatcmpl-${crypto.randomUUID()}`;
    let newConversationId: string | null = null;
    const fullContent: string[] = [];
    let streamedAnyData = false;

    try {
      const baseCookie = this.credentialManager.getCredential();
      const finalCookie = this.getDynamicCookie(baseCookie);
      const baseUrl = "https://www.doubao.com/samantha/chat/completion";
      const baseParams = {
        aid: "497858",
        device_platform: "web",
        language: "zh",
        pc_version: "2.41.0",
        pkg_type: "release_version",
        real_aid: "497858",
        region: "CN",
        samantha_web: "1",
        sys_region: "CN",
        "use-olympus-account": "1",
        version_code: "20800",
      };

      const headers = this.prepareHeaders(finalCookie);
      const payload = this.preparePayload(messages, botId, conversationId);

      console.log("--- 准备向上游发送的完整请求包 (非流式) ---");
      console.log(`请求方法: POST`);
      console.log(`基础URL: ${baseUrl}`);
      console.log(`请求载荷 (Payload):\n${JSON.stringify(payload, null, 2)}`);
      console.log("------------------------------------");

      const signedUrl = await this.playwrightManager.getSignedUrl(baseUrl, baseParams);
      if (!signedUrl) {
        throw new Error("无法获取 a_bogus 签名, Playwright 服务可能异常");
      }

      console.log(`✅ 签名成功，最终请求 URL: ${signedUrl}`);

      const response = await fetch(signedUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const newMsToken = response.headers.get("x-ms-token");
      if (newMsToken) {
        this.playwrightManager.updateMsToken(newMsToken);
        console.log(`✅ 从响应头中捕获并更新了 msToken: ${newMsToken}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ 上游服务器返回错误状态码: ${response.status}`);
        console.error(`上游服务器响应内容: ${errorText}`);
        throw new Error(`Upstream error: ${response.status}`);
      }

      console.log(`✅ 成功连接到上游服务器, 状态码: ${response.status}. 开始接收响应...`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) {
        throw new Error("Response body is null");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          console.log(`上游原始响应行: ${line}`);
          streamedAnyData = true;

          if (!line.startsWith("data:")) {
            continue;
          }

          const contentStr = line.slice(5).trim();
          if (!contentStr) {
            continue;
          }

          try {
            const data = JSON.parse(contentStr);

            if (data.event_type === 2002 && !newConversationId) {
              const eventData = JSON.parse(data.event_data || "{}");
              newConversationId = eventData.conversation_id;
              console.log(`✅ 捕获到新会话 ID: ${newConversationId}`);
            }

            if (data.event_type === 2001) {
              const eventData = JSON.parse(data.event_data || "{}");
              const messageData = eventData.message || {};
              const contentJson = JSON.parse(messageData.content || "{}");
              const deltaContent = contentJson.text || "";
              if (deltaContent) {
                fullContent.push(deltaContent);
              }
            }
          } catch (_e) {
            // Skip invalid JSON
          }
        }
      }

      if (!streamedAnyData) {
        console.error("❌ 上游服务器返回了 200 OK，但没有发送任何数据流。这通常是由于反爬虫策略触发。");
        throw new Error("服务器连接成功但未返回数据流，请求可能被上游服务拦截。请检查Cookie是否过期或IP是否被限制。");
      }

      if (isNewConversation && newConversationId) {
        this.sessionManager.updateSession(sessionId, { conversation_id: newConversationId });
        console.log(`✅ 为用户 '${sessionId}' 保存了新的会话 ID: ${newConversationId}`);
      }

      const finalText = fullContent.join("");

      console.log("\n--- [非流式] 完整响应内容 ---");
      console.log(finalText);
      console.log("---------------------------------\n");

      const responseData = {
        id: requestId,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: userModel,
        choices: [{
          index: 0,
          message: { role: "assistant", content: finalText },
          finish_reason: "stop",
        }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };

      return new Response(JSON.stringify(responseData), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error(`❌ 处理非流式请求时发生严重错误: ${error}`);
      return new Response(
        JSON.stringify({
          error: {
            message: `内部服务器错误: ${error}`,
            type: "server_error",
            code: null,
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  private async streamCompletion(requestData: Record<string, unknown>): Promise<Response> {
    const sessionId = (requestData.user as string) || `session-${crypto.randomUUID().replace(/-/g, "")}`;
    const messages = (requestData.messages as Array<{ role: string; content: string }>) || [];
    const userModel = (requestData.model as string) || this.config.DEFAULT_MODEL;

    const botId = this.config.MODEL_MAPPING[userModel];
    if (!botId) {
      const stream = new ReadableStream({
        start(controller) {
          const errorChunk = createChatCompletionChunk(`chatcmpl-${crypto.randomUUID()}`, userModel, `不支持的模型: ${userModel}`, "stop");
          controller.enqueue(new TextEncoder().encode(createSseData(errorChunk)));
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
      });
    }

    const self = this;
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const sessionData = self.sessionManager.getSession(sessionId) || {};
          const conversationId = (sessionData.conversation_id as string) || "0";
          const isNewConversation = conversationId === "0";

          const requestId = `chatcmpl-${crypto.randomUUID()}`;
          let newConversationId: string | null = null;
          let streamedAnyData = false;

          const baseCookie = self.credentialManager.getCredential();
          const finalCookie = self.getDynamicCookie(baseCookie);
          const baseUrl = "https://www.doubao.com/samantha/chat/completion";
          const baseParams = {
            aid: "497858",
            device_platform: "web",
            language: "zh",
            pc_version: "2.41.0",
            pkg_type: "release_version",
            real_aid: "497858",
            region: "CN",
            samantha_web: "1",
            sys_region: "CN",
            "use-olympus-account": "1",
            version_code: "20800",
          };

          const headers = self.prepareHeaders(finalCookie);
          const payload = self.preparePayload(messages, botId, conversationId);

          console.log("--- 准备向上游发送的完整请求包 (流式) ---");
          console.log(`请求方法: POST`);
          console.log(`基础URL: ${baseUrl}`);
          console.log(`请求载荷 (Payload):\n${JSON.stringify(payload, null, 2)}`);
          console.log("------------------------------------");

          const signedUrl = await self.playwrightManager.getSignedUrl(baseUrl, baseParams);
          if (!signedUrl) {
            throw new Error("无法获取 a_bogus 签名, Playwright 服务可能异常");
          }

          console.log(`✅ 签名成功，最终请求 URL: ${signedUrl}`);
          console.log("\n--- [流式] 响应内容 ---");

          const response = await fetch(signedUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
          });

          const newMsToken = response.headers.get("x-ms-token");
          if (newMsToken) {
            self.playwrightManager.updateMsToken(newMsToken);
            console.log(`✅ 从响应头中捕获并更新了 msToken: ${newMsToken}`);
          }

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ 上游服务器返回错误状态码: ${response.status}`);
            console.error(`上游服务器响应内容: ${errorText}`);
            throw new Error(`Upstream error: ${response.status}`);
          }

          console.log(`✅ 成功连接到上游服务器, 状态码: ${response.status}. 开始接收响应...`);

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          if (!reader) {
            throw new Error("Response body is null");
          }

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              console.log(`上游原始响应行: ${line}`);
              streamedAnyData = true;

              if (!line.startsWith("data:")) {
                continue;
              }

              const contentStr = line.slice(5).trim();
              if (!contentStr) {
                continue;
              }

              try {
                const data = JSON.parse(contentStr);

                if (data.event_type === 2002 && !newConversationId) {
                  const eventData = JSON.parse(data.event_data || "{}");
                  newConversationId = eventData.conversation_id;
                  console.log(`✅ 捕获到新会话 ID: ${newConversationId}`);
                }

                if (data.event_type === 2001) {
                  const eventData = JSON.parse(data.event_data || "{}");
                  const messageData = eventData.message || {};
                  const contentJson = JSON.parse(messageData.content || "{}");
                  const deltaContent = contentJson.text || "";
                  if (deltaContent) {
                    Deno.stdout.writeSync(new TextEncoder().encode(deltaContent));
                    const chunk = createChatCompletionChunk(requestId, userModel, deltaContent);
                    controller.enqueue(new TextEncoder().encode(createSseData(chunk)));
                  }
                }
              } catch (_e) {
                // Skip invalid JSON
              }
            }
          }

          if (streamedAnyData) {
            console.log("\n--------------------------\n");
          }

          if (!streamedAnyData) {
            console.error("❌ 上游服务器返回了 200 OK，但没有发送任何数据流。这通常是由于反爬虫策略触发。");
            const errorMessage = "服务器连接成功但未返回数据流，请求可能被上游服务拦截。请检查Cookie是否过期或IP是否被限制。";
            const errorChunk = createChatCompletionChunk(requestId, userModel, errorMessage, "stop");
            controller.enqueue(new TextEncoder().encode(createSseData(errorChunk)));
            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          if (isNewConversation && newConversationId) {
            self.sessionManager.updateSession(sessionId, { conversation_id: newConversationId });
            console.log(`✅ 为用户 '${sessionId}' 保存了新的会话 ID: ${newConversationId}`);
          }

          const finalChunk = createChatCompletionChunk(requestId, userModel, "", "stop");
          controller.enqueue(new TextEncoder().encode(createSseData(finalChunk)));
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error(`❌ 处理流时发生严重错误: ${error}`);
          console.log("\n--- [流式] 发生错误 ---\n");
          const errorChunk = createChatCompletionChunk(`chatcmpl-${crypto.randomUUID()}`, userModel, `内部服务器错误: ${error}`, "stop");
          controller.enqueue(new TextEncoder().encode(createSseData(errorChunk)));
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
    });
  }

  public getModels(): Response {
    const models = Object.keys(this.config.MODEL_MAPPING).map(name => ({
      id: name,
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: "lzA6",
    }));

    return new Response(JSON.stringify({ object: "list", data: models }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ============================================================================
// SSE 工具函数
// ============================================================================

function createSseData(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function createChatCompletionChunk(
  requestId: string,
  model: string,
  content: string,
  finishReason: string | null = null
): Record<string, unknown> {
  return {
    id: requestId,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta: { content },
        finish_reason: finishReason,
      },
    ],
  };
}

// ============================================================================
// HTTP 服务器 & 路由
// ============================================================================

async function verifyApiKey(request: Request, config: AppConfig): Promise<Response | null> {
  if (config.API_MASTER_KEY && config.API_MASTER_KEY !== "1") {
    const authorization = request.headers.get("Authorization");
    if (!authorization || !authorization.toLowerCase().includes("bearer")) {
      return new Response(
        JSON.stringify({ error: { message: "需要 Bearer Token 认证", type: "authentication_error" } }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const token = authorization.split(" ").pop();
    if (token !== config.API_MASTER_KEY) {
      return new Response(
        JSON.stringify({ error: { message: "无效的 API Key", type: "authentication_error" } }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  return null;
}

async function handleRequest(request: Request, provider: DoubaoProvider, config: AppConfig): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname === "/") {
    return new Response(
      JSON.stringify({ message: `欢迎来到 ${config.APP_NAME} v${config.APP_VERSION}. 服务运行正常。` }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const authError = await verifyApiKey(request, config);
  if (authError) {
    return authError;
  }

  if (pathname === "/v1/models" && request.method === "GET") {
    return provider.getModels();
  }

  if (pathname === "/v1/chat/completions" && request.method === "POST") {
    try {
      const requestData = await request.json();
      console.log(`📨 收到客户端请求 /v1/chat/completions:\n${JSON.stringify(requestData, null, 2)}`);
      return await provider.chatCompletion(requestData);
    } catch (error) {
      console.error(`❌ 处理聊天请求时发生顶层错误: ${error}`);
      return new Response(
        JSON.stringify({ error: { message: `内部服务器错误: ${error}`, type: "server_error" } }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return new Response("Not Found", { status: 404 });
}

// ============================================================================
// 主函数 - 应用启动入口
// ============================================================================

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║            doubao-2api - Deno 单文件版本                       ║");
  console.log("║    将 doubao.com 转换为 OpenAI 兼容 API 的高性能代理         ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("");

  const configManager = new ConfigManager();
  const config = configManager.getConfig();

  console.log(`🚀 应用启动中... ${config.APP_NAME} v${config.APP_VERSION}`);

  const provider = new DoubaoProvider(config);
  await provider.initialize();

  console.log("✅ 服务已进入 'JS-Signature-as-a-Service' 模式");
  console.log(`🌐 服务将在 http://localhost:${config.NGINX_PORT} 上可用`);
  console.log("");

  const abortController = new AbortController();

  Deno.addSignalListener("SIGINT", () => {
    console.log("\n\n🛑 收到终止信号，正在关闭服务...");
    abortController.abort();
  });

  try {
    await Deno.serve(
      {
        port: config.NGINX_PORT,
        signal: abortController.signal,
        onListen: ({ hostname, port }) => {
          console.log(`✅ 服务器已启动在 http://${hostname}:${port}`);
        },
      },
      (request) => handleRequest(request, provider, config)
    ).finished;
  } catch (error) {
    if ((error as Error).name !== "AbortError") {
      console.error(`❌ 服务器错误: ${error}`);
    }
  } finally {
    await provider.close();
    console.log("👋 应用关闭");
  }
}

if (import.meta.main) {
  main();
}
