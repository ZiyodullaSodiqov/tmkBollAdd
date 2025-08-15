const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb+srv://Ziydoulla:ziyodulla0105@cluster0.heagvwv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Successfully connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// File model
const File = require('./models/File.js');

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// File upload endpoint
app.post('/api/upload', async (req, res) => {
  try {
    const { fileId, originalName, userId, userSelectedId, fileType } = req.body;
    
    const timestamp = new Date();
    const hours = timestamp.getHours();
    let shift;
    
    if (hours >= 7 && hours < 15) shift = 'morning';
    else if (hours >= 15 && hours < 23) shift = 'afternoon';
    else shift = 'night';
    
    const newFile = await File.create({
      fileId,
      originalName,
      userId,
      userSelectedId,
      timestamp,
      shift,
      fileType,
      filePath: path.join(UPLOAD_DIR, `${fileId}_${originalName}`)
    });
    
    res.status(201).json(newFile);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// File download endpoint
app.get('/api/files/:id/download', async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    if (!fs.existsSync(file.filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }
    
    res.download(file.filePath, file.originalName);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all files (for testing)
app.get('/api/files', async (req, res) => {
  try {
    const files = await File.find().sort({ timestamp: -1 });
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get daily files with filtering options
app.get('/api/files/daily', async (req, res) => {
  try {
    const { date, shift, fileType } = req.query;
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    
    let match = { timestamp: { $gte: startDate, $lt: endDate } };
    
    if (shift && shift !== 'all') {
      match.shift = shift;
    }
    
    if (fileType && fileType !== 'all') {
      match.fileType = fileType;
    }
    
    const files = await File.find(match).sort({ timestamp: 1 });
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get shift statistics for a specific day
app.get('/api/stats/shift', async (req, res) => {
  try {
    const { date } = req.query;
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    
    const stats = await File.aggregate([
      { $match: { timestamp: { $gte: startDate, $lt: endDate } } },
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

// Get ID statistics for a specific day
app.get('/api/stats/id', async (req, res) => {
  try {
    const { date } = req.query;
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    
    const stats = await File.aggregate([
      { $match: { timestamp: { $gte: startDate, $lt: endDate } } },
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

// Get daily statistics for a month (trend data)
app.get('/api/stats/daily', async (req, res) => {
  try {
    const { year, month } = req.query;
    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    
    const stats = await File.aggregate([
      { $match: { timestamp: { $gte: startDate, $lt: endDate } } },
      { $project: {
        day: { $dayOfMonth: '$timestamp' },
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

// Get monthly statistics for a year
// app.get('/api/stats/monthly', async (req, res) => {
//   try {
//     const { year } = req.query;
//     const startDate = new Date(`${year}-01-01`);
//     const endDate = new Date(startDate);
//     endDate.setFullYear(endDate.getFullYear() + 1);
    
//     const stats = await File.aggregate([
//       { $match: { timestamp: { $gte: startDate, $lt: endDate } } },
//       { $project: {
//         month: { $month: '$timestamp' },
//         shift: 1
//       }},
//       { $group: {
//         _id: { month: '$month', shift: '$shift' },
//         count: { $sum: 1 }
//       }},
//       { $group: {
//         _id: '$_id.month',
//         shifts: {
//           $push: {
//             shift: '$_id.shift',
//             count: '$count'
//           }
//         },
//         totalCount: { $sum: '$count' }
//       }},
//       { $sort: { _id: 1 } }
//     ]);
    
//     res.json(stats);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// Get monthly reports by ID with filtering
app.get('/api/reports/monthly', async (req, res) => {
  try {
    const { year, month, fileType } = req.query;
    
    // Validate required parameters
    if (!year || !month) {
      return res.status(400).json({ message: 'Year and month are required parameters' });
    }

    // Create proper date range (handles month overflow automatically)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1); // This automatically handles month overflow
    
    let match = { 
      timestamp: { 
        $gte: startDate, 
        $lt: endDate 
      } 
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
          files: { $push: '$$ROOT' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json(reports);
  } catch (error) {
    console.error('Error fetching monthly reports:', error);
    res.status(500).json({ 
      message: 'Failed to generate monthly reports',
      error: error.message 
    });
  }
});
// Delete a file
app.delete('/api/files/:id', async (req, res) => {
  try {
    const file = await File.findByIdAndDelete(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Delete the actual file from the filesystem
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));