const Pool = require('pg').Pool;
require('dotenv').config();

// Individual parameters use karna zyada stable hai Render par
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, // Yahan RAW password aayega
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = pool;
