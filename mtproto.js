import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/StringSession.js";
import promptSync from "prompt-sync"; 

const prompt = promptSync();

const apiId = 21752704; // api_id с my.telegram.org
const apiHash = "9f85779153dbfeff2de2c02837da5280"; // api_hash с my.telegram.org - "h";
const stringSession = new StringSession("1AgAOMTQ5LjE1NC4xNjcuNTEBuzxvCI1tiYTa677ULgOhmlLdTiFWGtwnhryGT8Cd6yqM/kZM9wcKrFJ4tUf3rvCElEldzIdQX0OcBkvWg8eMIe8WJW6OKxqBapC1waQxtHWHaJr1kUdm69t8qt13nY8HdjxbMLXOmBBDt8Vl+BK9f3ZhVSpyB5j2E4lt2WhSYNxGpf+EG80wzLSDlSWyIVcUH8dDW4zQ1QpxcXLOQetDNP3LQMhP0h75TiRU7v4TF40hX42x+OpPC6uVqGN86B9k3ZAnEzb7QF/5b8cgjASV84GYIO2WGvFhQ+mnEVjgTezSNfIphSNoJH9pUpXsUYsIV0QdWRxBfmUPrXQVIj+90mM="); // хранишь сессию здесь

(async () => {
  console.log("Запуск MTProto...");

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => prompt("Введите телефон: "),
    password: async () => prompt("Введите пароль 2FA (если есть): "),
    phoneCode: async () => prompt("Введите код из Telegram: "),
    onError: (err) => console.log(err),
  });

  console.log("Авторизация успешна!");
  console.log("Сессия:", client.session.save());
})();
