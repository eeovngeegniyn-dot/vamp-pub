import { Bot } from "grammy";
import * as dotenv from "dotenv";
import { pool } from "./db.ts";
import { mesCommand, idCommand } from "./commands/mes.ts";
dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN!);

// Сохраняем комментарии в БД
bot.on("message", async (ctx, next) => {
  if (!ctx.message || !ctx.from) return;

  // Определяем postId для комментариев в треде
  const postId = ctx.message.message_thread_id || null; // null для обычных сообщений

  try {
    await pool.query(
      `INSERT INTO comments (post_id, message_id, user_id, username, text, date)
       VALUES ($1, $2, $3, $4, $5, to_timestamp($6)) ON CONFLICT DO NOTHING`,
      [
        postId,
        ctx.message.message_id,
        ctx.from.id,
        ctx.from.username || ctx.from.first_name,
        ctx.message.text ?? ctx.message.caption ?? "",
        ctx.message.date,
      ]
    );

    if (postId) {
      console.log(`Сохранили комментарий ${ctx.message.message_id} для поста ${postId}`);
    } else {
      console.log(`Сохранили обычное сообщение ${ctx.message.message_id}`);
    }
  } catch (err) {
    console.error("Ошибка при вставке сообщения в БД:", err);
  }

  await next();
});


// Регистрируем команду /mes
bot.command("mes", mesCommand);

// Команда /id
bot.command("id", idCommand);

bot.start().then(() => console.log("Бот успешно запущен!"));
