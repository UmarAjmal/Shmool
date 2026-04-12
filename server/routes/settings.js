const router = require('express').Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer storage – save to uploads/ with original extension
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `school_logo${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (/^image\/(png|jpeg|jpg|gif|svg\+xml|webp)$/.test(file.mimetype)) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    }
});

// Get Settings
router.get('/', async (req, res) => {
    try {
        const settings = await pool.query("SELECT * FROM school_settings LIMIT 1");
        if (settings.rows.length === 0) {
           return res.json({});
        }
        res.json(settings.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Update Settings
router.put('/', async (req, res) => {
    try {
        const { 
            school_name, address, contact_number, email, 
            tagline, website, facebook_link, twitter_link, instagram_link 
        } = req.body;

        // Check if settings exist
        const check = await pool.query("SELECT * FROM school_settings LIMIT 1");

        let result;
        if (check.rows.length === 0) {
            // Insert
            result = await pool.query(
                `INSERT INTO school_settings 
                (school_name, address, contact_number, email, tagline, website, facebook_link, twitter_link, instagram_link) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                RETURNING *`,
                [school_name, address, contact_number, email, tagline, website, facebook_link, twitter_link, instagram_link]
            );
        } else {
            // Update
            const id = check.rows[0].id;
            result = await pool.query(
                `UPDATE school_settings 
                SET school_name = $1, address = $2, contact_number = $3, email = $4, 
                    tagline = $5, website = $6, facebook_link = $7, twitter_link = $8, instagram_link = $9
                WHERE id = $10 
                RETURNING *`,
                [school_name, address, contact_number, email, tagline, website, facebook_link, twitter_link, instagram_link, id]
            );
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Reset Database API (Danger Zone)
router.post('/reset-database', async (req, res) => {
    try {
        const { exec } = require('child_process');
        const path = require('path');
        const resetScript = path.join(__dirname, '..', 'reset-db.js');
        
        exec(`node "${resetScript}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing reset: ${error.message}`);
                return res.status(500).json({ error: 'Failed to reset database' });
            }
            if (stderr && !stderr.includes('Created') && !stderr.includes('already exists')) {
                console.error(`Reset stderr: ${stderr}`);
            }
            console.log(`Reset stdout: ${stdout}`);
            res.json({ message: 'Database reset successfully!' });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error during reset' });
    }
});

// Upload School Logo
router.post('/logo', upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const logoUrl = `/uploads/${req.file.filename}`;

        const check = await pool.query('SELECT id FROM school_settings LIMIT 1');
        if (check.rows.length === 0) {
            await pool.query(
                `INSERT INTO school_settings (logo_url) VALUES ($1)`,
                [logoUrl]
            );
        } else {
            await pool.query(
                `UPDATE school_settings SET logo_url = $1 WHERE id = $2`,
                [logoUrl, check.rows[0].id]
            );
        }
        res.json({ logo_url: logoUrl });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message || 'Upload failed' });
    }
});

module.exports = router;
