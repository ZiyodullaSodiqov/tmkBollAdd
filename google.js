const { Telegraf } = require('telegraf');
const { google } = require('googleapis');

// Telegram Bot Token from BotFather
const bot = new Telegraf('YOUR_TELEGRAM_BOT_TOKEN');

// Google Sheets API setup
const auth = new google.auth.GoogleAuth({
    keyFile: 'path/to/credentials.json', // Path to your Google service account credentials
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = '1zGVN74FOP6_186fPr-idk4cgDnhnBEA4E_EsbBev-oE'; // Your Google Sheet ID

// Store user state
const userState = {};

// Start command
bot.start((ctx) => {
    ctx.reply('Iltimos, ism va familiyangizni yuboring (masalan: Ziyodulla Xolmatov).');
    userState[ctx.from.id] = { step: 'name' };
});

// Handle text messages
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();

    if (!userState[userId]) {
        return ctx.reply('Iltimos, /start buyrug‘i bilan boshlang.');
    }

    const state = userState[userId];

    if (state.step === 'name') {
        state.name = text;
        state.step = 'company';
        return ctx.reply('Kompaniya nomini yuboring.');
    }

    if (state.step === 'company') {
        state.company = text;
        state.step = 'menu';

        // Send menu with buttons
        return ctx.reply('Operatsiyani tanlang:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'PTI', callback_data: 'PTI' }],
                    [{ text: 'VIOL&FIX', callback_data: 'VIOL&FIX' }],
                    [{ text: 'Break', callback_data: 'Break' }],
                    [{ text: 'SHIFT', callback_data: 'SHIFT' }],
                    [{ text: 'Drive Cycle', callback_data: 'Drive Cycle' }],
                ],
            },
        });
    }

    // Handle custom text input like Ziyodulla#C015
    if (text.includes('#')) {
        try {
            await saveToSheet(state.name, state.company, text);
            ctx.reply('Qabul qilindi!');
            delete userState[userId]; // Reset state
            ctx.reply('Yana ma‘lumot yuborish uchun /start buyrug‘ini bosing.');
        } catch (error) {
            console.error('Error saving to sheet:', error);
            ctx.reply('Xatolik yuz berdi. Iltimos, qayta urinib ko‘ring.');
        }
    }
});

// Handle button clicks
bot.action(['PTI', 'VIOL&FIX', 'Break', 'SHIFT', 'Drive Cycle'], async (ctx) => {
    const userId = ctx.from.id;
    const action = ctx.callbackQuery.data;
    const state = userState[userId];

    if (!state || state.step !== 'menu') {
        return ctx.reply('Iltimos, /start buyrug‘i bilan boshlang.');
    }

    try {
        await saveToSheet(state.name, state.company, action);
        ctx.reply('Qabul qilindi!');
        delete userState[userId]; // Reset state
        ctx.reply('Yana ma‘lumot yuborish uchun /start buyrug‘ini bosing.');
    } catch (error) {
        console.error('Error saving to sheet:', error);
        ctx.reply('Xatolik yuz berdi. Iltimos, qayta urinib ko‘ring.');
    }
});

// Function to save data to Google Sheet
async function saveToSheet(name, company, action) {
    const values = [[name, company, action, new Date().toISOString()]];
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A:D', // Adjust range based on your sheet structure
        valueInputOption: 'RAW',
        resource: { values },
    });
}

// Launch the bot
bot.launch();
console.log('Bot is running...');

// Handle graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));