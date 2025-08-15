const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment-timezone');
const PQueue = require('p-queue').default;

const token = '8099453486:AAFxEK9_h30wTzdppYUrXT0MNhfMId0kOS4';
const bot = new TelegramBot(token, {
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 }
  },
  filepath: false
});

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// MongoDB connection with retry logic
const connectWithRetry = () => {
  mongoose.connect('mongodb+srv://Ziydoulla:ziyodulla0105@cluster0.heagvwv.mongodb.net/fileBot?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Successfully connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    setTimeout(connectWithRetry, 5000);
  });
};
connectWithRetry();

// File model with enhanced tracking
const FileSchema = new mongoose.Schema({
  fileId: { type: String, required: true },
  originalName: { type: String, required: true },
  fileType: { type: String, required: true },
  userId: { type: String, required: true },
  userSelectedId: { type: String, default: null },
  shift: { type: String, required: true },
  chatId: { type: String, required: true },
  filePath: { type: String, default: null },
  uploadTime: { type: Date, required: true },
  saveTime: { type: Date, default: null },
  deleteTime: { type: Date, default: null },
  status: { 
    type: String, 
    enum: ['pending', 'saved', 'deleted'], 
    default: 'pending' 
  }
});
const File = mongoose.model('File', FileSchema);

// Pending State model
const PendingStateSchema = new mongoose.Schema({
  messageId: { type: String, required: true },
  fileInfo: { type: Object, required: true },
  userId: { type: String, required: true },
  chatId: { type: String, required: true },
  uploadTime: { type: Date, required: true },
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: '24h' // Auto-expire after 24 hours
  }
});
const PendingState = mongoose.model('PendingState', PendingStateSchema);

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Available IDs and queue
const availableIds = ['#C102', '#C444', '#C707', '#C001', '#C015', '#C708'];
const fileQueue = new PQueue({ concurrency: 1 });

// Helper functions
function createIdKeyboard() {
  const keyboard = [];
  for (let i = 0; i < availableIds.length; i += 2) {
    const row = [];
    row.push({ text: availableIds[i], callback_data: availableIds[i] });
    if (availableIds[i + 1]) {
      row.push({ text: availableIds[i + 1], callback_data: availableIds[i + 1] });
    }
    keyboard.push(row);
  }
  return { inline_keyboard: keyboard };
}

function getCurrentShift() {
  const hours = new Date().getHours();
  return hours >= 7 && hours < 15 ? 'morning' :
         hours >= 15 && hours < 23 ? 'afternoon' : 'night';
}

// Recover pending states on startup
async function recoverPendingStates() {
  const pendings = await PendingState.find();
  for (const pending of pendings) {
    try {
      const replyMarkup = createIdKeyboard();
      const messageText = `Fayl uchun ID tanlang (qayta tiklandi): ${pending.fileInfo.fileName}`;
      const replyMsg = await bot.sendMessage(pending.chatId, messageText, {
        reply_to_message_id: pending.fileInfo.originalMsgId,
        reply_markup: replyMarkup
      });
      await PendingState.updateOne({ _id: pending._id }, {
        messageId: replyMsg.message_id.toString()
      });
    } catch (error) {
      console.error('Pending state recovery error:', error);
      await saveFileWithoutId(pending);
    }
  }
}

// Save file without ID (if deleted or error)
async function saveFileWithoutId(state) {
  try {
    const fileRecord = new File({
      fileId: state.fileInfo.fileId,
      originalName: state.fileInfo.fileName,
      fileType: state.fileInfo.fileType,
      userId: state.userId,
      userSelectedId: null,
      shift: state.fileInfo.shift,
      chatId: state.chatId,
      filePath: null,
      uploadTime: state.uploadTime,
      deleteTime: new Date(),
      status: 'deleted'
    });
    await fileRecord.save();
    await PendingState.deleteOne({ _id: state._id });
    
    // Clean up messages
    await bot.deleteMessage(state.chatId, state.fileInfo.originalMsgId).catch(() => {});
    await bot.deleteMessage(state.chatId, state.messageId).catch(() => {});
  } catch (error) {
    console.error('Save without ID error:', error);
  }
}

