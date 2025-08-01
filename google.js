const { Telegraf } = require('telegraf');
const { google } = require('googleapis');
const winston = require('winston');
require('dotenv').config();


const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: 'bot.log' })],
});


const bot = new Telegraf(process.env.BOT_TOKEN);


const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = '1zGVN74FOP6_186fPr-idk4cgDnhnBEA4E_EsbBev-oE';


const userState = {};
let cachedSheetName = null;

function keepAlive() {
    setInterval(async () => {
        try {
            logger.info('Keep-alive so‘rovi yuborildi...');
            
            const healthCheck = { reply: (message) => logger.info(`Health check: ${message}`) };
            await healthHandler(healthCheck);
        } catch (error) {
            logger.error('Keep-alive xatosi:', error.message, error.stack);
        }
    }, 30000); 
}


async function healthHandler(ctx) {
    try {
        await getSheetName();
        ctx.reply('Bot ✅! Server holati: ✅');
        logger.info('Health check ✅😒');
    } catch (error) {
        ctx.reply(`Error: ${error.message}. Admin: 912220635`);
        logger.error('Health check xatosi:', error.message, error.stack);
    }
}

async function getSheetName() {
    if (cachedSheetName) {
        return cachedSheetName;
    }
    logger.info('Varaq nomini olish boshlandi...');
    try {
        const response = await sheets.spreadsheets.get({
            spreadsheetId,
            fields: 'sheets.properties.title',
        });
        if (!response.data.sheets || response.data.sheets.length === 0) {
            throw new Error('Sheet’da varaqlar topilmadi.');
        }
        cachedSheetName = response.data.sheets[0].properties.title;
        logger.info('Varaq nomi:', cachedSheetName);
        return cachedSheetName;
    } catch (error) {
        logger.error('Varaq nomini olishda xato:', error.message, error.stack);
        throw error;
    }
}


async function saveToSheet(name, company, action, logBook) {
    const actionString = Array.isArray(action) ? action.join('&') : action;
    const values = [[name, company, actionString, logBook, new Date().toISOString()]];
    try {
        const sheetName = await getSheetName();
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: sheetName,
            valueInputOption: 'RAW',
            resource: { values },
        });
        logger.info('Ma\'lumot qo\'shildi:', values);
    } catch (error) {
        logger.error('saveToSheet xatosi:', error.message, error.stack);
        throw error;
    }
}


