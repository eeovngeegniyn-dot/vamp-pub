import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import TelegramBot from "node-telegram-bot-api";

const apiId = 21752704; // api_id с my.telegram.org
const apiHash = "9f85779153dbfeff2de2c02837da5280"; // api_hash с my.telegram.org - "h";
const stringSession = new StringSession(""); // хранишь сессию здесь

// MTProto клиент
const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

// Bot API клиент
const bot = new TelegramBot("8328912086:AAEMmL5VuSmPWRMrZPVIkMk0wEB7RWoBBVw", { polling: true });

(async () => {
  console.log("Запускаем MTProto...");
  await client.start({
    phoneNumber: async () => prompt("Введите телефон: "),
    password: async () => prompt("Введите 2FA пароль: "),
    phoneCode: async () => prompt("Введите код из Telegram: "),
    onError: (err) => console.log(err),
  });
  console.log("MTProto авторизован!");
  console.log("Сессия:", client.session.save()); // сохранить, чтобы не вводить каждый раз
})();

// Команда /users через Bot API
bot.onText(/\/users/, async (msg) => {
  const chatId = msg.chat.id;

  // Используем MTProto для получения участников
  const result = await client.getParticipants(chatId, { limit: 50 });

  let users = "Список участников:\n";
  for (const u of result.users) {
    users += `- ${u.firstName} ${u.username ? "(@" + u.username + ")" : ""}\n`;
  }

  bot.sendMessage(chatId, users);
});
