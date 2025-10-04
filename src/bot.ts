import { Telegraf } from "telegraf";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/StringSession.js";
import promptSync from "prompt-sync";
import * as dotenv from "dotenv";
import { setupStartCommand } from "./commands/start";
import { setupAppCommand } from "./commands/app";

dotenv.config();
const prompt = promptSync();

// --------------------
// MTProto Client Setup
// --------------------
const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH!;
const stringSession = new StringSession(process.env.STRING_SESSION || "");
const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });

async function initMTProto() {
  try {
    await client.start({
      phoneNumber: async () => prompt("Введите телефон: "),
      password: async () => prompt("Введите пароль 2FA (если есть): "),
      phoneCode: async () => prompt("Введите код из Telegram: "),
      onError: (err) => console.error("Ошибка MTProto:", err),
    });
    console.log("✅ MTProto авторизация успешна");
  } catch (err) {
    console.error("❌ Не удалось авторизовать MTProto:", err);
    process.exit(1);
  }
}

// --------------------
// Telegraf Bot Setup
// --------------------
const bot = new Telegraf(process.env.BOT_TOKEN!);

// --------------------
// Registred Commands
// --------------------
setupStartCommand(bot);
setupAppCommand(bot);

// --------------------
// /users Command
// --------------------
bot.command("users", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  try {
    // Проверяем, что вызвавший — админ
    const admins = await ctx.getChatAdministrators();
    const isAdmin = admins.some((admin) => admin.user.id === ctx.from?.id);

    if (!isAdmin) {
      const warnMsg = await ctx.reply("⛔ У вас нет доступа", {
        reply_parameters: {
          message_id: ctx.message?.message_id,
        },
    });
      setTimeout(() => ctx.deleteMessage(warnMsg.message_id).catch(() => {}), 3000);
      return;
    }

    // Получаем участников через MTProto
    const chat = await client.getEntity(chatId);
    const participants = await client.getParticipants(chat);

    if (!participants.length) {
      await ctx.reply("👥 Нет участников.");
      return;
    }

    let response = `👥 Участники чата (${participants.length}):\n\n`;
    participants.forEach((user: any, i: number) => {
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
      const username = user.username ? `@${user.username}` : "";
      response += `${i + 1}. ${name} ${username}\n`;
    });

    await ctx.reply(response);
  } catch (err) {
    console.error("Ошибка команды /users:", err);
    await ctx.reply("❌ Не удалось получить список участников.");
  }
});

// --------------------
// Launch Bot & MTProto
// --------------------
(async () => {
  await initMTProto();
  await bot.launch();
  console.log("🤖 Бот запущен и готов к работе!");
})();