async function getCycleReport() {
    try {
        const sheetName = await getSheetName();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A:E`,
        });
        const rows = response.data.values || [];
        const cycleRows = rows.filter(row => row[2].includes('Cycle'));
        const report = cycleRows.map(row => ({
            driverName: row[0],
            company: row[1],
            action: row[2],
            logBook: row[3],
            date: row[4],
        }));
        return report;
    } catch (error) {
        logger.error('getCycleReport xatosi:', error.message, error.stack);
        throw error;
    }
}


function isWithinShift(date, shift) {
    const hours = date.getHours();
    if (shift === '07:00-15:00') return hours >= 7 && hours < 15;
    if (shift === '15:00-23:00') return hours >= 15 && hours < 23;
    if (shift === '23:00-07:00') return (hours >= 23 || hours < 7);
    return false;
}


bot.start((ctx) => {
    ctx.reply('Driver name');
    userState[ctx.from.id] = { step: 'name', selectedActions: [] };
});
bot.command('health', healthHandler);

bot.command('report', async (ctx) => {
    try {
        const report = await getCycleReport();
        if (report.length === 0) {
            return ctx.reply('Cycle uchun ma\'lumot topilmadi.');
        }
        const currentDate = new Date();
        const shifts = ['07:00-15:00', '15:00-23:00', '23:00-07:00'];
        let response = 'Cycle Hisoboti:\n';
        for (const shift of shifts) {
            const shiftReport = report.filter(row => isWithinShift(new Date(row.date), shift));
            if (shiftReport.length > 0) {
                response += `\n${shift}:\n`;
                shiftReport.forEach(row => {
                    response += `Driver: ${row.driverName}, LogBook: ${row.logBook}, Action: ${row.action}, Date: ${row.date}\n`;
                });
            }
        }
        ctx.reply(response);
    } catch (error) {
        ctx.reply(`Error: ${error.message}. Admin: 912220635`);
    }
});


bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();
    const state = userState[userId];

    if (!state) {
        return ctx.reply('/start');
    }

    if (state.step === 'name') {
        if (text.length < 3) {
            return ctx.reply('Ism va familiya kamida 3 belgi bo‘lishi kerak.');
        }
        state.name = text;
        state.step = 'company';
        return ctx.reply('Company name');
    }

    if (state.step === 'company') {
        if (text.length < 2) {
            return ctx.reply('Kompaniya nomi kamida 2 belgi bo‘lishi kerak.');
        }
        state.company = text;
        state.step = 'logBook';
        return ctx.reply('LogBook id ?.');
    }

    if (state.step === 'logBook') {
        if (text.length < 3) {
            return ctx.reply('LogBook id kamida 3 belgi bo‘lishi kerak.');
        }
        state.logBook = text;
        state.step = 'menu';
        return ctx.reply('Option (Bir nechta tanlash mumkin, tugmalarni bosing va "Submit" deb yozing):', {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Shift', callback_data: 'Shift' },
                        { text: 'Break', callback_data: 'Break' },
                        { text: 'Cycle', callback_data: 'Cycle' },
                        { text: 'Teleport', callback_data: 'Teleport' },
                    ],
                    [
                        { text: 'Drive', callback_data: 'Drive' },
                        { text: 'PTI', callback_data: 'PTI' },
                        { text: 'Viol&Fix', callback_data: 'Viol&Fix' },
                    ],
                    [{ text: 'Submit', callback_data: 'Submit' }],
                ],
            },
        });
    }

    if (state.step === 'menu' && text.includes('#')) {
        try {
            await saveToSheet(state.name, state.company, text, state.logBook);
            ctx.reply('Qabul qilindi!');
            delete userState[userId];
            ctx.reply('Yana ma‘lumot yuborish uchun /start buyrug‘ini bosing.');
        } catch (error) {
            ctx.reply(`Error: ${error.message}. Admin: 912220635`);
        }
    }

    if (state.step === 'menu' && text.toLowerCase() === 'submit') {
        if (state.selectedActions.length === 0) {
            return ctx.reply('Hech qanday operatsiya tanlanmadi. Iltimos, tugmalarni tanlang.');
        }
        try {
            await saveToSheet(state.name, state.company, state.selectedActions, state.logBook);
            ctx.reply('Barcha tanlangan operatsiyalar saqlandi!');
            delete userState[userId];
            ctx.reply('Yana ma‘lumot yuborish uchun /start buyrug‘ini bosing.');
        } catch (error) {
            ctx.reply(`Error: ${error.message}. Admin: 912220635`);
        }
    }
});


bot.action(['Shift', 'Break', 'Cycle', 'Drive', 'PTI', 'Viol&Fix', 'Teleport', 'Submit'], async (ctx) => {
    const userId = ctx.from.id;
    const action = ctx.callbackQuery.data;
    const state = userState[userId];

    if (!state || state.step !== 'menu') {
        return ctx.reply('/start');
    }

    if (action === 'Submit') {
        if (state.selectedActions.length === 0) {
            return ctx.reply('Hech qanday operatsiya tanlanmadi. Iltimos, tugmalarni tanlang va qayta "Submit" bosing.');
        }
        try {
            await saveToSheet(state.name, state.company, state.selectedActions, state.logBook);
            ctx.reply('Saved!');
            delete userState[userId];
            ctx.reply('New /start');
        } catch (error) {
            ctx.reply(`Error: ${error.message}. Admin: 912220635`);
        }
    } else {
        if (!state.selectedActions.includes(action)) {
            state.selectedActions.push(action);
            ctx.reply(`Tanlandi: ${action}. Yana tanlash uchun tugmalarni bosing yoki "Submit" bosing.`);
        } else {
            ctx.reply(`${action} allaqachon tanlangan. Boshqa tugmalarni tanlang yoki "Submit" bosing.`);
        }
    }
});

keepAlive()


bot.launch();
logger.info('Bot is running...');


process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));