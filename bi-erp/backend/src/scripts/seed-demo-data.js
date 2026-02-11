/**
 * BI ERP - Seed Demo Data
 * بيانات تجريبية لإظهار النظام بشكل حقيقي
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const id = () => uuidv4();
const now = () => new Date().toISOString();

async function seed() {
  console.log('🌱 بدء إضافة البيانات التجريبية...\n');

  // === CUSTOMERS ===
  console.log('👥 إضافة عملاء...');
  const customers = [
    { id: id(), name: 'أحمد محمد العلي', phone: '07701234567', email: 'ahmed@example.com', address: 'بغداد - الكرادة', balance: 250000 },
    { id: id(), name: 'سارة حسين', phone: '07709876543', email: 'sara@example.com', address: 'بغداد - المنصور', balance: 0 },
    { id: id(), name: 'شركة النور للتقنية', phone: '07705551234', email: 'noor@company.iq', address: 'بغداد - الجادرية', balance: 1500000 },
    { id: id(), name: 'مؤسسة البركة التجارية', phone: '07703334444', email: 'baraka@biz.iq', address: 'أربيل - عينكاوة', balance: 750000 },
    { id: id(), name: 'علي كريم', phone: '07708887777', email: 'ali.k@example.com', address: 'بصرة - العشار', balance: 100000 },
    { id: id(), name: 'فاطمة جاسم', phone: '07706665555', email: 'fatima@example.com', address: 'نجف - حي السعد', balance: 0 },
    { id: id(), name: 'شركة المستقبل الرقمي', phone: '07702223333', email: 'future@digital.iq', address: 'بغداد - زيونة', balance: 3200000 },
    { id: id(), name: 'حسن عبدالله', phone: '07704445566', email: 'hasan@example.com', address: 'كربلاء', balance: 50000 },
  ];
  for (const c of customers) {
    try {
      await pool.query(
        'INSERT INTO customers (id, name, phone, email, address, balance, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',
        [c.id, c.name, c.phone, c.email, c.address, c.balance, now()]
      );
    } catch (e) { /* ignore duplicates */ }
  }
  console.log(`  ✓ ${customers.length} عميل`);

  // === SUPPLIERS ===
  console.log('🏭 إضافة موردين...');
  const suppliers = [
    { id: id(), name: 'شركة Dell العراق', phone: '07711112222', email: 'dell@supplier.iq', address: 'بغداد', balance: 500000 },
    { id: id(), name: 'HP الشرق الأوسط', phone: '07712223333', email: 'hp@supplier.iq', address: 'أربيل', balance: 350000 },
    { id: id(), name: 'مؤسسة التقنية المتقدمة', phone: '07713334444', email: 'adv@tech.iq', address: 'بغداد - الحارثية', balance: 200000 },
    { id: id(), name: 'شركة لينوفو العراق', phone: '07714445555', email: 'lenovo@supplier.iq', address: 'بغداد', balance: 0 },
  ];
  for (const s of suppliers) {
    try {
      await pool.query(
        'INSERT INTO suppliers (id, name, phone, email, address, balance, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',
        [s.id, s.name, s.phone, s.email, s.address, s.balance, now()]
      );
    } catch (e) { /* ignore */ }
  }
  console.log(`  ✓ ${suppliers.length} مورد`);

  // === PRODUCTS ===
  console.log('📦 إضافة منتجات...');
  const products = [
    { id: id(), code: 'DELL-5530', name: 'Dell Latitude 5530', name_ar: 'ديل لاتيتيود 5530', cost_price: 850000, selling_price: 1100000, quantity: 25, min_quantity: 5 },
    { id: id(), code: 'HP-450G9', name: 'HP EliteBook 450 G9', name_ar: 'اتش بي اليت بوك 450', cost_price: 780000, selling_price: 950000, quantity: 18, min_quantity: 5 },
    { id: id(), code: 'LEN-T14', name: 'Lenovo ThinkPad T14', name_ar: 'لينوفو ثنك باد T14', cost_price: 720000, selling_price: 900000, quantity: 12, min_quantity: 3 },
    { id: id(), code: 'DELL-OPT', name: 'Dell OptiPlex 7010', name_ar: 'ديل اوبتيبلكس 7010', cost_price: 450000, selling_price: 600000, quantity: 30, min_quantity: 10 },
    { id: id(), code: 'MON-24', name: 'Dell Monitor 24"', name_ar: 'شاشة ديل 24 انش', cost_price: 180000, selling_price: 250000, quantity: 40, min_quantity: 10 },
    { id: id(), code: 'KB-DELL', name: 'Dell Keyboard & Mouse', name_ar: 'كيبورد وماوس ديل', cost_price: 25000, selling_price: 45000, quantity: 100, min_quantity: 20 },
    { id: id(), code: 'RAM-16', name: 'RAM DDR4 16GB', name_ar: 'رام 16 جيجا', cost_price: 45000, selling_price: 65000, quantity: 50, min_quantity: 15 },
    { id: id(), code: 'SSD-512', name: 'SSD 512GB NVMe', name_ar: 'هارد SSD 512', cost_price: 55000, selling_price: 80000, quantity: 35, min_quantity: 10 },
    { id: id(), code: 'HP-LASER', name: 'HP LaserJet Pro', name_ar: 'طابعة HP ليزر', cost_price: 220000, selling_price: 320000, quantity: 8, min_quantity: 3 },
    { id: id(), code: 'UPS-1500', name: 'APC UPS 1500VA', name_ar: 'يو بي اس 1500', cost_price: 120000, selling_price: 180000, quantity: 15, min_quantity: 5 },
  ];
  for (const p of products) {
    try {
      await pool.query(
        'INSERT INTO products (id, code, sku, name, name_ar, cost_price, selling_price, quantity, min_quantity, is_active, created_at, updated_at) VALUES ($1,$2,$2,$3,$4,$5,$6,$7,$8,true,$9,$9) ON CONFLICT DO NOTHING',
        [p.id, p.code, p.name, p.name_ar, p.cost_price, p.selling_price, p.quantity, p.min_quantity, now()]
      );
    } catch (e) { /* ignore */ }
  }
  console.log(`  ✓ ${products.length} منتج`);

  // === INVOICES ===
  console.log('🧾 إضافة فواتير...');
  const invoiceData = [
    { type: 'sale', total: 1100000, paid: 1100000, status: 'completed', payment_status: 'paid', customer_idx: 0 },
    { type: 'sale', total: 2200000, paid: 1000000, status: 'active', payment_status: 'partial', customer_idx: 2 },
    { type: 'sale', total: 950000, paid: 950000, status: 'completed', payment_status: 'paid', customer_idx: 1 },
    { type: 'sale', total: 600000, paid: 0, status: 'active', payment_status: 'pending', customer_idx: 3 },
    { type: 'sale', total: 3500000, paid: 3500000, status: 'completed', payment_status: 'paid', customer_idx: 6 },
    { type: 'purchase', total: 8500000, paid: 8500000, status: 'completed', payment_status: 'paid', customer_idx: 0 },
    { type: 'purchase', total: 4680000, paid: 2000000, status: 'active', payment_status: 'partial', customer_idx: 0 },
    { type: 'sale', total: 250000, paid: 250000, status: 'completed', payment_status: 'paid', customer_idx: 4 },
  ];
  for (let i = 0; i < invoiceData.length; i++) {
    const inv = invoiceData[i];
    const invId = id();
    const invNum = `INV-2026-${String(i + 1).padStart(4, '0')}`;
    const custId = inv.type === 'purchase' ? null : customers[inv.customer_idx]?.id;
    const suppId = inv.type === 'purchase' ? suppliers[0]?.id : null;
    try {
      await pool.query(
        `INSERT INTO invoices (id, invoice_number, type, customer_id, supplier_id, total, paid_amount, remaining_amount, status, payment_status, created_by, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING`,
        [invId, invNum, inv.type, custId, suppId, inv.total, inv.paid, inv.total - inv.paid, inv.status, inv.payment_status, 
         (await pool.query('SELECT id FROM users LIMIT 1')).rows[0]?.id, now()]
      );
    } catch (e) { /* ignore */ }
  }
  console.log(`  ✓ ${invoiceData.length} فاتورة`);

  // === ROLES ===
  console.log('🔐 إضافة أدوار...');
  const roles = [
    { name: 'owner', label: 'مالك النظام', description: 'صلاحيات كاملة' },
    { name: 'admin', label: 'مدير', description: 'إدارة النظام' },
    { name: 'manager', label: 'مدير قسم', description: 'إدارة القسم' },
    { name: 'accountant', label: 'محاسب', description: 'العمليات المالية' },
    { name: 'sales', label: 'مبيعات', description: 'عمليات البيع' },
    { name: 'inventory', label: 'مخزن', description: 'إدارة المخزون' },
    { name: 'hr', label: 'موارد بشرية', description: 'شؤون الموظفين' },
    { name: 'employee', label: 'موظف', description: 'صلاحيات أساسية' },
  ];
  for (const r of roles) {
    try {
      await pool.query(
        'INSERT INTO roles (id, name, label, description, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
        [id(), r.name, r.label, r.description, now()]
      );
    } catch (e) { /* ignore */ }
  }
  console.log(`  ✓ ${roles.length} دور`);

  console.log('\n✅ تمت إضافة البيانات التجريبية بنجاح!');
  console.log('🔄 أعد تحميل الموقع لرؤية البيانات.\n');
  pool.end();
}

seed().catch(e => { console.error('❌ خطأ:', e.message); pool.end(); });
