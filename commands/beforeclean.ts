// commands/beforeclean.ts
import { Bot, Context } from "grammy";
import { pool } from "../db.ts";

const OWNER_ID = Number(process.env.OWNER_ID);

export function setupBeforeCleanCommand(bot: Bot) {
  bot.command("beforeclean", async (ctx: Context) => {
    // Только владелец
    if (!ctx.from || ctx.from.id !== OWNER_ID) {
      await ctx.reply("❌ Эта команда доступна только владельцу бота.");
      return;
    }

    if (!ctx.chat || (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup")) {
      await ctx.reply("Эту команду можно использовать только в группах.[beforeclean]");
      return;
    }

    const chatId = ctx.chat.id;

    try {
      // Получаем список неактивных пользователей
      const res = await pool.query(
        `SELECT user_id, MAX(date) AS last_active
         FROM comments
         WHERE chat_id = $1
         GROUP BY user_id
         HAVING MAX(date) < NOW() - INTERVAL '30 days'`,
        [chatId]
      );

      if (res.rows.length === 0) {
        await ctx.reply("Все участники активны за последние 30 дней ✅");
        return;
      }

      let msg = "Пользователи, которых будет удалять /clean:\n\n";
      for (const row of res.rows) {
        msg += `• ID: ${row.user_id}, последний раз активен: ${row.last_active}\n`;
      }

      await ctx.reply(msg);
    } catch (err) {
      console.error("[beforeclean] Ошибка при получении списка:", err);
      await ctx.reply("Произошла ошибка при попытке получения списка неактивных участников.");
    }
  });
}
