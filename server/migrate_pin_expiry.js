// Migration: Add pin expiration to messages table
const db = require('./db');

const migrate = async () => {
    try {
        await db.query(`
            -- Add pin expiration column
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS pin_expires_at TIMESTAMP;
        `);
        console.log("✅ Pin expiration migration completed successfully");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
};

migrate();
