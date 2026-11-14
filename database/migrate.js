/**
 * Brings an EXISTING database up to date WITHOUT deleting any data.
 *
 *   npm run db:migrate                 apply what is missing
 *   npm run db:migrate -- --dry-run    only show what would be done
 *
 * It only creates missing tables/columns/views (MoU registry, reviews & services, forms,
 * the forms -> short course link, the project view). Existing tables and rows are never
 * dropped or modified, and the row counts of the main tables are compared before and after.
 * Back the database up first (see the README, "Deploying to production").
 */
require('dotenv').config();
const path = require('path');
const { execFileSync } = require('child_process');
const mysql = require('mysql2/promise');

const COUNTED = ['users', 'staff', 'departments', 'projects', 'short_courses', 'donors', 'partner_organisations', 'mou_agreements', 'forms', 'form_responses', 'reviews'];

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  const database = process.env.DB_NAME || 'db_myacademia';

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database,
  });

  const [tables] = await connection.query(
    'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = ?',
    [database]
  );
  const has = new Set(tables.map((t) => String(t.name).toLowerCase()));

  if (!has.has('users') || !has.has('short_courses')) {
    console.error(
      `STOPPED: database ${database} does not look like a MyAcademia database (no users / short_courses table).\n` +
        'For a brand-new empty server use  npm run db:init  first. Nothing was changed.'
    );
    await connection.end();
    process.exit(1);
  }

  const countRows = async () => {
    const counts = {};
    for (const table of COUNTED.filter((t) => has.has(t))) {
      const [[row]] = await connection.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
      counts[table] = Number(row.n);
    }
    return counts;
  };

  const steps = [];
  if (!has.has('mou_agreements')) steps.push(['MoU registry (new tables)', 'init_mou.js']);
  steps.push(['Reviews and services (adds only missing tables)', 'init_reviews.js']);
  steps.push(['Dynamic forms and their link to short courses (adds only what is missing)', 'init_forms.js']);

  console.log(`Database: ${database}  (${has.size} tables/views found)`);
  const before = await countRows();
  console.log('Row counts before:', JSON.stringify(before));
  steps.forEach(([label]) => console.log(`${dryRun ? 'Would run' : 'Will run'}: ${label}`));
  if (!has.has('v_projects_full')) {
    console.log(`${dryRun ? 'Would run' : 'Will run'}: create the missing project view v_projects_full`);
  }

  if (dryRun) {
    console.log('Dry run: nothing was changed.');
    await connection.end();
    return;
  }

  for (const [label, script] of steps) {
    console.log(`\n== ${label}`);
    execFileSync(process.execPath, [path.join(__dirname, script)], { stdio: 'inherit', env: process.env });
  }

  if (!has.has('v_projects_full')) {
    // Same statement as in schema.sql, run on its own so no data statement is touched.
    const fs = require('fs');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const view = schema.match(/CREATE OR REPLACE VIEW v_projects_full AS[\s\S]*?;\n/);
    if (view) {
      await connection.query(view[0]);
      console.log('\n== Created view v_projects_full');
    }
  }

  const after = await countRows();
  const lost = Object.keys(before).filter((table) => after[table] < before[table]);
  console.log('\nRow counts after: ', JSON.stringify(after));

  if (lost.length) {
    console.error(`WARNING: fewer rows than before in: ${lost.join(', ')}. Restore your backup and tell the developer.`);
    process.exitCode = 1;
  } else {
    console.log('OK: no existing rows were lost. The database is up to date.');
  }
  await connection.end();
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
