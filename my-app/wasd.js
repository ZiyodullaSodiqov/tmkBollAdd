// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const fs = require('fs');
// const path = require('path');
// const TelegramBot = require('node-telegram-bot-api');
// const moment = require('moment-timezone');
// const token = '8099453486:AAFxEK9_h30wTzdppYUrXT0MNhfMId0kOS4';
// const bot = new TelegramBot(token, {
// polling: {
// interval: 300,
// autoStart: true,
// params: { timeout: 10 }
// },
// filepath: false
// });
// const app = express();
// // Enhanced CORS configuration
// app.use(cors({
// origin: 'http://localhost:3000',
// methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
// allowedHeaders: ['Content-Type', 'Authorization'],
// credentials: true
// }));
// app.use(express.json());
// // MongoDB connection
// mongoose.connect('mongodb+srv://Ziydoulla:ziyodulla0105@cluster0.heagvwv.mongodb.net/fileBot?retryWrites=true&w=majority&appName=Cluster0', {
// useNewUrlParser: true,
// useUnifiedTopology: true
// })
// .then(() => console.log('Successfully connected to MongoDB'))
// .catch(err => console.error('MongoDB connection error:', err));
// // File model
// const File = require('./models/File.js');
// // Ensure uploads directory exists
// const UPLOAD_DIR = path.join(__dirname, 'uploads');
// if (!fs.existsSync(UPLOAD_DIR)) {
// fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// }
// // Telegram Bot Logic
// const availableIds = ['#C102', '#C444', '#C707', '#C001', '#C015', '#C708'];
// const userState = new Map();
// function createIdKeyboard() {
// const keyboard = [];
// for (let i = 0; i < availableIds.length; i += 2) {
// const row = [];
// row.push({ text: availableIds[i], callback_data: availableIds[i] });
// if (availableIds[i + 1]) {
// row.push({ text: availableIds[i + 1], callback_data: availableIds[i + 1] });
// }
// keyboard.push(row);
// }
// return { inline_keyboard: keyboard };
// }
// function getCurrentShift() {
// const hours = new Date().getHours();
// return hours >= 7 && hours < 15 ? 'morning' :
// hours >= 15 && hours < 23 ? 'afternoon' : 'night';
// }
// // Bot Message Handling
// bot.on('message', async (msg) => {
// const chatId = msg.chat.id;
// const userId = msg.from.id;
// if (msg.document || msg.photo || msg.video || msg.audio) {
// try {
// let fileId, fileName, fileType;
// if (msg.document) {
// fileId = msg.document.file_id;
// fileName = msg.document.file_name || 'document';
// fileType = 'document';
// } else if (msg.photo) {
// fileId = msg.photo[msg.photo.length - 1].file_id;
// fileName = 'photo.jpg';
// fileType = 'photo';
// } else if (msg.video) {
// fileId = msg.video.file_id;
// fileName = msg.video.file_name || 'video.mp4';
// fileType = 'video';
// } else if (msg.audio) {
// fileId = msg.audio.file_id;
// fileName = msg.audio.file_name || 'audio.mp3';
// fileType = 'audio';
// }
// const replyMarkup = createIdKeyboard();
// const replyMsg = await bot.sendMessage(chatId, 'Fayl uchun ID tanlang:', {
// reply_to_message_id: msg.message_id,
// reply_markup: replyMarkup
// });
// userState.set(replyMsg.message_id, {
// fileInfo: { fileId, fileName, fileType, shift: getCurrentShift(), originalMsgId: msg.message_id },
// userId: userId.toString(),
// chatId: chatId.toString()
// });
// } catch (error) {
// console.error('Xatolik:', error);
// await bot.sendMessage(chatId, 'Faylni qayta ishlashda xatolik yuz berdi. Iltimos, qayta urinib koring.');
// }
// }
// });

// bot.on('callback_query', async (callbackQuery) => {
//   const messageId = callbackQuery.message.message_id;
//   const chatId = callbackQuery.message.chat.id;
//   const userId = callbackQuery.from.id;
//   const selectedId = callbackQuery.data;
//   const state = userState.get(messageId);

//   if (!state || !availableIds.includes(selectedId)) {
//     return bot.answerCallbackQuery(callbackQuery.id, {
//       text: 'Noto‘g‘ri tanlov yoki fayl mavjud emas',
//       show_alert: true
//     });
//   }

