// Migration: Add location columns to messages table
const db = require('./db');

const migrate = async () => {
    try {
        await db.query(`
            -- Add location columns to messages table
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS address TEXT;
        `);
        console.log("✅ Location messages migration completed successfully");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
};

migrate();
