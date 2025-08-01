const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const express = require('express');

const token = '8011091957:AAEOS_Euu9gd-JcE7mI8vTOSosaPyNO_PT8';
const channelId = '-1002734172243';

const bot = new TelegramBot(token, { 
    polling: {
        interval: 300,
        autoStart: true,
        params: {
            timeout: 10
        }
    }
});


const app = express();
const port = process.env.PORT || 3000;

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Bot is running' });
});


app.listen(port, () => {
    console.log(`Express server running on port ${port}`);
});

mongoose.connect('mongodb+srv://Ziydoulla:ziyodulla0105@cluster0.heagvwv.mongodb.net/fileBot?retryWrites=true&w=majority&appName=Cluster0', {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    autoIndex: true
});

const FileSchema = new mongoose.Schema({
    chatId: String,
    fileType: String,
    timestamp: { type: Date, default: Date.now }
});

FileSchema.index({ timestamp: 1 }, { expireAfterSeconds: 32 * 24 * 60 * 60 });

const File = mongoose.model('File', FileSchema);

let lastFileMessage = {};

const handleFile = async (chatId, fileType, msg) => {
    const file = new File({
        chatId: chatId.toString(),
        fileType: fileType.toUpperCase(),
        timestamp: new Date()
    });
    await file.save();
    
    const count = await File.countDocuments({ chatId: chatId.toString() });
    await bot.sendMessage(chatId, `Fayl qabul qilindi: ${fileType.toUpperCase()}\nJami fayllar soni: ${count}`);

    let userInfo;
    if (msg.forward_from || (msg.forward_origin && msg.forward_origin.type === 'user')) {
        const forwardUser = msg.forward_from || msg.forward_origin.sender_user;
        userInfo = forwardUser.username ? `@${forwardUser.username}` : `User ID: ${forwardUser.id}`;
    } else {
        userInfo = msg.from.username ? `@${msg.from.username}` : `User ID: ${msg.from.id}`;
    }

    lastFileMessage[chatId] = { message_id: msg.message_id, userInfo: userInfo };

    let forwardedMessage;
    if (msg.photo) {
        const photo = msg.photo[msg.photo.length - 1];
        forwardedMessage = await bot.sendPhoto(channelId, photo.file_id, {
            caption: `Kimdan: ${userInfo}`,
            reply_markup: {
                inline_keyboard: [[
                    { text: "Add", callback_data: `added_${photo.file_unique_id}` }
                ]]
            }
        });
    } else if (msg.document) {
        forwardedMessage = await bot.sendDocument(channelId, msg.document.file_id, {
            caption: `Kimdan: ${userInfo}`,
            reply_markup: {
                inline_keyboard: [[
                    { text: "Add", callback_data: `added_${msg.document.file_unique_id}` }
                ]]
            }
        });
    }
};

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    console.log('Xabar qabul qilindi:', JSON.stringify(msg, null, 2));
    console.log('Oxirgi fayl message_id:', lastFileMessage[chatId]?.message_id, 'Joriy message_id:', msg.message_id);

    if (msg.photo || msg.document) {
        const fileType = msg.document ? msg.document.mime_type.split('/')[1] : 'JPEG';
        await handleFile(chatId, fileType, msg);
    } else if (msg.text && lastFileMessage[chatId] && msg.message_id > lastFileMessage[chatId].message_id && !msg.forward_from && !msg.forward_origin) {
        const userInfo = msg.from.username ? `@${msg.from.username}` : `User ID: ${msg.from.id}`;
        await bot.sendMessage(channelId, `\n${msg.text}`);
        console.log(`Fayldan keyingi matn kanalga yuborildi: ${msg.text}`);
    } else if (msg.text && !msg.document && !msg.photo) {
        return;
    }
});

bot.on('callback_query', async (callbackQuery) => {
    try {
        const message = callbackQuery.message;
        const data = callbackQuery.data;
        console.log('Callback query:', data);

        if (data.startsWith('added_')) {
            await bot.editMessageReplyMarkup({
                inline_keyboard: [[
                    { text: "✅", callback_data: 'done' }
                ]]
            }, {
                chat_id: message.chat.id,
                message_id: message.message_id
            });

            await bot.answerCallbackQuery(callbackQuery.id, { text: 'Fayl tasdiqlandi!' });
        } else if (data === 'done') {
            await bot.answerCallbackQuery(callbackQuery.id, { text: 'Fayl allaqachon tasdiqlangan!' });
        }
    } catch (error) {
        console.error('Callback xatosi:', error.message);
        await bot.answerCallbackQuery(callbackQuery.id, { text: `Xatolik yuz berdi: ${error.message}` });
    }
});

bot.onText(/\/health/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
        const response = `Bot Status: Running ✅\nMongoDB: ${dbStatus} ✅\nTimestamp: ${moment().tz('Asia/Tashkent').format('YYYY-MM-DD HH:mm:ss')} ✅`;
        await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Health check error:', error.message);
        await bot.sendMessage(chatId, `Health check failed: ${error.message}`);
    }
});

