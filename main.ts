import { Bot } from "grammy";
import * as dotenv from "dotenv";
import { pool } from "./db.ts";
import { mesCommand } from "./commands/mes.ts";
dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN!);

// Сохраняем комментарии в БД
bot.on("message", async (ctx, next) => {
  if (ctx.message?.text && ctx.message.message_thread_id) {
    const postId = ctx.message.message_thread_id;

    try {
      await pool.query(
        `INSERT INTO comments (post_id, message_id, user_id, username, text, date)
         VALUES ($1, $2, $3, $4, $5, to_timestamp($6)) ON CONFLICT DO NOTHING`,
        [
          postId,
          ctx.message.message_id,
          ctx.from?.id,
          ctx.from?.username || ctx.from?.first_name,
          ctx.message.text,
          ctx.message.date,
        ]
      );
      console.log(
        `Сохранили комментарий ${ctx.message.message_id} для поста ${postId}`
      );
    } catch (err) {
      console.error("Ошибка при вставке комментария в БД:", err);
    }
  }

  await next();
});

// Регистрируем команду /mes
bot.command("mes", mesCommand);

bot.start().then(() => console.log("Бот успешно запущен!"));
