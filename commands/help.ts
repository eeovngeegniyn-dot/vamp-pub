import { Context, Bot } from "grammy";

// функция для регистрации команды /help
export function setupHelpCommand(bot: Bot) {
  bot.command("help", async (ctx: Context) => {
    await ctx.reply(`Помощь на стадии разработки`);
  });
}
