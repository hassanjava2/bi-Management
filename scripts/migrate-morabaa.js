

/**
 * Morabaa → BI Management Migration Script
 * 
 * يتصل بقاعدة بيانات المربع (SQL Server 2014) ويصدّر البيانات
 * ويحولها لصيغة PostgreSQL متوافقة مع نظام bi-management
 * 
 * Usage:
 *   cd "d:\bi Management"
 *   npm install mssql uuid
 *   node scripts/migrate-morabaa.js
 */

const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ============================================
// SQL Server Connection Config
// ============================================
const sqlConfig = {
    user: 'sa',
    password: '123@a',
    server: 'DESKTOP-3957E1R\\MORABSQL2014',
    database: 'MorabaaDB',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
    },
    requestTimeout: 120000,
    connectionTimeout: 30000,
};

// ============================================
// Mapping: Morabaa OperationType → bi-management invoice type
// Based on actual data:
//   2  → sale (بيع)           - 1915 فاتورة
//   9  → purchase (شراء)      - 156 فاتورة
//   11 → sale_return (مرتجع)  - 233 فاتورة
//   12 → purchase_return      - 11 فاتورة
//   18 → quotation (عرض سعر) - 14 فاتورة
// ============================================
const BILL_TYPE_MAP = {
    2: 'sale',
    9: 'purchase',
    11: 'sale_return',
    12: 'purchase_return',
    18: 'quotation',
};

// Track ID mappings (Morabaa int ID → UUID)
const idMaps = {
    accounts: {},
    customers: {},
    suppliers: {},
    items: {},
    groups: {},
    stores: {},
    bills: {},
    bonds: {},
};

// Output SQL statements
let outputSQL = [];
let stats = {
    categories: 0,
    customers: 0,
    suppliers: 0,
    products: 0,
    invoices: 0,
    invoiceItems: 0,
    vouchers: 0,
    warehouses: 0,
};

// ============================================
// Helper Functions
// ============================================
function escapeSQL(val) {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return val.toString();
    if (typeof val === 'boolean') return val ? '1' : '0';
    if (val instanceof Date) {
        return `'${val.toISOString()}'`;
    }
    return `'${String(val).replace(/'/g, "''")}'`;
}

function generateId() {
    return uuidv4();
}

function cleanPhone(phone) {
    if (!phone) return null;
    return phone.replace(/[^\d+]/g, '').trim() || null;
}

function toFloat(val) {
    if (val === null || val === undefined) return 0;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
}

function toInt(val) {
    if (val === null || val === undefined) return 0;
    const n = parseInt(val);
    return isNaN(n) ? 0 : n;
}

// ============================================
// Migration Functions
// ============================================

async function migrateGroups(pool) {
    console.log('📦 Migrating Groups → categories...');
    const result = await pool.request().query(`
    SELECT Id, Name FROM Groups WHERE Name IS NOT NULL
  `);

    for (const row of result.recordset) {
        const id = generateId();
        idMaps.groups[row.Id] = id;
        const name = row.Name || `مجموعة ${row.Id}`;

        outputSQL.push(`INSERT INTO categories (id, name, name_ar) VALUES (${escapeSQL(id)}, ${escapeSQL(name)}, ${escapeSQL(name)}) ON CONFLICT (id) DO NOTHING;`);
        stats.categories++;
    }
    console.log(`   ✅ ${stats.categories} categories`);
}

async function migrateStores(pool) {
    console.log('🏭 Migrating Stores → warehouses...');
    const result = await pool.request().query(`
    SELECT Id, Name, BranchId FROM Stores
  `);

    for (const row of result.recordset) {
        const id = generateId();
        idMaps.stores[row.Id] = id;
        const name = row.Name || `مخزن ${row.Id}`;
        const code = `WH-M${row.Id}`;

        outputSQL.push(`INSERT INTO warehouses (id, code, name, type, created_at) VALUES (${escapeSQL(id)}, ${escapeSQL(code)}, ${escapeSQL(name)}, 'main', CURRENT_TIMESTAMP) ON CONFLICT (id) DO NOTHING;`);
        stats.warehouses++;
    }
    console.log(`   ✅ ${stats.warehouses} warehouses`);
}

