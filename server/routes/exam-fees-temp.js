const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
// ... (Existing routes)

// Exam Fees Route (New)
app.use('/exam-fees', require('./routes/exam-fees'));

// Existing routes map (I need to ensure I don't overwrite index.js logic, better to append or check)
// But I cannot see index.js fully. I will edit index.js to add this line.
