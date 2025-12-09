
const db = require('./db');

async function migrate() {
    try {
        console.log('Running migration...');
        
        await db.query(`
            ALTER TABLE messages 
            ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ NULL,
            ADD COLUMN IF NOT EXISTS edit_version INT DEFAULT 0;
        `);
        
        console.log('Migration successful: Added edited_at and edit_version to messages table.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
