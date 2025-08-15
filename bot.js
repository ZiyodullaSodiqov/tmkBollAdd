const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");
const moment = require("moment-timezone");

// Configuration
const config = {
  TELEGRAM_TOKEN: "8011091957:AAFT_UPBE9QrOaQMQ5BubbswzUhxk3vHO7I",
  MONGO_URI: "mongodb+srv://Ziydoulla:ziyodulla0105@cluster0.heagvwv.mongodb.net/fileBot?retryWrites=true&w=majority&appName=Cluster0",
  PORT: 3001,
  UPLOAD_DIR: path.join(__dirname, "Uploads"),
  ALLOWED_FILE_TYPES: ["zip", "png", "jpg", "jpeg", "pdf", "txt", "docx", "rar", "tar", "csv", "xlsx", "xls"],
  AVAILABLE_IDS: ["#C102", "#C444", "#C707", "#C001", "#C015", "#C708"],
  SHIFTS: [
    { name: "morning", start: 7, end: 15 },
    { name: "afternoon", start: 15, end: 23 },
    { name: "night", start: 23, end: 7 }
  ]
};

// Initialize
const bot = new TelegramBot(config.TELEGRAM_TOKEN, {
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 }
  },
  filepath: false
});

const app = express();

// Middleware
app.use(cors({
  origin: "https://mellow-lollipop-10b07a.netlify.app",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());

// Database Connection
mongoose.connect(config.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// File Model
const fileSchema = new mongoose.Schema({
  fileId: { type: String, required: true },
  originalName: { type: String, required: true },
  fileType: { type: String, required: true },
  userId: { type: String, required: true },
  userSelectedId: { type: String, default: null },
  chatId: { type: String, required: true },
  shift: { type: String, required: true },
  filePath: { type: String, required: true },
  uploadTime: { type: Date, default: () => moment().tz('UTC').toDate() }, // Use UTC
  saveTime: { type: Date, default: null },
  deleteTime: { type: Date, default: null },
  status: { 
    type: String, 
    enum: ["pending", "saved", "deleted"], 
    default: "pending" 
  }
});

// Indexes for performance
fileSchema.index({ uploadTime: 1, shift: 1, status: 1 });
fileSchema.index({ uploadTime: 1, userSelectedId: 1, status: 1 });
fileSchema.index({ uploadTime: 1, fileType: 1, status: 1 });

const File = mongoose.model("File", fileSchema);

// Ensure uploads directory exists
if (!fs.existsSync(config.UPLOAD_DIR)) {
  fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
}

// Helper Functions
function getCurrentShift() {
  const hours = moment().tz('UTC').hours(); // Use UTC for shift calculation
  for (const shift of config.SHIFTS) {
    if (shift.name === "night") {
      if (hours >= shift.start || hours < shift.end) return shift.name;
    } else {
      if (hours >= shift.start && hours < shift.end) return shift.name;
    }
  }
  return "morning";
}

function createIdKeyboard() {
  const keyboard = [];
  for (let i = 0; i < config.AVAILABLE_IDS.length; i += 2) {
    const row = [];
    row.push({ text: config.AVAILABLE_IDS[i], callback_data: config.AVAILABLE_IDS[i] });
    if (config.AVAILABLE_IDS[i + 1]) {
      row.push({ text: config.AVAILABLE_IDS[i + 1], callback_data: config.AVAILABLE_IDS[i + 1] });
    }
    keyboard.push(row);
  }
  return { inline_keyboard: keyboard };
}

// User state management
const userState = new Map();

// Bot Event Handlers
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (msg.document || msg.photo) {
    try {
      let fileId, fileName, fileType;

      if (msg.document) {
        fileType = msg.document.file_name?.split(".").pop().toLowerCase() || "bin";
        if (!config.ALLOWED_FILE_TYPES.includes(fileType)) {
          return bot.sendMessage(chatId, `❌ File type ${fileType} is not allowed.`);
        }
        fileId = msg.document.file_id;
        fileName = msg.document.file_name || `document_${fileId}.${fileType}`;
      } else if (msg.photo) {
        fileId = msg.photo[msg.photo.length - 1].file_id;
        fileName = `photo_${fileId}.jpg`;
        fileType = "jpg";
      }

      const replyMarkup = createIdKeyboard();
      const replyMsg = await bot.sendMessage(chatId, "📁 File received! Please select an ID:", {
        reply_to_message_id: msg.message_id,
        reply_markup: replyMarkup
      });

      userState.set(replyMsg.message_id, {
        fileInfo: {
          fileId,
          fileName,
          fileType,
          shift: getCurrentShift(),
          originalMsgId: msg.message_id
        },
        userId: userId.toString(),
        chatId: chatId.toString()
      });
    } catch (error) {
      console.error("Error processing file:", error);
      bot.sendMessage(chatId, "❌ Error processing your file. Please try again.");
    }
  }
});

bot.on("callback_query", async (callbackQuery) => {
  const messageId = callbackQuery.message.message_id;
  const chatId = callbackQuery.message.chat.id;
  const selectedId = callbackQuery.data;
  const state = userState.get(messageId);

  if (!state || !config.AVAILABLE_IDS.includes(selectedId)) {
    return bot.answerCallbackQuery(callbackQuery.id, {
      text: "Invalid selection or file not found",
      show_alert: true
    });
  }

  try {
    const filePath = path.join(config.UPLOAD_DIR, `${state.fileInfo.fileId}_${state.fileInfo.fileName}`);
    const fileStream = bot.getFileStream(state.fileInfo.fileId);
    const writeStream = fs.createWriteStream(filePath);

    await new Promise((resolve, reject) => {
      fileStream.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    const fileRecord = new File({
      fileId: state.fileInfo.fileId,
      originalName: state.fileInfo.fileName,
      fileType: state.fileInfo.fileType,
      userId: state.userId,
      userSelectedId: selectedId,
      shift: state.fileInfo.shift,
      chatId: state.chatId,
      filePath,
      saveTime: moment().tz('UTC').toDate(), // Use UTC
      status: "saved"
    });

    await fileRecord.save();
    
    // Clean up
    await bot.deleteMessage(chatId, state.fileInfo.originalMsgId).catch(console.error);
    await bot.deleteMessage(chatId, messageId).catch(console.error);
    userState.delete(messageId);

    await bot.answerCallbackQuery(callbackQuery.id, {
      text: `✅ File assigned to ${selectedId}`,
      show_alert: false
    });
  } catch (error) {
    console.error("Error saving file:", error);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: "❌ Error saving file",
      show_alert: true
    });
  }
});

// API Routes
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Bot and API server are running",
    timestamp: moment().tz('UTC').toISOString()
  });
});