// Bot Message Handling
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const uploadTime = new Date();

  if (msg.document || msg.photo || msg.video || msg.audio) {
    try {
      let fileId, fileName, fileType;
      if (msg.document) {
        fileId = msg.document.file_id;
        fileName = msg.document.file_name || 'document';
        fileType = 'document';
      } else if (msg.photo) {
        fileId = msg.photo[msg.photo.length - 1].file_id;
        fileName = 'photo.jpg';
        fileType = 'photo';
      } else if (msg.video) {
        fileId = msg.video.file_id;
        fileName = msg.video.file_name || 'video.mp4';
        fileType = 'video';
      } else if (msg.audio) {
        fileId = msg.audio.file_id;
        fileName = msg.audio.file_name || 'audio.mp3';
        fileType = 'audio';
      }

      // Create initial file record
      const fileRecord = new File({
        fileId,
        originalName: fileName,
        fileType,
        userId: userId.toString(),
        userSelectedId: null,
        shift: getCurrentShift(),
        chatId: chatId.toString(),
        filePath: null,
        uploadTime,
        status: 'pending'
      });
      await fileRecord.save();

      const replyMarkup = createIdKeyboard();
      const replyMsg = await bot.sendMessage(chatId, 'Fayl uchun ID tanlang:', {
        reply_to_message_id: msg.message_id,
        reply_markup: replyMarkup
      });

      // Save pending state
      await new PendingState({
        messageId: replyMsg.message_id.toString(),
        fileInfo: { 
          fileId, 
          fileName, 
          fileType, 
          shift: getCurrentShift(), 
          originalMsgId: msg.message_id,
          fileRecordId: fileRecord._id 
        },
        userId: userId.toString(),
        chatId: chatId.toString(),
        uploadTime
      }).save();

    } catch (error) {
      console.error('Xatolik:', error);
      await bot.sendMessage(chatId, 'Faylni qayta ishlashda xatolik yuz berdi. Iltimos, qayta urinib koring.').catch(() => {});
    }
  }
});

// Callback Query - Handle ID selection
bot.on('callback_query', async (callbackQuery) => {
  const messageId = callbackQuery.message.message_id.toString();
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const selectedId = callbackQuery.data;

  const state = await PendingState.findOne({ messageId });
  if (!state || !availableIds.includes(selectedId)) {
    return bot.answerCallbackQuery(callbackQuery.id, {
      text: 'Noto‘g‘ri tanlov yoki fayl mavjud emas',
      show_alert: true
    }).catch(() => {});
  }

  try {
    await fileQueue.add(async () => {
      const saveTime = new Date();
      let filePath = path.join(UPLOAD_DIR, `${state.fileInfo.fileId}_${state.fileInfo.fileName}`);
      let fileSaved = false;

      try {
        // Download and save file
        const fileStream = bot.getFileStream(state.fileInfo.fileId);
        const writeStream = fs.createWriteStream(filePath);
        fileStream.pipe(writeStream);

        await new Promise((resolve, reject) => {
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
          fileStream.on('error', reject);
        });
        fileSaved = true;
      } catch (saveError) {
        console.error('File save error:', saveError);
        filePath = null;
      }

      // Update file record
      await File.findByIdAndUpdate(state.fileInfo.fileRecordId, {
        userSelectedId: selectedId,
        filePath: fileSaved ? filePath : null,
        saveTime: fileSaved ? saveTime : null,
        deleteTime: fileSaved ? null : new Date(),
        status: fileSaved ? 'saved' : 'deleted'
      });

      // Clean up
      await bot.deleteMessage(chatId, state.fileInfo.originalMsgId).catch(console.error);
      await bot.deleteMessage(chatId, state.messageId).catch(console.error);
      await PendingState.deleteOne({ _id: state._id });

      await bot.answerCallbackQuery(callbackQuery.id).catch(() => {});
    });
  } catch (error) {
    console.error('Callback xatosi:', error);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: 'Faylni saqlashda xatolik yuz berdi',
      show_alert: true
    }).catch(() => {});
    await saveFileWithoutId(state);
  }
});

