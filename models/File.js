// models/File.js
const mongoose = require('mongoose');

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
}, { timestamps: true });

// Indexes for faster queries
FileSchema.index({ fileId: 1 }, { unique: true });
FileSchema.index({ userId: 1 });
FileSchema.index({ status: 1 });
FileSchema.index({ shift: 1 });

module.exports = mongoose.model('File', FileSchema);