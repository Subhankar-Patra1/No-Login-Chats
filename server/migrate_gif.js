const db = require('./db');
require('dotenv').config();

async function migrate() {
    console.log('Starting migration for GIF support...');
    try {
        // Add columns if they don't exist
        // Note: 'type' column might already exist for audio. We just ensure it defaults to 'text' if not set and supports our usage.
        
        await db.query(`
            ALTER TABLE messages 
            ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text',
            ADD COLUMN IF NOT EXISTS gif_url TEXT,
            ADD COLUMN IF NOT EXISTS preview_url TEXT,
            ADD COLUMN IF NOT EXISTS width INT,
            ADD COLUMN IF NOT EXISTS height INT
        `);

        console.log('Migration successful: Added GIF columns to messages table.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