async function migrateAccounts(pool) {
    console.log('👥 Migrating Accounts → customers & suppliers...');

    // Find which accounts are used in sales (customers)
    const salesAccounts = await pool.request().query(`
    SELECT DISTINCT AccountId FROM Bills 
    WHERE OperationType IN (2, 11, 18) AND Deleted = 0 AND AccountId IS NOT NULL
  `);
    const salesAccountIds = new Set(salesAccounts.recordset.map(r => r.AccountId));

    // Find which accounts are used in purchases (suppliers)
    const purchaseAccounts = await pool.request().query(`
    SELECT DISTINCT AccountId FROM Bills 
    WHERE OperationType IN (9, 12) AND Deleted = 0 AND AccountId IS NOT NULL
  `);
    const purchaseAccountIds = new Set(purchaseAccounts.recordset.map(r => r.AccountId));

    // Get all accounts
    const result = await pool.request().query(`
    SELECT a.AccountId, a.Name, a.Mobile, a.Email, a.Address, a.City,
           a.Note, a.CDate, a.DisableAccount, a.Deleted, a.IsCash,
           a.OverRunBalnce, a.CustomerNumber, a.AccountTypeId
    FROM accounts a
    WHERE a.Deleted = 0 AND a.Name IS NOT NULL AND a.Name != ''
    ORDER BY a.AccountId
  `);

    for (const row of result.recordset) {
        const accountId = row.AccountId;
        const name = row.Name;
        const phone = cleanPhone(row.Mobile);
        const email = row.Email || null;
        const address = row.Address || null;
        const city = row.City || null;
        const notes = row.Note || null;
        const createdAt = row.CDate || new Date();
        const isActive = row.DisableAccount ? 0 : 1;
        const balance = toFloat(row.OverRunBalnce);

        const isCustomer = salesAccountIds.has(accountId);
        const isSupplier = purchaseAccountIds.has(accountId);

        // If account appears in sales OR is not in any bill → customer
        if (isCustomer || !isSupplier) {
            const id = generateId();
            idMaps.customers[accountId] = id;
            idMaps.accounts[accountId] = id;

            const code = `C-${String(accountId).padStart(4, '0')}`;
            const type = row.IsCash ? 'cash' : 'retail';

            outputSQL.push(`INSERT INTO customers (id, code, name, type, phone, email, addresses, balance, credit_limit, notes, is_active, created_at) VALUES (${escapeSQL(id)}, ${escapeSQL(code)}, ${escapeSQL(name)}, ${escapeSQL(type)}, ${escapeSQL(phone)}, ${escapeSQL(email)}, ${escapeSQL(address)}, ${balance}, ${balance > 0 ? balance * 2 : 0}, ${escapeSQL(notes)}, ${isActive}, ${escapeSQL(createdAt)}) ON CONFLICT (id) DO NOTHING;`);
            stats.customers++;
        }

        // If account appears in purchases → also add as supplier
        if (isSupplier) {
            const id = generateId();
            idMaps.suppliers[accountId] = id;
            if (!idMaps.accounts[accountId]) {
                idMaps.accounts[accountId] = id;
            }

            const code = `S-${String(accountId).padStart(4, '0')}`;

            outputSQL.push(`INSERT INTO suppliers (id, code, name, name_ar, type, phone, email, address, city, notes, balance, is_active, created_at) VALUES (${escapeSQL(id)}, ${escapeSQL(code)}, ${escapeSQL(name)}, ${escapeSQL(name)}, 'company', ${escapeSQL(phone)}, ${escapeSQL(email)}, ${escapeSQL(address)}, ${escapeSQL(city)}, ${escapeSQL(notes)}, ${balance}, ${isActive}, ${escapeSQL(createdAt)}) ON CONFLICT (id) DO NOTHING;`);
            stats.suppliers++;
        }
    }
    console.log(`   ✅ ${stats.customers} customers, ${stats.suppliers} suppliers`);
}

