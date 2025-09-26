import { Context, Bot } from "grammy";

const commandCooldowns = new Map<string, number>(); // ключ — `${userId}:${command}`

// будем хранить состояние — кто ожидает число
const waitingForRandomInput = new Map<number, true>();

export function setupRandomCommand(bot: Bot) {
  // /random
  bot.command("random", async (ctx: Context) => {
     const userId = ctx.from?.id;
    if (!userId) return;

    const key = `${userId}:random`;
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

    // Обновляем время последнего использования
    commandCooldowns.set(key, now);
    
      setTimeout(async () => {
    try {
      await ctx.deleteMessage();
    } catch (err) {
      console.error("Не удалось удалить сообщение:", err);
    }
  }, 3000);
    waitingForRandomInput.set(ctx.from!.id, true);
    await ctx.reply("Введите количество участников (минимум 2):");
    // Попытка удалить команду пользователя через 1 секунду
  });

  // ловим все текстовые сообщения
  bot.on("message:text", async (ctx: Context) => {
    if (!ctx.from) return;

    // если пользователь сейчас в режиме ожидания
    if (waitingForRandomInput.has(ctx.from.id)) {
      const text = ctx.msg!.text!.trim();
      const num = Number(text);

      // если не число — игнорируем (не сбрасываем режим)
      if (isNaN(num)) {
        return; // просто ничего не отвечаем
      }

      // если число, но < 2 — говорим и продолжаем ждать
      if (num < 2) {
        await ctx.reply("Число должно быть ≥ 2. Введите снова:");
        return; // остаёмся в режиме ожидания
      }

      // число корректное — убираем из режима ожидания
      waitingForRandomInput.delete(ctx.from.id);

      await ctx.reply("Достаём кота с мешка...");

      setTimeout(async () => {
        const random = Math.floor(Math.random() * num) + 1;
        await ctx.reply(`🎲 Случайное число: ${random}`);
      }, 3000);
    }
  });
}
