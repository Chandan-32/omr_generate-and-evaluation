const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let isConnected = false;
let useMock = false;

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'mock_db.json');

// Ensure mock database file exists with initial structure
function initMockDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      users: [],
      facilities: [],
      bookings: [],
      payments: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    console.log('Mock database JSON initialized at:', DATA_FILE);
  }
}

async function connectDB() {
  if (process.env.MOCK_DB_FALLBACK === 'true' && process.env.FORCE_MOCK === 'true') {
    console.log('⚠️ Forced mock mode enabled. Using JSON file database.');
    useMock = true;
    global.useMockDb = true;
    initMockDb();
    return;
  }

  try {
    // Try connecting to MongoDB
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/college-booking', {
      serverSelectionTimeoutMS: 3000 // Timeout after 3s to fail-over quickly
    });
    isConnected = true;
    global.useMockDb = false;
    console.log(`🔌 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (process.env.MOCK_DB_FALLBACK === 'true') {
      console.log('⚠️ Falling back to local JSON database (mock_db.json)...');
      useMock = true;
      global.useMockDb = true;
      initMockDb();
    } else {
      console.error('Database connection failed and mock database fallback is disabled. Exiting...');
      process.exit(1);
    }
  }
}

module.exports = { connectDB, isConnected, useMock, DATA_FILE };
