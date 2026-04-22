import { getStorage } from "../postgres-storage";

const TELEGRAM_API = "https://api.telegram.org/bot";

let cachedBotToken: string | null = null;
let tokenCacheTime = 0;

async function getBotToken(): Promise<string | null> {
  // Cache token for 60 seconds to avoid repeated DB queries
  if (cachedBotToken && Date.now() - tokenCacheTime < 60000) {
    return cachedBotToken;
  }
  try {
    const storage = getStorage();
    const setting = await storage.getSiteSetting("tg_bot_token");
    cachedBotToken = setting?.value || null;
    tokenCacheTime = Date.now();
    return cachedBotToken;
  } catch (error) {
    console.error("[Telegram] Failed to get bot token:", error);
    return null;
  }
}

export async function sendTelegramMessage(chatId: string, text: string, options?: { parseMode?: "HTML" | "MarkdownV2" }) {
  const token = await getBotToken();
  if (!token) {
    console.warn("[Telegram] Bot token not configured, skipping message");
    return null;
  }

  try {
    const url = `${TELEGRAM_API}${token}/sendMessage`;
    const body = {
      chat_id: chatId,
      text: text.substring(0, 4096), // Telegram limit
      parse_mode: options?.parseMode || "HTML",
      disable_web_page_preview: true,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!data.ok) {
      console.error("[Telegram] API error:", data.description);
      return null;
    }
    return data.result;
  } catch (error) {
    console.error("[Telegram] Failed to send message:", error);
    return null;
  }
}

export async function setTelegramWebhook(botToken: string, webhookUrl: string): Promise<boolean> {
  try {
    const url = `${TELEGRAM_API}${botToken}/setWebhook`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message"] }),
    });
    const data = await response.json();
    if (!data.ok) {
      console.error("[Telegram] Failed to set webhook:", data.description);
      return false;
    }
    console.log("[Telegram] Webhook set successfully");
    return true;
  } catch (error) {
    console.error("[Telegram] Failed to set webhook:", error);
    return false;
  }
}

interface TelegramUpdate {
  message?: {
    chat: { id: number; username?: string; first_name?: string };
    text?: string;
    from: { id: number; username?: string };
  };
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<string | null> {
  const message = update.message;
  if (!message || !message.text) return null;

  const chatId = message.chat.id.toString();
  const text = message.text.trim();

  // Handle /start command
  if (text.startsWith("/start")) {
    const parts = text.split(" ");
    const param = parts[1] || "";

    if (param.startsWith("connect_")) {
      const userId = param.replace("connect_", "");
      try {
        const storage = getStorage();
        const user = await storage.getUser(userId);
        if (!user) {
          return "❌ Пользователь не найден. Пожалуйста, авторизуйтесь в приложении и попробуйте снова.";
        }

        await storage.updateUser(userId, {
          telegramId: chatId,
          telegramConnected: true,
        });

        return `✅ <b>Telegram подключён!</b>\n\nПривет, ${user.firstName || user.username || "пользователь"}!\n\nТеперь вы будете получать важные уведомления прямо сюда — упоминания в чате, комментариях к задачам и другие важные события.`;
      } catch (error) {
        console.error("[Telegram] Failed to connect user:", error);
        return "❌ Ошибка подключения. Попробуйте позже.";
      }
    }

    return `👋 <b>Привет!</b>\n\nЯ бот уведомлений <b>TeamSync</b>.\n\nЧтобы получать уведомления:\n1. Авторизуйтесь в приложении\n2. Перейдите в Профиль → Уведомления\n3. Нажмите «Подключить Telegram»`;
  }

  return null;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function autoSetTelegramWebhook(): Promise<void> {
  const appUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || process.env.VERCEL_URL;
  if (!appUrl) {
    console.warn("[Telegram] APP_URL not set. Skipping automatic webhook setup. Set APP_URL to enable Telegram bot.");
    return;
  }

  const token = await getBotToken();
  if (!token) {
    console.warn("[Telegram] Bot token not configured. Skipping webhook setup.");
    return;
  }

  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/webhook/telegram`;

  try {
    // Check current webhook status
    const infoRes = await fetch(`${TELEGRAM_API}${token}/getWebhookInfo`);
    const info = await infoRes.json();

    if (info.ok && info.result?.url === webhookUrl) {
      console.log("[Telegram] Webhook already set correctly:", webhookUrl);
      return;
    }

    const success = await setTelegramWebhook(token, webhookUrl);
    if (success) {
      console.log("[Telegram] Webhook auto-configured:", webhookUrl);
    } else {
      console.error("[Telegram] Failed to auto-configure webhook.");
    }
  } catch (error) {
    console.error("[Telegram] Error during auto webhook setup:", error);
  }
}
