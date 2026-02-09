import postgres from 'postgres';

const sql = postgres('postgresql://postgres:1111@localhost:5432/postgres');

try {
  // Terminate existing connections
  await sql.unsafe(`
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = 'bi_management_v3'
    AND pid <> pg_backend_pid()
  `);
  await sql.unsafe('DROP DATABASE IF EXISTS bi_management_v3');
  await sql.unsafe('CREATE DATABASE bi_management_v3');
  console.log('✅ Database bi_management_v3 created successfully!');
  await sql.end();
  process.exit(0);
} catch (e) {
  console.error('Error:', e.message);
  await sql.end();
  process.exit(1);
}