// API Routes
app.get('/api/files', async (req, res) => {
  try {
    const { date, shift, fileType } = req.query;
    let query = {};
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query.uploadTime = { $gte: startDate, $lt: endDate };
    }
    
    if (shift && shift !== 'all') query.shift = shift;
    if (fileType && fileType !== 'all') query.fileType = fileType;
    
    const files = await File.find(query).sort({ uploadTime: -1 });
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/files/:id/download', async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file || !file.filePath) {
      return res.status(404).json({ message: 'File not found' });
    }
    res.download(file.filePath, file.originalName);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Statistics endpoints
app.get('/api/stats/daily', async (req, res) => {
  try {
    const { date } = req.query;
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    
    const stats = await File.aggregate([
      { $match: { uploadTime: { $gte: startDate, $lt: endDate } } },
      { $group: {
        _id: '$shift',
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/stats/id', async (req, res) => {
  try {
    const { date } = req.query;
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    
    const stats = await File.aggregate([
      { $match: { 
        uploadTime: { $gte: startDate, $lt: endDate },
        userSelectedId: { $ne: null } 
      }},
      { $group: {
        _id: '$userSelectedId',
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/stats/monthly', async (req, res) => {
  try {
    const { year, month } = req.query;
    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    
    const stats = await File.aggregate([
      { $match: { uploadTime: { $gte: startDate, $lt: endDate } } },
      { $project: {
        day: { $dayOfMonth: '$uploadTime' },
        shift: 1
      }},
      { $group: {
        _id: { day: '$day', shift: '$shift' },
        count: { $sum: 1 }
      }},
      { $group: {
        _id: '$_id.day',
        shifts: {
          $push: {
            shift: '$_id.shift',
            count: '$count'
          }
        },
        totalCount: { $sum: '$count' }
      }},
      { $sort: { _id: 1 } }
    ]);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/reports/monthly', async (req, res) => {
  try {
    const { year, month, fileType } = req.query;
    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    
    let match = { 
      uploadTime: { $gte: startDate, $lt: endDate },
      status: 'saved' // Only include saved files
    };
    
    if (fileType && fileType !== 'all') {
      match.fileType = fileType;
    }
    
    const reports = await File.aggregate([
      { $match: match },
      { 
        $group: {
          _id: '$userSelectedId',
          count: { $sum: 1 },
          files: { 
            $push: {
              fileId: '$fileId',
              originalName: '$originalName',
              fileType: '$fileType',
              uploadTime: '$uploadTime',
              shift: '$shift'
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json(reports);
  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({ 
      message: 'Failed to generate monthly report',
      error: error.message 
    });
  }
});

app.delete('/api/files/:id', async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Update the file record first
    const updatedFile = await File.findByIdAndUpdate(
      req.params.id,
      { 
        deleteTime: new Date(),
        status: 'deleted'
      },
      { new: true }
    );
    
    // Then try to delete the physical file
    if (updatedFile.filePath) {
      try {
        if (fs.existsSync(updatedFile.filePath)) {
          fs.unlinkSync(updatedFile.filePath);
          console.log(`Deleted file: ${updatedFile.filePath}`);
        }
      } catch (fsError) {
        console.error('File system deletion error:', fsError);
        // Don't fail the request if file deletion fails
      }
    }
    
    res.json({ 
      message: 'File deleted successfully',
      file: {
        id: updatedFile._id,
        name: updatedFile.originalName,
        status: updatedFile.status
      }
    });
    
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ 
      message: 'Failed to delete file',
      error: error.message 
    });
  }
});

app.get('/api/files/:id/status', async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    const fileExists = file.filePath ? fs.existsSync(file.filePath) : false;
    
    res.json({
      id: file._id,
      status: file.status,
      fileExists,
      uploadTime: file.uploadTime,
      saveTime: file.saveTime,
      deleteTime: file.deleteTime
    });
    
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to check file status',
      error: error.message 
    });
  }
});

app.post('/api/files/cleanup', async (req, res) => {
  try {
    // Find all files marked as deleted but still existing in filesystem
    const deletedFiles = await File.find({ 
      status: 'deleted',
      filePath: { $ne: null }
    });
    
    let cleaned = 0;
    let errors = 0;
    
    for (const file of deletedFiles) {
      try {
        if (file.filePath && fs.existsSync(file.filePath)) {
          fs.unlinkSync(file.filePath);
          cleaned++;
        }
      } catch (err) {
        console.error(`Error cleaning file ${file.filePath}:`, err);
        errors++;
      }
    }
    
    res.json({
      message: 'File cleanup completed',
      cleaned,
      errors,
      total: deletedFiles.length
    });
    
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ 
      message: 'Cleanup failed',
      error: error.message 
    });
  }
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

// In your Express server (server.js)
app.get('/api/ping', (req, res) => {
  res.json({ status: 'alive', timestamp: new Date() });
});


// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishga tushdi`);
  console.log('Telegram bot ishga tushdi');
  mongoose.connection.once('open', recoverPendingStates);
});