app.get("/api/files", async (req, res) => {
  try {
    const { date, year, month, shift, fileType } = req.query;
    const query = { status: "saved" };

    let startDate, endDate;
    if (date) {
      startDate = moment.tz(date, 'YYYY-MM-DD', 'UTC').startOf('day').toDate();
      endDate = moment(startDate).add(1, 'day').toDate();
      query.uploadTime = { $gte: startDate, $lt: endDate };
    } else if (year && month) {
      startDate = moment.tz(`${year}-${month}-01`, 'UTC').startOf('month').toDate();
      endDate = moment(startDate).add(1, 'month').toDate();
      query.uploadTime = { $gte: startDate, $lt: endDate };
    }

    if (shift && shift !== 'all') query.shift = shift;
    if (fileType && fileType !== 'all') query.fileType = fileType;

    const files = await File.find(query).sort({ uploadTime: -1 });
    res.json(files);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/files/:id/download", async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ message: "File not found" });
    if (!fs.existsSync(file.filePath)) return res.status(404).json({ message: "File not found on server" });
    res.download(file.filePath, file.originalName);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/files/:id", async (req, res) => {
  try {
    const file = await File.findByIdAndUpdate(req.params.id, {
      status: "deleted",
      deleteTime: moment().tz('UTC').toDate(),
      userSelectedId: "N/A"
    }, { new: true });

    if (!file) return res.status(404).json({ message: "File not found" });
    
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/reports/shift", async (req, res) => {
  try {
    const { date, fileType } = req.query;
    if (!date) return res.status(400).json({ message: "Date is required" });

    const startDate = moment.tz(date, 'YYYY-MM-DD', 'UTC').startOf('day').toDate();
    const endDate = moment(startDate).add(1, 'day').toDate();

    const query = { uploadTime: { $gte: startDate, $lt: endDate }, status: "saved" };
    if (fileType && fileType !== 'all') query.fileType = fileType;

    const stats = await File.aggregate([
      { $match: query },
      { $group: { _id: "$shift", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Ensure all shifts are represented
    const allShifts = ['morning', 'afternoon', 'night'];
    const result = allShifts.map(shift => ({
      _id: shift,
      count: stats.find(s => s._id === shift)?.count || 0
    }));

    res.json(result);
  } catch (error) {
    console.error("Error fetching shift report:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/reports/id", async (req, res) => {
  try {
    const { date, year, month, shift, fileType } = req.query;
    let startDate, endDate;

    if (date) {
      startDate = moment.tz(date, 'YYYY-MM-DD', 'UTC').startOf('day').toDate();
      endDate = moment(startDate).add(1, 'day').toDate();
    } else if (year && month) {
      startDate = moment.tz(`${year}-${month}-01`, 'UTC').startOf('month').toDate();
      endDate = moment(startDate).add(1, 'month').toDate();
    } else {
      return res.status(400).json({ message: "Date or year/month required" });
    }

    const query = { uploadTime: { $gte: startDate, $lt: endDate }, status: "saved" };
    if (shift && shift !== 'all') query.shift = shift;
    if (fileType && fileType !== 'all') query.fileType = fileType;

    const stats = await File.aggregate([
      { $match: query },
      { $group: { _id: "$userSelectedId", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json(stats);
  } catch (error) {
    console.error("Error fetching ID report:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/reports/id_by_shift", async (req, res) => {
  try {
    const { date, year, month, fileType } = req.query;
    let startDate, endDate;

    if (date) {
      startDate = moment.tz(date, 'YYYY-MM-DD', 'UTC').startOf('day').toDate();
      endDate = moment(startDate).add(1, 'day').toDate();
    } else if (year && month) {
      startDate = moment.tz(`${year}-${month}-01`, 'UTC').startOf('month').toDate();
      endDate = moment(startDate).add(1, 'month').toDate();
    } else {
      return res.status(400).json({ message: "Date or year/month required" });
    }

    const query = { uploadTime: { $gte: startDate, $lt: endDate }, status: "saved" };
    if (fileType && fileType !== 'all') query.fileType = fileType;

    const stats = await File.aggregate([
      { $match: query },
      { $group: { _id: { userSelectedId: "$userSelectedId", shift: "$shift" }, count: { $sum: 1 } } },
      { $sort: { "_id.userSelectedId": 1, "_id.shift": 1 } }
    ]);

    res.json(stats);
  } catch (error) {
    console.error("Error fetching ID by shift report:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/reports/monthly", async (req, res) => {
  try {
    const { year, month, shift, fileType } = req.query;
    if (!year || !month) return res.status(400).json({ message: "Year and month are required" });

    const startDate = moment.tz(`${year}-${month}-01`, 'UTC').startOf('month').toDate();
    const endDate = moment(startDate).add(1, 'month').toDate();

    const query = { uploadTime: { $gte: startDate, $lt: endDate }, status: "saved" };
    if (shift && shift !== 'all') query.shift = shift;
    if (fileType && fileType !== 'all') query.fileType = fileType;

    const stats = await File.aggregate([
      { $match: query },
      { 
        $group: { 
          _id: {
            day: { $dayOfMonth: "$uploadTime" },
            shift: "$shift"
          },
          count: { $sum: 1 }
        } 
      },
      { 
        $group: {
          _id: "$_id.day",
          shifts: {
            $push: {
              shift: "$_id.shift",
              count: "$count"
            }
          },
          total: { $sum: "$count" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(stats);
  } catch (error) {
    console.error("Error fetching monthly report:", error);
    res.status(500).json({ message: error.message });
  }
});

// Error Handling
bot.on("polling_error", (error) => {
  console.error("Polling error:", error);
});

// Start Server
app.listen(config.PORT, () => {
  console.log(`🚀 Server running on port ${config.PORT}`);
  console.log("🤖 Telegram bot is running");
});
