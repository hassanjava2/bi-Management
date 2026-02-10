/**
 * BI Management - Seed Permissions (PostgreSQL)
 */

const fs = require('fs');
const path = require('path');
const { initDatabase, getDatabase, run, get } = require('../config/database');

async function seedPermissions() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  BI Management - Permissions Seeding (PostgreSQL)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    try {
        await initDatabase();
        const pool = getDatabase();

        console.log('[1/5] Tables permissions, roles, role_permissions, user_permissions are created by schema_postgres.sql');

        console.log('[2/5] Running seed file if present...');
        const seedPath = path.join(__dirname, '../../../database/seeds/permissions_seed.sql');
        if (fs.existsSync(seedPath)) {
            let seedContent = fs.readFileSync(seedPath, 'utf8');
            seedContent = seedContent.replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO');
            seedContent = seedContent.replace(/datetime\s*\(\s*['"]now['"]\s*\)/gi, 'CURRENT_TIMESTAMP');
            const statements = seedContent
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));
            let inserted = 0;
            for (const statement of statements) {
                try {
                    await run(statement + (statement.endsWith(';') ? '' : ';'));
                    if (statement.toUpperCase().includes('INSERT')) inserted++;
                } catch (e) {
                    if (!e.message.includes('unique') && !e.message.includes('duplicate')) {
                        console.warn('    ⚠', e.message.substring(0, 60));
                    }
                }
            }
            console.log(`    ✓ ${inserted} INSERT statements executed`);
        } else {
            console.log('    ℹ permissions_seed.sql not found');
        }

        const permRow = await get('SELECT COUNT(*) as count FROM permissions');
        const roleRow = await get('SELECT COUNT(*) as count FROM roles');
        const rpRow = await get('SELECT COUNT(*) as count FROM role_permissions').catch(() => ({ count: 0 }));
        console.log('\n  Permissions:', permRow?.count ?? 0);
        console.log('  Roles:', roleRow?.count ?? 0);
        console.log('  Role permissions:', rpRow?.count ?? 0);
        console.log('═══════════════════════════════════════════════════════════════\n');
        return true;
    } catch (error) {
        console.error('❌ Error:', error.message);
        return false;
    }
}

if (require.main === module) {
    seedPermissions().then(success => process.exit(success ? 0 : 1));
}

module.exports = { seedPermissions };
