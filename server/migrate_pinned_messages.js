// Migration: Add pinned message columns to messages table
const db = require('./db');

const migrate = async () => {
    try {
        await db.query(`
            -- Add pinned message columns to messages table
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned_by INTEGER REFERENCES users(id);
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP;
            
            -- Create index for faster pinned message queries
            CREATE INDEX IF NOT EXISTS idx_messages_pinned ON messages(room_id, is_pinned) WHERE is_pinned = TRUE;
        `);
        console.log("✅ Pinned messages migration completed successfully");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
};

migrate();