async function migrateItems(pool) {
    console.log('📱 Migrating Items → products...');

    // Get quantities for each item (Quantities table uses 'Number' not 'Quantity')
    let quantities;
    try {
        quantities = await pool.request().query(`
        SELECT ItemId, SUM(Number) as TotalQty
        FROM Quantities
        GROUP BY ItemId
      `);
    } catch (e) {
        // If 'Number' fails, try to discover the column name
        console.log('   ⚠️ Trying alternative column names for Quantities...');
        try {
            const cols = await pool.request().query(`SELECT TOP 1 * FROM Quantities`);
            console.log('   📋 Quantities columns:', Object.keys(cols.recordset[0] || {}));
            quantities = { recordset: [] };
        } catch (e2) {
            quantities = { recordset: [] };
        }
    }
    const qtyMap = {};
    for (const q of quantities.recordset) {
        qtyMap[q.ItemId] = toInt(q.TotalQty);
    }

    // Get barcodes from separate Barcodes table
    let barcodeMap = {};
    try {
        const barcodes = await pool.request().query(`SELECT ItemId, Code FROM Barcodes`);
        for (const b of barcodes.recordset) {
            if (!barcodeMap[b.ItemId]) barcodeMap[b.ItemId] = b.Code;
        }
    } catch (e) {
        console.log('   ⚠️ Barcodes table not accessible, skipping barcodes');
    }

    const result = await pool.request().query(`
    SELECT i.Id, i.Name, i.ItemCode, i.BuyPrice, i.SalePrice1, i.SalePrice2,
           i.SalePrice3, i.SalePriceWhole, i.SalePricePrivate,
           i.GroupId, i.Source, i.Details, i.Notes, i.Minimum,
           i.Deleted, i.DateAdded, i.Metering, i.Location,
           i.ExpireDate, i.BatchNumber
    FROM Items i
    WHERE i.Deleted = 0 AND i.Name IS NOT NULL AND i.Name != ''
    ORDER BY i.Id
  `);

    for (const row of result.recordset) {
        const id = generateId();
        idMaps.items[row.Id] = id;

        const code = row.ItemCode || `ITM-${String(row.Id).padStart(4, '0')}`;
        const name = row.Name;
        const costPrice = toFloat(row.BuyPrice);
        const sellingPrice = toFloat(row.SalePrice1);
        const wholesalePrice = toFloat(row.SalePriceWhole || row.SalePrice2);
        const minPrice = toFloat(row.SalePricePrivate || row.SalePrice3);
        const categoryId = row.GroupId ? (idMaps.groups[row.GroupId] || null) : null;
        const brand = row.Source || null;
        const description = row.Details || null;
        const quantity = qtyMap[row.Id] || 0;
        const minQuantity = toInt(row.Minimum);
        const unit = row.Metering || 'piece';
        const createdAt = row.DateAdded || new Date();
        const barcode = barcodeMap[row.Id] || null;

        outputSQL.push(`INSERT INTO products (id, code, barcode, name, name_ar, description, category_id, brand, cost_price, selling_price, wholesale_price, min_price, quantity, min_quantity, unit, is_active, created_at) VALUES (${escapeSQL(id)}, ${escapeSQL(code)}, ${escapeSQL(barcode)}, ${escapeSQL(name)}, ${escapeSQL(name)}, ${escapeSQL(description)}, ${escapeSQL(categoryId)}, ${escapeSQL(brand)}, ${costPrice}, ${sellingPrice}, ${wholesalePrice}, ${minPrice}, ${quantity}, ${minQuantity}, ${escapeSQL(unit)}, 1, ${escapeSQL(createdAt)}) ON CONFLICT (id) DO NOTHING;`);
        stats.products++;
    }
    console.log(`   ✅ ${stats.products} products`);
}

async function migrateBills(pool) {
    console.log('🧾 Migrating Bills → invoices...');

    const result = await pool.request().query(`
    SELECT b.Id, b.BillId, b.AccountId, b.OperationType, b.Date, b.BillAmount1,
           b.Cost1, b.Discount1, b.DisType1, b.Paid1, b.Remain1, b.Tax,
           b.Note, b.UserId, b.StoreId, b.ProviderId, b.Deleted,
           b.MachineDate, b.State, b.ItemDiscount1, b.PaidDiscount,
           b.CurrentBalance1, b.PastBalance1
    FROM Bills b
    WHERE b.Deleted = 0
    ORDER BY b.Date ASC
  `);

    for (const row of result.recordset) {
        const id = generateId();
        idMaps.bills[row.Id] = id;

        const opType = row.OperationType || 2;
        const type = BILL_TYPE_MAP[opType] || 'sale';
        const invoiceNumber = `INV-${String(row.BillId || row.Id).padStart(5, '0')}`;

        // Determine customer/supplier
        let customerId = null;
        let supplierId = null;

        if (type === 'sale' || type === 'sale_return' || type === 'quotation') {
            customerId = row.AccountId ? (idMaps.customers[row.AccountId] || null) : null;
        } else if (type === 'purchase' || type === 'purchase_return') {
            supplierId = row.AccountId ? (idMaps.suppliers[row.AccountId] || null) : null;
            if (!supplierId && row.AccountId) {
                supplierId = idMaps.accounts[row.AccountId] || null;
            }
        }

        const subtotal = toFloat(row.BillAmount1);
        const discountAmount = toFloat(row.Discount1) + toFloat(row.ItemDiscount1);
        const taxAmount = toFloat(row.Tax);
        const total = subtotal - discountAmount + taxAmount;
        const paidAmount = toFloat(row.Paid1) + toFloat(row.PaidDiscount);
        const remainingAmount = toFloat(row.Remain1);
        const createdAt = row.Date || row.MachineDate || new Date();
        const notes = row.Note || null;

        // Payment status
        let paymentStatus = 'pending';
        if (remainingAmount <= 0 && paidAmount > 0) paymentStatus = 'paid';
        else if (paidAmount > 0) paymentStatus = 'partial';

        // Invoice status
        let status = 'completed';
        if (type === 'quotation') status = 'draft';

        // Payment type
        const paymentType = remainingAmount <= 0 ? 'cash' : 'credit';

        outputSQL.push(`INSERT INTO invoices (id, invoice_number, type, payment_type, status, payment_status, customer_id, supplier_id, subtotal, discount_amount, tax_amount, total, paid_amount, remaining_amount, notes, created_at, updated_at) VALUES (${escapeSQL(id)}, ${escapeSQL(invoiceNumber)}, ${escapeSQL(type)}, ${escapeSQL(paymentType)}, ${escapeSQL(status)}, ${escapeSQL(paymentStatus)}, ${escapeSQL(customerId)}, ${escapeSQL(supplierId)}, ${subtotal}, ${discountAmount}, ${taxAmount}, ${total}, ${paidAmount}, ${remainingAmount}, ${escapeSQL(notes)}, ${escapeSQL(createdAt)}, ${escapeSQL(createdAt)}) ON CONFLICT (id) DO NOTHING;`);
        stats.invoices++;
    }
    console.log(`   ✅ ${stats.invoices} invoices`);
}