//   try {
//     const filePath = path.join(UPLOAD_DIR, `${state.fileInfo.fileId}_${state.fileInfo.fileName}`);
//     // Get file from Telegram and save locally
//     const fileStream = bot.getFileStream(state.fileInfo.fileId);
//     const writeStream = fs.createWriteStream(filePath);
//     fileStream.pipe(writeStream);

//     await new Promise((resolve, reject) => {
//       writeStream.on('finish', resolve);
//       writeStream.on('error', reject);
//     });
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const fs = require('fs');
// const path = require('path');
// const TelegramBot = require('node-telegram-bot-api');
// const moment = require('moment-timezone');
// const token = '8099453486:AAFxEK9_h30wTzdppYUrXT0MNhfMId0kOS4';
// const bot = new TelegramBot(token, {
// polling: {
// interval: 300,
// autoStart: true,
// params: { timeout: 10 }
// },
// filepath: false
// });
// const app = express();
// // Enhanced CORS configuration
// app.use(cors({
// origin: 'http://localhost:3000',
// methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
// allowedHeaders: ['Content-Type', 'Authorization'],
// credentials: true
// }));
// app.use(express.json());
// // MongoDB connection
// mongoose.connect('mongodb+srv://Ziydoulla:ziyodulla0105@cluster0.heagvwv.mongodb.net/fileBot?retryWrites=true&w=majority&appName=Cluster0', {
// useNewUrlParser: true,
// useUnifiedTopology: true
// })
// .then(() => console.log('Successfully connected to MongoDB'))
// .catch(err => console.error('MongoDB connection error:', err));
// // File model
// const File = require('./models/File.js');
// // Ensure uploads directory exists
// const UPLOAD_DIR = path.join(__dirname, 'uploads');
// if (!fs.existsSync(UPLOAD_DIR)) {
// fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// }
// // Telegram Bot Logic
// const availableIds = ['#C102', '#C444', '#C707', '#C001', '#C015', '#C708'];
// const userState = new Map();
// function createIdKeyboard() {
// const keyboard = [];
// for (let i = 0; i < availableIds.length; i += 2) {
// const row = [];
// row.push({ text: availableIds[i], callback_data: availableIds[i] });
// if (availableIds[i + 1]) {
// row.push({ text: availableIds[i + 1], callback_data: availableIds[i + 1] });
// }
// keyboard.push(row);
// }
// return { inline_keyboard: keyboard };
// }
// function getCurrentShift() {
// const hours = new Date().getHours();
// return hours >= 7 && hours < 15 ? 'morning' :
// hours >= 15 && hours < 23 ? 'afternoon' : 'night';
// }
// // Bot Message Handling
// bot.on('message', async (msg) => {
// const chatId = msg.chat.id;
// const userId = msg.from.id;
// if (msg.document || msg.photo || msg.video || msg.audio) {
// try {
// let fileId, fileName, fileType;
// if (msg.document) {
// fileId = msg.document.file_id;
// fileName = msg.document.file_name || 'document';
// fileType = 'document';
// } else if (msg.photo) {
// fileId = msg.photo[msg.photo.length - 1].file_id;
// fileName = 'photo.jpg';
// fileType = 'photo';
// } else if (msg.video) {
// fileId = msg.video.file_id;
// fileName = msg.video.file_name || 'video.mp4';
// fileType = 'video';
// } else if (msg.audio) {
// fileId = msg.audio.file_id;
// fileName = msg.audio.file_name || 'audio.mp3';
// fileType = 'audio';
// }
// const replyMarkup = createIdKeyboard();
// const replyMsg = await bot.sendMessage(chatId, 'Fayl uchun ID tanlang:', {
// reply_to_message_id: msg.message_id,
// reply_markup: replyMarkup
// });
// userState.set(replyMsg.message_id, {
// fileInfo: { fileId, fileName, fileType, shift: getCurrentShift(), originalMsgId: msg.message_id },
// userId: userId.toString(),
// chatId: chatId.toString()
// });
// } catch (error) {
// console.error('Xatolik:', error);
// await bot.sendMessage(chatId, 'Faylni qayta ishlashda xatolik yuz berdi. Iltimos, qayta urinib koring.');
// }
// }
// });

// bot.on('callback_query', async (callbackQuery) => {
//   const messageId = callbackQuery.message.message_id;
//   const chatId = callbackQuery.message.chat.id;
//   const userId = callbackQuery.from.id;
//   const selectedId = callbackQuery.data;
//   const state = userState.get(messageId);

