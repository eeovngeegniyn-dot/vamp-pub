import { Context, Bot } from "grammy";

// будем хранить состояние — кто ожидает число
const waitingForRandomInput = new Map<number, true>();

export function setupRandomCommand(bot: Bot) {
  // /random
  bot.command("random", async (ctx: Context) => {
    waitingForRandomInput.set(ctx.from!.id, true);
    await ctx.reply("Введите количество участников (минимум 2):");
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