bot.onText(/\/report/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        const now = moment().tz('Asia/Tashkent');
        const today = now.startOf('day');
        
        const shifts = [
            { start: '07:00', end: '15:00' },
            { start: '15:00', end: '23:00' },
            { start: '23:00', end: '07:00' }
        ];
        
        let report = '📊 8 soatlik hisobot:\n\n';
        
        for (const shift of shifts) {
            let start, end;
            if (shift.start === '23:00') {
                start = moment.tz(`${today.format('YYYY-MM-DD')} ${shift.start}`, 'YYYY-MM-DD HH:mm', 'Asia/Tashkent');
                end = moment.tz(`${today.clone().add(1, 'day').format('YYYY-MM-DD')} ${shift.end}`, 'YYYY-MM-DD HH:mm', 'Asia/Tashkent');
            } else {
                start = moment.tz(`${today.format('YYYY-MM-DD')} ${shift.start}`, 'YYYY-MM-DD HH:mm', 'Asia/Tashkent');
                end = moment.tz(`${today.format('YYYY-MM-DD')} ${shift.end}`, 'YYYY-MM-DD HH:mm', 'Asia/Tashkent');
            }
            
            const count = await File.countDocuments({
                chatId: chatId.toString(),
                timestamp: { $gte: start.toDate(), $lt: end.toDate() }
            });
            
            report += `${start.format('HH:mm')} - ${end.format('HH:mm')}:\n`;
            report += `Fayllar soni: ${count}\n\n`;
        }
        
        const dailyCount = await File.countDocuments({
            chatId: chatId.toString(),
            timestamp: { $gte: today.toDate(), $lt: today.clone().add(1, 'day').toDate() }
        });
        const monthlyCount = await File.countDocuments({
            chatId: chatId.toString(),
            timestamp: { $gte: today.clone().startOf('month').toDate(), $lt: today.clone().endOf('month').toDate() }
        });
        const yearlyCount = await File.countDocuments({
            chatId: chatId.toString(),
            timestamp: { $gte: today.clone().startOf('year').toDate(), $lt: today.clone().endOf('year').toDate() }
        });
        
        report += '📅 Umumiy hisobot:\n';
        report += `Kunlik: <b><code>${dailyCount}</code></b> fayl\n`;
        report += `Oylik: <b><code>${monthlyCount}</code></b> fayl\n`;
        report += `Yillik: <b><code>${yearlyCount}</code></b> fayl\n`;
        
        await bot.sendMessage(chatId, report, { parse_mode: 'HTML' });
        await bot.sendMessage(channelId, report, { parse_mode: 'HTML' });
    } catch (error) {
        console.error('Hisobot xatosi:', error.message);
        await bot.sendMessage(chatId, `Hisobotni yaratishda xatolik: ${error.message}`);
    }
});

setInterval(async () => {
    const chatId = Object.keys(lastFileMessage)[0] || '-1002734172243';
    try {
        const now = moment().tz('Asia/Tashkent');
        const today = now.startOf('day');
        
        const shifts = [
            { start: '07:00', end: '15:00' },
            { start: '15:00', end: '23:00' },
            { start: '23:00', end: '07:00' }
        ];
        
        let report = '📊 8 soatlik hisobot:\n\n';
        
        for (const shift of shifts) {
            let start, end;
            if (shift.start === '23:00') {
                start = moment.tz(`${today.format('YYYY-MM-DD')} ${shift.start}`, 'YYYY-MM-DD HH:mm', 'Asia/Tashkent');
                end = moment.tz(`${today.clone().add(1, 'day').format('YYYY-MM-DD')} ${shift.end}`, 'YYYY-MM-DD HH:mm', 'Asia/Tashkent');
            } else {
                start = moment.tz(`${today.format('YYYY-MM-DD')} ${shift.start}`, 'YYYY-MM-DD HH:mm', 'Asia/Tashkent');
                end = moment.tz(`${today.format('YYYY-MM-DD')} ${shift.end}`, 'YYYY-MM-DD HH:mm', 'Asia/Tashkent');
            }
            
            const count = await File.countDocuments({
                chatId: chatId.toString(),
                timestamp: { $gte: start.toDate(), $lt: end.toDate() }
            });
            
            report += `${start.format('HH:mm')} - ${end.format('HH:mm')}:\n`;
            report += `Fayllar soni: ${count}\n\n`;
        }
        
        const dailyCount = await File.countDocuments({
            chatId: chatId.toString(),
            timestamp: { $gte: today.toDate(), $lt: today.clone().add(1, 'day').toDate() }
        });
        const monthlyCount = await File.countDocuments({
            chatId: chatId.toString(),
            timestamp: { $gte: today.clone().startOf('month').toDate(), $lt: today.clone().endOf('month').toDate() }
        });
        const yearlyCount = await File.countDocuments({
            chatId: chatId.toString(),
            timestamp: { $gte: today.clone().startOf('year').toDate(), $lt: today.clone().endOf('year').toDate() }
        });
        
        report += '📅 Umumiy hisobot:\n';
        report += `Kunlik: <b><code>${dailyCount}</code></b> fayl\n`;
        report += `Oylik: <b><code>${monthlyCount}</code></b> fayl\n`;
        report += `Yillik: <b><code>${yearlyCount}</code></b> fayl\n`;
        
        await bot.sendMessage(channelId, report, { parse_mode: 'HTML' });
    } catch (error) {
        console.error('Avtomatik hisobot xatosi:', error.message);
    }
}, 8 * 60 * 60 * 1000);

bot.on('polling_error', async (error) => {
    console.error('Polling xatosi:', error.code, error.message);
    if (error.code === 'EFATAL' || error.message.includes('ECONNRESET')) {
        console.log('Tarmoq xatosi aniqlandi. 5 sekunddan keyin qayta urinish...');
        setTimeout(() => {
            console.log('Polling qayta boshlanmoqda...');
        }, 5000);
    }
});

console.log('Bot ishga tushdi...');