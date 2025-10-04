import { Telegraf, Context, Markup } from "telegraf";

export function setupAppCommand(bot: Telegraf<Context>) {
  bot.command("app", async (ctx) => {
    await ctx.reply("🚀 Открой мини-приложение:", 
      Markup.inlineKeyboard([
        [
          Markup.button.webApp("Открыть приложение", "https://tma-fitst-project.onrender.com")
        ]
      ])
    );
  });
}
