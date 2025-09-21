import { Context } from "grammy";
import { pool } from "../db.ts";

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