async function migrateBillItems(pool) {
    console.log('📋 Migrating BillItems → invoice_items...');

    // BillItems columns: Id, BillId, ItemId, Number (qty), SinglePrice, BuyPrice, Discount, Note, Date
    const result = await pool.request().query(`
    SELECT bi.Id, bi.BillId, bi.ItemId, bi.Number as Quantity, bi.SinglePrice,
           bi.BuyPrice, bi.Discount, bi.Note, bi.Tax,
           i.Name as ItemName
    FROM BillItems bi
    LEFT JOIN Items i ON bi.ItemId = i.Id
    LEFT JOIN Bills b ON bi.BillId = b.Id
    WHERE b.Deleted = 0 AND bi.Deleted = 0
    ORDER BY bi.BillId
  `);

    for (const row of result.recordset) {
        const id = generateId();
        const invoiceId = idMaps.bills[row.BillId];
        if (!invoiceId) continue; // Skip if parent invoice not migrated

        const productId = row.ItemId ? (idMaps.items[row.ItemId] || null) : null;
        const productName = row.ItemName || null;
        const quantity = toInt(row.Quantity) || 1;
        const unitPrice = toFloat(row.SinglePrice);
        const costPrice = toFloat(row.BuyPrice);
        const discount = toFloat(row.Discount);
        const total = (quantity * unitPrice) - discount;

        outputSQL.push(`INSERT INTO invoice_items (id, invoice_id, product_id, product_name, quantity, unit_price, cost_price, discount, total) VALUES (${escapeSQL(id)}, ${escapeSQL(invoiceId)}, ${escapeSQL(productId)}, ${escapeSQL(productName)}, ${quantity}, ${unitPrice}, ${costPrice}, ${discount}, ${total}) ON CONFLICT (id) DO NOTHING;`);
        stats.invoiceItems++;
    }
    console.log(`   ✅ ${stats.invoiceItems} invoice items`);
}

async function migrateBonds(pool) {
    console.log('💰 Migrating Bonds → vouchers...');

    const result = await pool.request().query(`
    SELECT b.Id, b.AccountFromId, b.AccountToId, b.Amount1,
           b.Date, b.Note, b.OperationsType, b.UserId,
           b.Deleted, b.MachineDate, b.Reason, b.Commission
    FROM Bonds b
    WHERE b.Deleted = 0
    ORDER BY b.Date ASC
  `);

    for (const row of result.recordset) {
        const id = generateId();
        idMaps.bonds[row.Id] = id;

        const voucherNumber = `VCH-${String(row.Id).padStart(5, '0')}`;
        const amount = toFloat(row.Amount1);
        const createdAt = row.Date || row.MachineDate || new Date();
        const notes = row.Note || null;
        const description = row.Reason || null;

        // Determine type based on OperationsType
        const opType = row.OperationsType || 1;
        let type = 'receipt'; // سند قبض
        if (opType === 2 || opType === 4) type = 'payment'; // سند صرف
        if (opType === 3) type = 'transfer'; // تحويل

        // Determine customer/supplier
        let customerId = null;
        let supplierId = null;

        if (row.AccountFromId && idMaps.customers[row.AccountFromId]) {
            customerId = idMaps.customers[row.AccountFromId];
        } else if (row.AccountToId && idMaps.customers[row.AccountToId]) {
            customerId = idMaps.customers[row.AccountToId];
        }
        if (row.AccountFromId && idMaps.suppliers[row.AccountFromId]) {
            supplierId = idMaps.suppliers[row.AccountFromId];
        } else if (row.AccountToId && idMaps.suppliers[row.AccountToId]) {
            supplierId = idMaps.suppliers[row.AccountToId];
        }

        outputSQL.push(`INSERT INTO vouchers (id, voucher_number, type, amount, currency, customer_id, supplier_id, description, notes, created_at) VALUES (${escapeSQL(id)}, ${escapeSQL(voucherNumber)}, ${escapeSQL(type)}, ${amount}, 'IQD', ${escapeSQL(customerId)}, ${escapeSQL(supplierId)}, ${escapeSQL(description)}, ${escapeSQL(notes)}, ${escapeSQL(createdAt)}) ON CONFLICT (id) DO NOTHING;`);
        stats.vouchers++;
    }
    console.log(`   ✅ ${stats.vouchers} vouchers`);
}

