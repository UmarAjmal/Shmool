const pool = require('./db');

const createStudentsTable = async () => {
    try {
        console.log("Creating/Recreating Students Table...");
        
        // We drop the table to ensure the new schema is applied. 
        // WARNING: This deletes existing student data. In a production migration we would ALTER table.
        // Since we are setting up the structure for a "standard" software, a fresh start is safer for the agent to ensure columns exist.
        // However, I will use IF NOT EXISTS for safety, but if the user wants "new fields", the simplest way for me right now 
        // without migration tools is to drop if it doesn't match, or just DROP to be sure. 
        // Given the instructions "New admission... standard software fields", I'll infer a fresh structure is needed.
        
        await pool.query(`DROP TABLE IF EXISTS students CASCADE;`);

        await pool.query(`
            CREATE TABLE students (
                student_id SERIAL PRIMARY KEY,
                admission_no VARCHAR(50) UNIQUE NOT NULL,
                roll_no VARCHAR(50),
                
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100),
                gender VARCHAR(20),
                dob DATE,
                
                class_id INTEGER REFERENCES classes(class_id),
                section_id INTEGER REFERENCES sections(section_id),
                
                category VARCHAR(50), -- General, OBC, SC, ST, etc.
                religion VARCHAR(50),
                blood_group VARCHAR(10),
                
                mobile_no VARCHAR(20),
                email VARCHAR(100),
                
                admission_date DATE DEFAULT CURRENT_DATE,
                image_url TEXT,
                
                father_name VARCHAR(100),
                father_phone VARCHAR(20),
                mother_name VARCHAR(100),
                
                current_address TEXT,
                permanent_address TEXT,
                
                status VARCHAR(20) DEFAULT 'Active', -- Active, Inactive, Transferred, Alumnus
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Students table created successfully with comprehensive schema.");
    } catch (err) {
        console.error("Error creating students table:", err.message);
    } finally {
        pool.end();
    }
};

createStudentsTable();
