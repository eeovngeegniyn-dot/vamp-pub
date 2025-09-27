import {Bot, Context} from "grammy";
import * as dotenv from "dotenv";
import {pool} from "./db.ts";
import {idCommand, mesCommand} from "./commands/mes.ts";
import {setupRandomCommand} from "./commands/random.ts";
import {setupHelpCommand} from "./commands/help.ts";
import {setupCleanCommand} from "./commands/cleaner.ts";
import {setupBeforeCleanCommand} from "./commands/beforeclean.ts";

dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN!);

// команда /start с авто-удалением через 3 секунды
bot.command("start", async (ctx: Context) => {
    await ctx.reply(`Я тут!`);
    // Попытка удалить команду пользователя через 1 секунду
    setTimeout(async () => {
        try {
            await ctx.deleteMessage();
        } catch (err) {
            console.error("Не удалось удалить сообщение:", err);
        }
    }, 3000);
});

// 1 регистрация всех команд через bot.command / функции setup*
setupBeforeCleanCommand(bot); //работает
setupCleanCommand(bot); //работает

setupRandomCommand(bot); // не работает
setupHelpCommand(bot); // не работает
bot.command("mes", mesCommand); // не работает
bot.command("id", idCommand); // не работает

// 2 middleware: логирование сообщений и обновление активности участников
bot.on("message", async (ctx, next) => {
    try {
        console.log(`1)Пользователь ${ctx.from.username} в чате ${ctx.chat.title} отправил сообщение: ${ctx.message.text}`);
        if (!ctx.message || !ctx.from || !ctx.chat) return await next();


        const chatId = ctx.chat.id;
        const userId = ctx.from.id;
        const username = ctx.from.username ?? null;
        const firstName = ctx.from.first_name ?? null;
        const lastName = ctx.from.last_name ?? null;
        const now = new Date();

        // Добавляем/обновляем участника
        await pool.query(
            `
                INSERT INTO chat_members (chat_id, user_id, username, first_name, last_name, last_active)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (chat_id,user_id)
                    DO UPDATE SET last_active = EXCLUDED.last_active,
                                  username    = EXCLUDED.username,
                                  first_name  = EXCLUDED.first_name,
                                  last_name   = EXCLUDED.last_name
            `,
            [chatId, userId, username, firstName, lastName, now]
        );

        console.log(`2)Пользователь ${ctx.from.username} в чате ${ctx.chat.title} отправил сообщение: ${ctx.message.text}`);

        // Логируем только обычные сообщения
        const text = ctx.message.text ?? ctx.message.caption ?? "";
        const isCommand = text.startsWith("/");

        if (!isCommand) {
            const postId = ctx.message.message_thread_id || null;
            await pool.query(
                `
                    INSERT INTO comments (chat_id, post_id, message_id, user_id, username, text, date)
                    VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7))
                    ON CONFLICT DO NOTHING
                `,
                [chatId, postId, ctx.message.message_id, userId, username || firstName, text, ctx.message.date]
            );
            console.log(`3)Пользователь ${ctx.from.username} в чате ${ctx.chat.title} отправил сообщение: ${ctx.message.text}`);
        }
    } catch (err) {
        console.error("Ошибка в middleware:", err);
    } finally {
        // Всегда вызываем next(), даже если произошла ошибка
        console.log(`4)Вызываем next() для обработки команд`);
    }
    return await next();
});


// 3️запуск бота
bot.start().then(() => console.log("Бот успешно запущен!"));
