const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  fileId: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  userId: {
    type: Number,
    required: true
  },
  userSelectedId: {
    type: String,
    enum: ['#C102', '#C444', '#C707', '#C001', '#C015', '#C708'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  shift: {
    type: String,
    enum: ['morning', 'afternoon', 'night'],
    required: true
  },
  fileType: {
    type: String,
    enum: ['document', 'photo', 'video', 'audio'],
    required: true
  },
  filePath: {
    type: String,
    required: true
  }
});

// Indexes for better performance
FileSchema.index({ userId: 1 });
FileSchema.index({ timestamp: 1 });
FileSchema.index({ shift: 1 });
FileSchema.index({ userSelectedId: 1 });

module.exports = mongoose.model('File', FileSchema);