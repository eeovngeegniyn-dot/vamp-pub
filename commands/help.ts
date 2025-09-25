import { Context, Bot } from "grammy";

const commandCooldowns = new Map<string, number>(); // ключ — `${userId}:${command}`

// функция для регистрации команды /help
export function setupHelpCommand(bot: Bot) {
  // Через стандартный command
  bot.command("help", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const key = `${userId}:help`;
    const now = Date.now();

    if (commandCooldowns.has(key)) {
      const lastTime = commandCooldowns.get(key)!;
      const diff = now - lastTime;
      const cooldownMs = 60_000; // 1 минута
      if (diff < cooldownMs) {
        const remainingSec = Math.ceil((cooldownMs - diff) / 1000);
        return ctx.reply(`⏱ Подождите ${remainingSec} секунд перед повторным использованием команды.`);
      }
    }

    commandCooldowns.set(key, now);

    await ctx.reply(`Вы вызвали команду /help\n
Вам доступны следующие команды:\n
/random - рандомный выбор среди количества указанных участников(минимальное значение по умолчанию указано 1)\n
/id - просмотр собственного id, username и id текущего чата, а также статистики активности\n
/id @username/id - просмотр id, username и id текущего чата указанного пользователя\n\n
Если вы администратор, то нажмите кнопку ниже для получения доступа к командам.\n\n
Если у вас остались вопросы, то напишите @eovngeegniyn`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Для админов", callback_data: "admin_button" }],
        ],
      },
    });
    // Попытка удалить команду пользователя через 1 секунду
  setTimeout(async () => {
    try {
      await ctx.deleteMessage();
    } catch (err) {
      console.error("Не удалось удалить сообщение:", err);
    }
  }, 3000);
  });

  // Обработчик нажатия на кнопку "Для админов"
bot.callbackQuery("admin_button", async (ctx) => {
  if (!ctx.callbackQuery || !ctx.chat || !ctx.from) return;

  try {
    const userId = ctx.from.id;

    // Проверяем статус пользователя в чате
    const member = await ctx.getChatMember(userId);
    if (["administrator", "creator"].includes(member.status)) {
      // Админ — отправляем в личку
      await ctx.api.sendMessage(
        userId,
        `Команды администраторов:\n
        /mes №сообщения - поиск комментария по номеру.\n 
        Обратите внимание, что данное сообщение должно быть отправлено в обсуждении к выбранному посту, в котором вы хотите найти сообщение по номеру.\n`
      );

      // Закрываем "loading..."
      await ctx.answerCallbackQuery();
    } else {
      // Не админ — показываем всплывающее окно
      await ctx.answerCallbackQuery({
        text: "❌ У вас нет доступа",
        show_alert: true,
      });
    }
  } catch (err) {
    console.error("Ошибка при проверке админа:", err);
  }
});


}
