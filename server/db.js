const Pool = require('pg').Pool;
require('dotenv').config();

const dbConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'postgres',
    };

// Sab ke liye SSL lazmi hai
dbConfig.ssl = {
    rejectUnauthorized: false
};

const pool = new Pool(dbConfig);

module.exports = pool;