//   if (!state || !availableIds.includes(selectedId)) {
//     return bot.answerCallbackQuery(callbackQuery.id, {
//       text: 'Noto‘g‘ri tanlov yoki fayl mavjud emas',
//       show_alert: true
//     });
//   }

//   try {
//     const filePath = path.join(UPLOAD_DIR, `${state.fileInfo.fileId}_${state.fileInfo.fileName}`);
//     // Get file from Telegram and save locally
//     const fileStream = bot.getFileStream(state.fileInfo.fileId);
//     const writeStream = fs.createWriteStream(filePath);
//     fileStream.pipe(writeStream);

//     await new Promise((resolve, reject) => {
//       writeStream.on('finish', resolve);
//       writeStream.on('error', reject);
//     });

// { $match: { timestamp: { $gte: startDate, $lt: endDate } } },
// { $group: {
// _id: '$userSelectedId',
// count: { $sum: 1 }
// }},
// { $sort: { _id: 1 } }
// ]);
// res.json(stats);
// } catch (error) {
// res.status(500).json({ message: error.message });
// }
// });
// app.get('/api/stats/daily', async (req, res) => {
// try {
// const { year, month } = req.query;
// const startDate = new Date(`${year}-${month}-01`);
// const endDate = new Date(startDate);
// endDate.setMonth(endDate.getMonth() + 1);
// const stats = await File.aggregate([
// { $match: { timestamp: { $gte: startDate, $lt: endDate } } },
// { $project: {
// day: { $dayOfMonth: '$timestamp' },
// shift: 1
// }},
// { $group: {
// _id: { day: '$day', shift: '$shift' },
// count: { $sum: 1 }
// }},
// { $group: {
// _id: '$_id.day',
// shifts: {
// $push: {
// shift: '$_id.shift',
// count: '$count'
// }
// },
// totalCount: { $sum: '$count' }
// }},
// { $sort: { _id: 1 } }
// ]);
// res.json(stats);
// } catch (error) {
// res.status(500).json({ message: error.message });
// }
// });
// app.get('/api/stats/monthly', async (req, res) => {
// try {
// const { year } = req.query;
// const startDate = new Date(`${year}-01-01`);
// const endDate = new Date(startDate);
// endDate.setFullYear(endDate.getFullYear() + 1);
// const stats = await File.aggregate([
// { $match: { timestamp: { $gte: startDate, $lt: endDate } } },
// { $project: {
// month: { $month: '$timestamp' },
// shift: 1
// }},
// { $group: {
// _id: { month: '$month', shift: '$shift' },
// count: { $sum: 1 }
// }},
// { $group: {
// _id: '$_id.month',
// shifts: {
// $push: {
// shift: '$_id.shift',
// count: '$count'
// }
// },
// totalCount: { $sum: '$count' }
// }},
// { $sort: { _id: 1 } }
// ]);
// res.json(stats);
// } catch (error) {
// res.status(500).json({ message: error.message });
// }
// });
// app.get('/api/reports/monthly', async (req, res) => {
// try {
// const { year, month, fileType } = req.query;
// const startDate = new Date(`${year}-${month}-01`);
// const endDate = new Date(startDate);
// endDate.setMonth(endDate.getMonth() + 1);
// let match = { timestamp: { $gte: startDate, $lt: endDate } };
// if (fileType && fileType !== 'all') {
// match.fileType = fileType;
// }
// const reports = await File.aggregate([
// { $match: match },
// { $group: {
// _id: '$userSelectedId',
// count: { $sum: 1 },
// files: { $push: '$$ROOT' }
// }},
// { $sort: { _id: 1 } }
// ]);
// res.json(reports);
// } catch (error) {
// res.status(500).json({ message: error.message });
// }
// });
// app.delete('/api/files/:id', async (req, res) => {
// try {
// const file = await File.findByIdAndDelete(req.params.id);
// if (!file) {
// return res.status(404).json({ message: 'File not found' });
// }
// // Delete the actual file from the filesystem
// if (fs.existsSync(file.filePath)) {
// fs.unlinkSync(file.filePath);
// }
// res.json({ message: 'File deleted successfully' });
// } catch (error) {
// res.status(500).json({ message: error.message });
// }
// });
// // Error Handling
// bot.on('polling_error', (error) => {
// console.error('Polling error:', error);
// });
// // Start Server
// const PORT = 3001;
// app.listen(PORT, () => {
// console.log(`Server ${PORT}-portda ishga tushdi`);
// console.log('Telegram bot ishga tushdi');
// });
