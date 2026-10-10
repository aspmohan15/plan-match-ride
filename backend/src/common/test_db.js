import { query } from './db.js';

async function test() {
    try {
        const res = await query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
        console.log("Tables:");
        res.rows.forEach(r => console.log(r.table_name));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
test();