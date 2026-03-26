const router = require('express').Router();
const pool = require('../db');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { exec } = require('child_process');
const { initScheduler, performBackup } = require('../scheduler');

const BACKUP_DIR = path.join(__dirname, '../backups');

// Multer Setup for Restore Uploads
const upload = multer({ dest: 'temp/' });

// Get All Settings
router.get('/', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM system_settings ORDER BY category, setting_key");
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Update Settings (Batch Update) & Refresh Scheduler
router.put('/', async (req, res) => {
    try {
        const settings = req.body; 
        
        const keys = Object.keys(settings);
        
        for (const key of keys) {
            await pool.query(
                "UPDATE system_settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = $2",
                [String(settings[key]), key]
            );
        }

        // If backup settings changed, restart scheduler
        if (keys.some(k => k.includes('backup'))) {
            initScheduler();
        }

        res.json("Settings updated successfully");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// --- Backup Routes ---

// List Backups
router.get('/backups', (req, res) => {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            return res.json([]);
        }
        
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.endsWith('.sql'))
            .map(file => {
                const stats = fs.statSync(path.join(BACKUP_DIR, file));
                return {
                    name: file,
                    size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
                    created_at: stats.birthtime
                };
            })
            .sort((a, b) => b.created_at - a.created_at); // Newest first

        res.json(files);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Trigger Manual Backup
router.post('/backups/create', async (req, res) => {
    try {
        await performBackup();
        res.json({ message: "Backup created successfully." });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Backup failed: " + err.message });
    }
});

// Delete Backup
router.delete('/backups/:filename', (req, res) => {
    try {
        const filepath = path.join(BACKUP_DIR, req.params.filename);
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            res.json({ message: "Backup deleted" });
        } else {
            res.status(404).json({ error: "File not found" });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Download Backup
router.get('/backups/download/:filename', (req, res) => {
    const filepath = path.join(BACKUP_DIR, req.params.filename);
    if (fs.existsSync(filepath)) {
        res.download(filepath);
    } else {
        res.status(404).send("File not found");
    }
});

// Restore Database Route
router.post('/backups/restore', upload.single('backup_file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const { DB_USER, DB_PASSWORD, DB_NAME, DB_HOST, DB_PORT } = process.env;
    const uploadedPath = req.file.path;

    try {
        console.log(`[System] Starting restore from ${req.file.originalname}...`);

        // Close connections to DB manually if possible, or just force psql
        // psql command to restore
        const setEnv = process.platform === 'win32'
            ? `set "PGPASSWORD=${DB_PASSWORD}" &&` 
            : `PGPASSWORD="${DB_PASSWORD}"`;

        const psqlCommand = process.env.PG_DUMP_PATH ? process.env.PG_DUMP_PATH.replace('pg_dump', 'psql') : 'psql';
        
        // -d connect to database, -f file
        // Note: For a clean restore, usually we might drop/create DB, but that terminates self-connection. 
        // We will assume the script contains necessary DROP/CREATE or just overwrites tables.
        const cmd = `${setEnv} "${psqlCommand}" -U ${DB_USER} -h ${DB_HOST || 'localhost'} -p ${DB_PORT || 5432} -d ${DB_NAME} -f "${uploadedPath}"`;

        exec(cmd, (error, stdout, stderr) => {
            // Clean up temp file
            fs.unlinkSync(uploadedPath);

            if (error) {
                console.error(`[Restore] Error: ${error.message}`);
                return res.status(500).json({ error: "Restore failed. Check server logs." });
            }
            console.log(`[Restore] Output: ${stdout}`);
            if (stderr) console.error(`[Restore] Log: ${stderr}`);

            res.json({ message: "Database restored successfully. Please refresh the page." });
        });

    } catch (err) {
        if(fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Get Database Stats (Size, active connections)
router.get('/db-stats', async (req, res) => {
    try {
        const dbNameRes = await pool.query("SELECT current_database()");
        const dbName = dbNameRes.rows[0].current_database;

        const sizeRes = await pool.query(`SELECT pg_size_pretty(pg_database_size('${dbName}'))`);
        const connRes = await pool.query("SELECT count(*) FROM pg_stat_activity WHERE datname = $1", [dbName]);

        res.json({
            db_name: dbName,
            size: sizeRes.rows[0].pg_size_pretty,
            connections: connRes.rows[0].count
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
