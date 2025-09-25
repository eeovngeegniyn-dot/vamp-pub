import { Bot, Context } from "grammy";
import * as dotenv from "dotenv";
import { pool } from "./db.ts";
import { mesCommand, idCommand } from "./commands/mes.ts";
import { setupRandomCommand } from "./commands/random.ts";
import { setupHelpCommand } from "./commands/help.ts";

dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN!);

bot.command("start", async (ctx: Context) => {
    await ctx.reply(`Я тут!`);
    // Попытка удалить команду пользователя через 1 секунду
  setTimeout(async () => {
    try {
      await ctx.deleteMessage();
    } catch (err) {
      console.error("Не удалось удалить сообщение:", err);
    }
  }, 3000);
  });

// 1 Регистрируем команды
setupHelpCommand(bot);
bot.command("mes", mesCommand);
bot.command("id", idCommand);
setupRandomCommand(bot);

// 2 Middleware для логирования сообщений
bot.on("message", async (ctx, next) => {
  if (!ctx.message || !ctx.from) return await next();

  const postId = ctx.message.message_thread_id || null;

  // проверяем текстовое содержимое
  const text = ctx.message.text ?? ctx.message.caption ?? "";
  const isCommand = text.startsWith("/");

  // вставляем в БД только обычные сообщения (не команды)
  if (!isCommand) {
    try {
      await pool.query(
        `INSERT INTO comments (post_id, message_id, user_id, username, text, date)
         VALUES ($1, $2, $3, $4, $5, to_timestamp($6)) ON CONFLICT DO NOTHING`,
        [
          postId,
          ctx.message.message_id,
          ctx.from.id,
          ctx.from.username || ctx.from.first_name,
          text,
          ctx.message.date,
        ]
      );
    } catch (err) {
      console.error("Ошибка при вставке сообщения:", err);
    }
  }

  await next(); // обязательно
});

// 3 Запускаем бота
bot.start().then(() => console.log("Бот успешно запущен!"));