// ============================================
// Main Migration
// ============================================
async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   🔄 Morabaa → BI Management Migration     ║');
    console.log('║   ترحيل بيانات المربع إلى نظام bi          ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');

    let pool;
    try {
        console.log('🔌 Connecting to SQL Server...');
        pool = await sql.connect(sqlConfig);
        console.log('   ✅ Connected successfully!\n');

        // SQL header
        outputSQL.push('-- ============================================');
        outputSQL.push('-- Morabaa → BI Management Data Migration');
        outputSQL.push(`-- Generated: ${new Date().toISOString()}`);
        outputSQL.push('-- Source: MorabaaDB (SQL Server 2014)');
        outputSQL.push('-- Target: bi_erp (PostgreSQL)');
        outputSQL.push('-- ============================================');
        outputSQL.push('');
        outputSQL.push("SET client_min_messages TO WARNING;");
        outputSQL.push('');

        // Run migrations in order (order matters for foreign key references)
        await migrateGroups(pool);
        await migrateStores(pool);
        await migrateAccounts(pool);
        await migrateItems(pool);
        await migrateBills(pool);
        await migrateBillItems(pool);
        await migrateBonds(pool);

        // Footer
        outputSQL.push('');
        outputSQL.push('-- Migration complete');
        outputSQL.push('');
        outputSQL.push(`-- ============================================`);
        outputSQL.push(`-- Migration Stats:`);
        outputSQL.push(`--   Categories:    ${stats.categories}`);
        outputSQL.push(`--   Customers:     ${stats.customers}`);
        outputSQL.push(`--   Suppliers:     ${stats.suppliers}`);
        outputSQL.push(`--   Products:      ${stats.products}`);
        outputSQL.push(`--   Invoices:      ${stats.invoices}`);
        outputSQL.push(`--   Invoice Items: ${stats.invoiceItems}`);
        outputSQL.push(`--   Vouchers:      ${stats.vouchers}`);
        outputSQL.push(`--   Warehouses:    ${stats.warehouses}`);
        outputSQL.push(`-- ============================================`);

        // Write output file
        const outputPath = path.join(__dirname, '..', 'data', 'morabaa_migration.sql');
        const dataDir = path.dirname(outputPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, outputSQL.join('\n'), 'utf8');

        console.log('\n' + '═'.repeat(50));
        console.log('📊 Migration Summary:');
        console.log('═'.repeat(50));
        console.log(`   📁 Categories:    ${stats.categories}`);
        console.log(`   👥 Customers:     ${stats.customers}`);
        console.log(`   🏢 Suppliers:     ${stats.suppliers}`);
        console.log(`   📦 Products:      ${stats.products}`);
        console.log(`   🧾 Invoices:      ${stats.invoices}`);
        console.log(`   📋 Invoice Items: ${stats.invoiceItems}`);
        console.log(`   💰 Vouchers:      ${stats.vouchers}`);
        console.log(`   🏭 Warehouses:    ${stats.warehouses}`);
        console.log('═'.repeat(50));
        console.log(`\n✅ SQL file saved to: ${outputPath}`);
        console.log('\n📌 Next steps:');
        console.log('   1. Copy the SQL file to your server:');
        console.log('      scp data/morabaa_migration.sql root@srv1354622.hstgr.cloud:/tmp/');
        console.log('   2. SSH to server and run:');
        console.log('      psql -U bi_admin -d bi_management -f /tmp/morabaa_migration.sql');

    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

main();
