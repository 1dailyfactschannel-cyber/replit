import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { storage } from "../postgres-storage";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  fromName?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

let transporter: Transporter | null = null;
let cachedConfig: EmailConfig | null = null;

export async function getEmailConfig(): Promise<EmailConfig | null> {
  try {
    const setting = await storage.getSiteSetting("email_config");
    if (!setting || !setting.value) return null;
    return JSON.parse(setting.value) as EmailConfig;
  } catch (error) {
    console.error("Error reading email config:", error);
    return null;
  }
}

export async function initEmailTransporter(): Promise<Transporter | null> {
  const config = await getEmailConfig();
  if (!config || !config.host || !config.user || !config.password) {
    transporter = null;
    cachedConfig = null;
    return null;
  }

  // Avoid recreating if config hasn't changed
  if (cachedConfig && JSON.stringify(cachedConfig) === JSON.stringify(config) && transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port || 587,
    secure: config.secure ?? config.port === 465,
    auth: {
      user: config.user,
      pass: config.password,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  cachedConfig = config;
  return transporter;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; message?: string }> {
  try {
    const transport = await initEmailTransporter();
    if (!transport) {
      console.log("📧 [Email skipped - no SMTP config]", options.subject, "→", options.to);
      return { success: false, message: "SMTP не настроен" };
    }

    const config = await getEmailConfig();
    const from = config?.from || config?.user || "noreply@example.com";
    const fromName = config?.fromName || "TeamSync";

    const info = await transport.sendMail({
      from: `"${fromName}" <${from}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(`✅ Email sent to ${options.to}: ${options.subject} (${info.messageId})`);
    return { success: true, message: info.messageId };
  } catch (error: any) {
    console.error("❌ Email send error:", error.message);
    return { success: false, message: error.message };
  }
}

export async function testEmailConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const transport = await initEmailTransporter();
    if (!transport) {
      return { success: false, message: "SMTP не настроен. Заполните настройки email." };
    }
    await transport.verify();
    return { success: true, message: "Подключение к SMTP успешно" };
  } catch (error: any) {
    return { success: false, message: error.message || "Ошибка подключения к SMTP" };
  }
}

// Templates
export function getWelcomeEmailTemplate(userName: string, appUrl?: string): { html: string; text: string } {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Добро пожаловать в TeamSync!</h1>
      </div>
      <div style="padding: 32px 24px; background: #ffffff;">
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Привет, <strong>${userName}</strong>!</p>
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px;">Ваш аккаунт успешно создан. Теперь вы можете использовать все возможности платформы для управления задачами, коммуникации в команде и планирования встреч.</p>
        ${appUrl ? `<a href="${appUrl}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500;">Перейти в приложение</a>` : ""}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
        <p style="font-size: 13px; color: #6b7280; margin: 0;">Если вы не регистрировались на TeamSync, проигнорируйте это письмо.</p>
      </div>
    </div>
  `;

  const text = `Добро пожаловать в TeamSync!\n\nПривет, ${userName}!\n\nВаш аккаунт успешно создан. Теперь вы можете использовать все возможности платформы.\n\n${appUrl ? `Перейти: ${appUrl}` : ""}`;

  return { html, text };
}

export function getPasswordChangeCodeTemplate(userName: string, code: string, expiresMinutes: number = 10): { html: string; text: string } {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Подтверждение смены пароля</h1>
      </div>
      <div style="padding: 32px 24px; background: #ffffff;">
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Здравствуйте, <strong>${userName}</strong>!</p>
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px;">Вы запросили смену мастер-пароля. Для подтверждения операции введите код ниже в приложении:</p>
        <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6366f1; font-family: monospace;">${code}</span>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin: 0 0 16px;">Код действителен в течение <strong>${expiresMinutes} минут</strong>.</p>
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px;">
          <p style="font-size: 14px; color: #92400e; margin: 0;"><strong>Важно:</strong> если вы не запрашивали смену пароля, немедленно свяжитесь с администратором — возможно, кто-то пытается получить доступ к вашему аккаунту.</p>
        </div>
      </div>
    </div>
  `;

  const text = `Подтверждение смены пароля\n\nЗдравствуйте, ${userName}!\n\nВы запросили смену мастер-пароля. Для подтверждения операции введите код: ${code}\n\nКод действителен в течение ${expiresMinutes} минут.\n\nЕсли вы не запрашивали смену пароля, немедленно свяжитесь с администратором.`;

  return { html, text };
}

export function getPasswordChangedTemplate(userName: string): { html: string; text: string } {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #f3f4f6; padding: 32px 24px; text-align: center; border-bottom: 3px solid #6366f1;">
        <h1 style="color: #1a1a1a; margin: 0; font-size: 20px;">Пароль изменен</h1>
      </div>
      <div style="padding: 32px 24px; background: #ffffff;">
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Здравствуйте, <strong>${userName}</strong>!</p>
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px;">Пароль от вашего аккаунта TeamSync был успешно изменен. Если это были не вы, немедленно свяжитесь с администратором.</p>
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px;">
          <p style="font-size: 14px; color: #92400e; margin: 0;"><strong>Совет безопасности:</strong> используйте уникальные пароли для каждого сервиса и включите двухфакторную аутентификацию, где это возможно.</p>
        </div>
      </div>
    </div>
  `;

  const text = `Пароль изменен\n\nЗдравствуйте, ${userName}!\n\nПароль от вашего аккаунта TeamSync был успешно изменен. Если это были не вы, немедленно свяжитесь с администратором.`;

  return { html, text };
}
