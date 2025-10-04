import { Context, Telegraf, Markup } from "telegraf";

export function setupStartCommand(bot: Telegraf<Context>) {
  bot.start((ctx) => {
    ctx.reply(
      "Привет 👋 Добро пожаловать в моего бота!",
      Markup.inlineKeyboard([
        [Markup.button.callback("Помощь", "BUTTON_HELP_CLICK")],
        [Markup.button.callback("Рандомайзер", "BUTTON_RANDOM_CLICK")]
      ])
    );
  });

  // Обработка нажатия на кнопку
  bot.action("BUTTON_HELP_CLICK", (ctx) => {
    ctx.answerCbQuery("Кнопка 'Помощь', в данный момент, в разработке.", { show_alert: true });
  });

  bot.action("BUTTON_RANDOM_CLICK", (ctx) => {
    ctx.answerCbQuery("Кнопка 'Рандомайзер', в данный момент, в разработке.", { show_alert: true });
  });
}