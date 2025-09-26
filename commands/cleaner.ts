// commands/cleaner.ts
import { Bot, Context } from "grammy";
import { pool } from "../db.ts";

const OWNER_ID = Number(process.env.OWNER_ID);

// set для защиты от двойного выполнения одного и того же апдейта
const processedMessages = new Set<string>();

export function setupCleanCommand(bot: Bot) {
  console.log("[cleaner] setupCleanCommand registering...");

  // кэшим username бота, чтобы поддержать fallback с @username
  let botUsername: string | null = null;
  bot.api.getMe()
    .then(info => { botUsername = info.username || null;})
    .catch(() => { /* ignore */ });

  const handler = async (ctx: Context) => {
    const fromId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    const msgId = ctx.message?.message_id;

    // защита от повторного исполнения для одного апдейта
    if (chatId && msgId) {
      const key = `${chatId}:${msgId}`;
      if (processedMessages.has(key)) {
        return;
      }
      processedMessages.add(key);
      // очищаем Set через некоторое время, чтобы не бесконечно расти
      setTimeout(() => processedMessages.delete(key), 60_000);
    }

    // проверяем право — только OWNER_ID
    if (!ctx.from || ctx.from.id !== OWNER_ID) {
      await ctx.reply("❌ Эта команда доступна только владельцу бота.");
      return;
    }

    if (!ctx.chat || (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup")) {
      await ctx.reply("Эту команду можно использовать только в группах.[cleaner]");
      return;
    }

    if (!chatId) {
      await ctx.reply("Не удалось определить id чата.");
      return;
    }

    try {
      // ВАЖНО: в таблице comments должен быть столбец chat_id (BIGINT).
      // Запрос получает пользователей, у которых последний (MAX) date был раньше чем 30 дней назад.
      const res = await pool.query(
        `SELECT user_id
         FROM comments
         WHERE chat_id = $1
         GROUP BY user_id
         HAVING MAX(date) < NOW() - INTERVAL '30 days'`,
        [chatId]
      );

      if (!res.rows || res.rows.length === 0) {
        await ctx.reply("Все участники активны за последние 30 дней ✅");
        return;
      }

      let removed = 0;
      for (const row of res.rows) {
        const uid = row.user_id;
        try {
          // чтобы "кикнуть" без бана: ban -> unban
          await ctx.api.banChatMember(chatId, uid);
          await ctx.api.unbanChatMember(chatId, uid);
          removed++;
          console.log(`[cleaner] kicked user ${uid} from chat ${chatId}`);
        } catch (err) {
          console.error(`[cleaner] cannot kick ${uid}:`, err);
        }
      }

      await ctx.reply(`Удалено ${removed} неактивных участников.`);
    } catch (err) {
      console.error("[cleaner] Ошибка при очистке:", err);
      await ctx.reply("Произошла ошибка при попытке очистки участников.");
    }
  };

  // регистрируем команду обычным способом
  bot.command("clean", handler);

  // fallback: если команда в группе пришла как plain-text (в некоторых случаях)
  bot.on("message:text", async (ctx) => {
    const text = ctx.msg?.text?.trim() ?? "";
    if (!text) return;

    // в группе: /clean или /clean@BotUsername
    if (ctx.chat?.type !== "private") {
      if (text === "/clean" || (botUsername && text.startsWith(`/clean@${botUsername}`))) {
        console.log("[cleaner] fallback triggered by text:", text, "from", ctx.from?.id);
        await handler(ctx);
      }
    }
  });

  console.log("[cleaner] registration done");
}
