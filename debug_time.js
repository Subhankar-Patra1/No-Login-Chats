const db = require('./server/db');

(async () => {
    try {
        const res = await db.query('SELECT created_at FROM messages ORDER BY id DESC LIMIT 1');
        if (res.rows.length === 0) {
            console.log('No messages found');
        } else {
            const val = res.rows[0].created_at;
            console.log('Value:', val);
            console.log('Type:', typeof val);
            console.log('Is Date?', val instanceof Date);
            if (val instanceof Date) {
                console.log('ISO String:', val.toISOString());
                console.log('ToString:', val.toString());
            }
        }
    } catch (err) {
        console.error(err);
    }
})();
