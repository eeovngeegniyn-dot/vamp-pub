import { Context, Bot } from "grammy";
import { pool } from "../db.ts";

export function setupMessageLogger(bot: Bot) {
  bot.on("message", async (ctx) => {
    if (!ctx.from || !ctx.chat) return;

    // Если это обычное сообщение — post_id = NULL
    let postId: number | null = null;

    // Если сообщение является комментарием к посту (например, reply_to_message)
    if (ctx.message.reply_to_message) {
      postId = ctx.message.reply_to_message.message_id;
    }

    try {
      await pool.query(
        `INSERT INTO comments (post_id, message_id, user_id, username, text, date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          postId,
          ctx.message.message_id,
          ctx.from.id,
          ctx.from.username ?? null,
          ctx.message.text ?? ctx.message.caption ?? "",
          new Date()
        ]
      );
    } catch (err) {
      console.error("Ошибка при записи сообщения:", err);
    }
  });
}
// Обработчик команды /mes
export async function mesCommand(ctx: Context) {
  if (!ctx.from) return;
  
  // Проверка администратора
  const member = await ctx.getChatMember(ctx.from.id);
  if (!["creator", "administrator"].includes(member.status)) {
    return ctx.reply("Только администратор может использовать эту команду.");
  }

  const args = ctx.message?.text?.split(" ");
  if (!args || args.length < 2)
    return ctx.reply("Укажите номер комментария, например /mes 5");

  const index = Number(args[1]);
  if (isNaN(index)) return ctx.reply("Номер должен быть числом.");

  // Берём postId из reply_to_message
  const postId = ctx.message!.reply_to_message?.message_id;
  if (!postId) return ctx.reply("Команду нужно писать в ответ на пост.");

  try {
    const res = await pool.query(
      `SELECT message_id, username, text FROM comments WHERE post_id=$1 ORDER BY date ASC OFFSET $2 LIMIT 1`,
      [postId, index - 1]
    );

    if (res.rows.length === 0) return ctx.reply(`Комментария №${index} нет.`);

    const row = res.rows[0];

    // Создаём ссылку на сообщение
    const chatId = ctx.chat?.id || 0;
    let messageLink = "";

    if (ctx.chat?.username) {
      // Публичный канал или группа
      messageLink = `https://t.me/${ctx.chat.username}/${row.message_id}`;
    } else {
      // Приватная группа — используем t.me/c/<id>/<msg_id>
      const internalId = Math.abs(chatId).toString().replace(/^100/, "");
      messageLink = `https://t.me/c/${internalId}/${row.message_id}`;
    }

    await ctx.reply(
      `Сообщение номер: ${index}\n\n<a href="${messageLink}">${row.text}</a>\n\n${row.username}`,
      {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      }
    );
  } catch (err) {
    console.error("Ошибка при получении комментария:", err);
    ctx.reply("Произошла ошибка при получении комментария.");
  }
}

//команда /id
export async function idCommand(ctx: Context) {
  if (!ctx.from) return;
  if (!ctx.chat) return ctx.reply("Не удалось определить чат.");

  const args = ctx.message?.text?.trim().split(/\s+/);
  const arg = args && args.length > 1 ? args[1] : null;

  let targetId: number | null = null;
  let targetUsername: string | null = null;

  if (arg) {
    if (arg.startsWith("@")) {
      // По username
      const username = arg.slice(1);
      const res = await pool.query(
        "SELECT user_id, username FROM comments WHERE username=$1 ORDER BY date DESC LIMIT 1",
        [username],
      );
      if (res.rows.length === 0) {
        return ctx.reply("❌ Пользователь с таким username не найден в базе.");
      }
      targetId = res.rows[0].user_id;
      targetUsername = "@" + res.rows[0].username;
    } else {
      // По user_id
      const idNum = Number(arg);
      if (isNaN(idNum)) {
        return ctx.reply("❌ Аргумент должен быть ID или @username.");
      }
      targetId = idNum;
      const res = await pool.query(
        "SELECT username FROM comments WHERE user_id=$1 ORDER BY date DESC LIMIT 1",
        [idNum],
      );
      targetUsername = res.rows.length ? "@" + res.rows[0].username : null;
    }
  } else {
    // Без аргументов — сам пользователь
    targetId = ctx.from.id;
    targetUsername = ctx.from.username
      ? `@${ctx.from.username}`
      : ctx.from.first_name;
  }

  // интервалы
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const statQuery = `
    SELECT
      COUNT(*) FILTER (WHERE date > $2) AS day_count,
      COUNT(*) FILTER (WHERE date > $3) AS week_count,
      COUNT(*) FILTER (WHERE date > $4) AS month_count
    FROM comments
    WHERE user_id = $1
  `;

  const res = await pool.query(statQuery, [
    targetId,
    dayAgo,
    weekAgo,
    monthAgo,
  ]);
  const stats = res.rows[0];

  await ctx.reply(
    `📊 <b>Информация о пользователе</b>\n\n` +
      `👤 Username: ${targetUsername ?? "—"}\n` +
      `🆔 ID: <code>${targetId}</code>\n` +
      `💬 ID чата: <code>${ctx.chat.id}</code>\n\n` +
      `Статистика:\n` +
      `• За 24 часа: ${stats.day_count}\n` +
      `• За 7 дней: ${stats.week_count}\n` +
      `• За 30 дней: ${stats.month_count}`,
    { parse_mode: "HTML" },
  );
}

