import { query } from './src/common/db.js';
async function run() {
  try {
    const res = await query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `);
    const tables = {};
    for (const row of res.rows) {
      if (!tables[row.table_name]) tables[row.table_name] = [];
      tables[row.table_name].push(row.column_name);
    }
    console.log(tables);
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
run();