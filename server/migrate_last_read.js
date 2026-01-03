const db = require('./db');

async function migrate() {
    try {
        console.log('Checking room_members schema...');
        
        // Check if column exists
        const res = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='room_members' AND column_name='last_read_message_id'
        `);

        if (res.rows.length === 0) {
            console.log('Adding last_read_message_id column...');
            await db.query(`
                ALTER TABLE room_members 
                ADD COLUMN last_read_message_id TEXT DEFAULT NULL
            `);
            console.log('Column added successfully.');
        } else {
            console.log('Column last_read_message_id already exists.');
        }

        console.log('Migration complete.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
