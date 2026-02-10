/**
 * Realistic Worker - عامل واقعي
 * 
 * يعمل كموظف حقيقي:
 * - ينشئ عملاء جدد
 * - يضيف منتجات
 * - يصدر فواتير بيع وشراء
 * - يسجل مدفوعات
 * - يحرك المخزون
 * - ينشئ مهام
 */

const { run, get, all } = require('../../config/database');

class RealisticWorker {
    constructor(bot) {
        this.bot = bot;
        this.isWorking = false;
        this.workInterval = null;
        
        // إحصائيات العمل
        this.stats = {
            customersCreated: 0,
            productsCreated: 0,
            invoicesCreated: 0,
            paymentsRecorded: 0,
            tasksCreated: 0,
            totalSales: 0,
            totalPurchases: 0,
            startTime: null
        };
        
        // بيانات واقعية عراقية
        this.data = {
            firstNames: ['أحمد', 'محمد', 'علي', 'حسين', 'عباس', 'كاظم', 'جعفر', 'مصطفى', 'حيدر', 'زيد', 
                        'فاطمة', 'زينب', 'مريم', 'سارة', 'نور', 'هدى', 'رقية', 'آمنة', 'خديجة', 'ياسمين'],
            lastNames: ['الموسوي', 'الحسيني', 'العلوي', 'الكاظمي', 'البغدادي', 'النجفي', 'الكربلائي', 
                       'السامرائي', 'التميمي', 'الجبوري', 'الشمري', 'العبيدي', 'الراوي', 'المالكي'],
            companies: ['شركة النور للتجارة', 'مؤسسة الأمل', 'شركة الفرات', 'مجموعة دجلة', 'شركة بابل',
                       'مؤسسة السلام', 'شركة الرافدين', 'مجموعة الكرخ', 'شركة الرصافة', 'مؤسسة البصرة'],
            cities: ['بغداد', 'البصرة', 'النجف', 'كربلاء', 'أربيل', 'السليمانية', 'الموصل', 'كركوك'],
            areas: ['الكرادة', 'المنصور', 'زيونة', 'الجادرية', 'الكاظمية', 'الأعظمية', 'البياع', 'الدورة'],
            products: [
                { name: 'لابتوب Dell Inspiron', category: 'إلكترونيات', cost: 450000, price: 550000 },
                { name: 'لابتوب HP Pavilion', category: 'إلكترونيات', cost: 400000, price: 500000 },
                { name: 'شاشة Samsung 24"', category: 'إلكترونيات', cost: 150000, price: 200000 },
                { name: 'طابعة HP LaserJet', category: 'إلكترونيات', cost: 200000, price: 280000 },
                { name: 'كيبورد Logitech', category: 'إكسسوارات', cost: 25000, price: 40000 },
                { name: 'ماوس لاسلكي', category: 'إكسسوارات', cost: 15000, price: 25000 },
                { name: 'هارد خارجي 1TB', category: 'تخزين', cost: 60000, price: 85000 },
                { name: 'فلاش 32GB', category: 'تخزين', cost: 8000, price: 15000 },
                { name: 'كابل HDMI', category: 'كابلات', cost: 5000, price: 10000 },
                { name: 'شاحن لابتوب', category: 'إكسسوارات', cost: 20000, price: 35000 },
                { name: 'حقيبة لابتوب', category: 'إكسسوارات', cost: 15000, price: 30000 },
                { name: 'سماعات بلوتوث', category: 'صوتيات', cost: 30000, price: 50000 },
                { name: 'كاميرا ويب HD', category: 'إلكترونيات', cost: 40000, price: 65000 },
                { name: 'راوتر TP-Link', category: 'شبكات', cost: 35000, price: 55000 },
                { name: 'UPS 650VA', category: 'طاقة', cost: 50000, price: 75000 }
            ],
            suppliers: [
                { name: 'شركة التقنية الحديثة', phone: '07801234567' },
                { name: 'مؤسسة الإلكترونيات المتقدمة', phone: '07709876543' },
                { name: 'شركة المستقبل للكمبيوتر', phone: '07501112233' },
                { name: 'مجموعة الخليج التجارية', phone: '07701234567' }
            ]
        };
    }

    /**
     * بدء العمل
     */
    startWorking(intervalMs = 5000) {
        if (this.isWorking) return;
        
        this.isWorking = true;
        this.stats.startTime = new Date().toISOString();
        this.bot.log('👷 العامل الواقعي بدأ العمل...');
        
        // تنفيذ عمل فوري
        this._doWork();
        
        // تنفيذ عمل دوري
        this.workInterval = setInterval(() => {
            this._doWork();
        }, intervalMs);
    }

    /**
     * إيقاف العمل
     */
    stopWorking() {
        if (!this.isWorking) return;
        
        this.isWorking = false;
        if (this.workInterval) {
            clearInterval(this.workInterval);
            this.workInterval = null;
        }
        
        this.bot.log('👷 العامل الواقعي توقف عن العمل');
        this.bot.log(`📊 ملخص العمل: ${JSON.stringify(this.stats)}`);
    }

    /**
     * تنفيذ عمل عشوائي
     */
    async _doWork() {
        const actions = [
            { weight: 30, action: () => this._createSaleInvoice() },
            { weight: 15, action: () => this._createCustomer() },
            { weight: 10, action: () => this._createProduct() },
            { weight: 15, action: () => this._recordPayment() },
            { weight: 10, action: () => this._createPurchaseInvoice() },
            { weight: 10, action: () => this._createTask() },
            { weight: 10, action: () => this._updateInventory() }
        ];
        
        // اختيار عمل عشوائي بناءً على الوزن
        const totalWeight = actions.reduce((sum, a) => sum + a.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const item of actions) {
            random -= item.weight;
            if (random <= 0) {
                try {
                    await item.action();
                } catch (error) {
                    this.bot.log(`⚠️ خطأ في العمل: ${error.message}`, 'warn');
                }
                break;
            }
        }
    }

    /**
     * إنشاء عميل جديد
     */
    async _createCustomer() {
        const id = this._generateId();
        const isCompany = Math.random() > 0.6;
        
        let name, phone, email;
        
        if (isCompany) {
            name = this._random(this.data.companies);
            phone = '077' + this._randomDigits(8);
            email = name.replace(/\s/g, '').toLowerCase() + '@company.iq';
        } else {
            const firstName = this._random(this.data.firstNames);
            const lastName = this._random(this.data.lastNames);
            name = `${firstName} ${lastName}`;
            phone = '077' + this._randomDigits(8);
            email = `${firstName.toLowerCase()}${this._randomDigits(3)}@email.com`;
        }
        
        const city = this._random(this.data.cities);
        const area = this._random(this.data.areas);
        const code = `CUS-${Date.now().toString().slice(-6)}`;
        
        // استخدام addresses كـ JSON
        const addresses = JSON.stringify([{ city, area, address: `${area}، ${city}` }]);
        
        await run(`
            INSERT INTO customers (id, code, name, type, phone, email, addresses, credit_limit, balance, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
        `, [id, code, name, isCompany ? 'wholesale' : 'retail', phone, email, addresses,
            isCompany ? 5000000 : 1000000]);
        
        this.stats.customersCreated++;
        this.bot.log(`👤 عميل جديد: ${name} (${code})`);
        
        return { id, name, code };
    }

    /**
     * إنشاء منتج جديد
     */
    async _createProduct() {
        const template = this._random(this.data.products);
        const id = this._generateId();
        const code = `PRD-${Date.now().toString().slice(-6)}`;
        const quantity = Math.floor(Math.random() * 50) + 10;
        
        // تغيير طفيف في السعر
        const priceVariation = 1 + (Math.random() * 0.2 - 0.1);
        const costPrice = Math.round(template.cost * priceVariation);
        const sellingPrice = Math.round(template.price * priceVariation);
        
        await run(`
            INSERT INTO products (id, code, name, description, cost_price, selling_price, quantity, min_quantity, unit, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 5, 'قطعة', CURRENT_TIMESTAMP)
        `, [id, code, template.name, `${template.name} - ${template.category}`, costPrice, sellingPrice, quantity]);
        
        this.stats.productsCreated++;
        this.bot.log(`📦 منتج جديد: ${template.name} (${quantity} قطعة، ${sellingPrice.toLocaleString()} د.ع)`);
        
        return { id, name: template.name, code, price: sellingPrice };
    }

    /**
     * إنشاء فاتورة بيع
     */
    async _createSaleInvoice() {
        // الحصول على عميل
        let customer = await get(`SELECT id, name FROM customers ORDER BY RANDOM() LIMIT 1`);
        if (!customer) {
            const newCustomer = this._createCustomer();
            customer = { id: newCustomer.id, name: newCustomer.name };
        }
        
        // الحصول على منتجات
        const products = await all(`SELECT id, name, selling_price, quantity FROM products WHERE quantity > 0 ORDER BY RANDOM() LIMIT ?`, 
            [Math.floor(Math.random() * 3) + 1]);
        
        if (products.length === 0) {
            this._createProduct();
            return;
        }
        
        const invoiceId = this._generateId();
        const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
        
        let subtotal = 0;
        const items = [];
        
        for (const product of products) {
            const qty = Math.min(Math.floor(Math.random() * 5) + 1, product.quantity);
            const price = product.selling_price || 10000;
            const lineTotal = qty * price;
            subtotal += lineTotal;
            
            items.push({
                productId: product.id,
                name: product.name,
                quantity: qty,
                price: price,
                total: lineTotal
            });
        }
        
        const discountAmount = Math.random() > 0.7 ? Math.round(subtotal * 0.05) : 0;
        const total = subtotal - discountAmount;
        
        // إنشاء الفاتورة
        await run(`
            INSERT INTO invoices (id, invoice_number, type, customer_id, subtotal, discount_amount, total, status, payment_status, created_at)
            VALUES (?, ?, 'sale', ?, ?, ?, ?, 'completed', 'pending', CURRENT_TIMESTAMP)
        `, [invoiceId, invoiceNumber, customer.id, subtotal, discountAmount, total]);
        
        // إضافة عناصر الفاتورة
        for (const item of items) {
            await run(`
                INSERT INTO invoice_items (id, invoice_id, product_id, quantity, unit_price, total, created_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [this._generateId(), invoiceId, item.productId, item.quantity, item.price, item.total]);
            
            // تقليل المخزون
            await run(`UPDATE products SET quantity = quantity - ? WHERE id = ?`, [item.quantity, item.productId]);
        }
        
        this.stats.invoicesCreated++;
        this.stats.totalSales += total;
        this.bot.log(`🧾 فاتورة بيع: ${invoiceNumber} - ${customer.name} - ${total.toLocaleString()} د.ع`);
        
        // تسجيل دفعة أحياناً
        if (Math.random() > 0.4) {
            this._recordPaymentForInvoice(invoiceId, total, 'sale');
        }
        
        return { id: invoiceId, number: invoiceNumber, total };
    }

    /**
     * إنشاء فاتورة شراء
     */
    async _createPurchaseInvoice() {
        // الحصول على مورد أو إنشاء واحد
        let supplier = await get(`SELECT id, name FROM suppliers ORDER BY RANDOM() LIMIT 1`);
        if (!supplier) {
            supplier = this._createSupplier();
        }
        
        const template = this._random(this.data.products);
        const invoiceId = this._generateId();
        const invoiceNumber = `PUR-${Date.now().toString().slice(-8)}`;
        
        const quantity = Math.floor(Math.random() * 20) + 10;
        const unitCost = template.cost;
        const total = quantity * unitCost;
        
        // إنشاء فاتورة الشراء
        await run(`
            INSERT INTO invoices (id, invoice_number, type, supplier_id, subtotal, total, status, payment_status, created_at)
            VALUES (?, ?, 'purchase', ?, ?, ?, 'completed', 'pending', CURRENT_TIMESTAMP)
        `, [invoiceId, invoiceNumber, supplier.id, total, total]);
        
        // إضافة أو تحديث المنتج
        let product = await get(`SELECT id FROM products WHERE name = ?`, [template.name]);
        if (product) {
            await run(`UPDATE products SET quantity = quantity + ?, cost_price = ? WHERE id = ?`, 
                [quantity, unitCost, product.id]);
        } else {
            const productId = this._generateId();
            const code = `PRD-${Date.now().toString().slice(-6)}`;
            await run(`
                INSERT INTO products (id, code, name, cost_price, selling_price, quantity, min_quantity, unit, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 5, 'قطعة', CURRENT_TIMESTAMP)
            `, [productId, code, template.name, unitCost, template.price, quantity]);
            product = { id: productId };
        }
        
        // إضافة عنصر الفاتورة
        await run(`
            INSERT INTO invoice_items (id, invoice_id, product_id, quantity, unit_price, total, created_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [this._generateId(), invoiceId, product.id, quantity, unitCost, total]);
        
        this.stats.invoicesCreated++;
        this.stats.totalPurchases += total;
        this.bot.log(`📥 فاتورة شراء: ${invoiceNumber} - ${template.name} x${quantity} - ${total.toLocaleString()} د.ع`);
        
        return { id: invoiceId, number: invoiceNumber, total };
    }

    /**
     * إنشاء مورد
     */
    async _createSupplier() {
        const template = this._random(this.data.suppliers);
        const id = this._generateId();
        const code = `SUP-${Date.now().toString().slice(-6)}`;
        
        await run(`
            INSERT INTO suppliers (id, code, name, phone, email, created_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [id, code, template.name, template.phone, template.name.replace(/\s/g, '').toLowerCase() + '@supplier.iq']);
        
        this.bot.log(`🏭 مورد جديد: ${template.name}`);
        
        return { id, name: template.name };
    }

    /**
     * تسجيل دفعة
     */
    async _recordPayment() {
        // البحث عن فاتورة غير مدفوعة
        const invoice = await get(`
            SELECT id, invoice_number, total, type, customer_id, supplier_id 
            FROM invoices 
            WHERE payment_status = 'pending' 
            ORDER BY RANDOM() LIMIT 1
        `);
        
        if (!invoice) return;
        
        this._recordPaymentForInvoice(invoice.id, invoice.total, invoice.type);
    }

    /**
     * تسجيل دفعة لفاتورة محددة
     */
    async _recordPaymentForInvoice(invoiceId, amount, type) {
        const paymentId = this._generateId();
        const paymentMethods = ['cash', 'bank_transfer', 'check'];
        const method = this._random(paymentMethods);
        
        await run(`
            INSERT INTO invoice_payments (id, invoice_id, amount, payment_method, notes, received_at)
            VALUES (?, ?, ?, ?, 'دفعة آلية', CURRENT_TIMESTAMP)
        `, [paymentId, invoiceId, amount, method]);
        
        await run(`UPDATE invoices SET payment_status = 'paid' WHERE id = ?`, [invoiceId]);
        
        this.stats.paymentsRecorded++;
        this.bot.log(`💰 دفعة: ${amount.toLocaleString()} د.ع (${method})`);
    }

    /**
     * إنشاء مهمة
     */
    async _createTask() {
        const id = this._generateId();
        const titles = [
            'متابعة طلب العميل',
            'تحديث أسعار المنتجات',
            'مراجعة المخزون',
            'إعداد تقرير المبيعات',
            'التواصل مع المورد',
            'فحص جودة البضاعة',
            'تحصيل الديون',
            'تجهيز طلبية',
            'صيانة النظام',
            'تدريب الموظفين'
        ];
        
        const priorities = ['low', 'medium', 'high'];
        const title = this._random(titles);
        const priority = this._random(priorities);
        
        await run(`
            INSERT INTO tasks (id, title, description, priority, status, created_at)
            VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
        `, [id, title, `مهمة تم إنشاؤها تلقائياً: ${title}`, priority]);
        
        this.stats.tasksCreated++;
        this.bot.log(`📋 مهمة جديدة: ${title} (${priority})`);
    }

    /**
     * تحديث المخزون
     */
    async _updateInventory() {
        const product = await get(`SELECT id, name, quantity FROM products ORDER BY RANDOM() LIMIT 1`);
        if (!product) return;
        
        const adjustment = Math.floor(Math.random() * 10) - 3; // -3 to +6
        if (adjustment === 0 || product.quantity + adjustment < 0) return;
        
        const movementType = adjustment > 0 ? 'adjustment_in' : 'adjustment_out';
        const notes = adjustment > 0 ? 'تعديل مخزون' : 'تالف/مفقود';
        
        // الحصول على مستودع افتراضي
        let warehouse = await get(`SELECT id FROM warehouses LIMIT 1`);
        if (!warehouse) {
            const warehouseId = this._generateId();
            await run(`INSERT INTO warehouses (id, code, name, type, created_at) VALUES (?, 'WH-001', 'المستودع الرئيسي', 'main', CURRENT_TIMESTAMP)`, [warehouseId]);
            warehouse = { id: warehouseId };
        }
        
        await run(`
            INSERT INTO inventory_movements (id, product_id, warehouse_id, movement_type, quantity, before_quantity, after_quantity, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [this._generateId(), product.id, warehouse.id, movementType, Math.abs(adjustment), 
            product.quantity, product.quantity + adjustment, notes]);
        
        await run(`UPDATE products SET quantity = quantity + ? WHERE id = ?`, [adjustment, product.id]);
        
        this.bot.log(`📊 تعديل مخزون: ${product.name} ${adjustment > 0 ? '+' : ''}${adjustment}`);
    }

    /**
     * الحصول على الإحصائيات
     */
    getStats() {
        const runtime = this.stats.startTime 
            ? Math.round((Date.now() - new Date(this.stats.startTime).getTime()) / 1000)
            : 0;
            
        return {
            ...this.stats,
            isWorking: this.isWorking,
            runtime: `${Math.floor(runtime / 60)}m ${runtime % 60}s`
        };
    }

    // Helpers
    _generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    _random(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    _randomDigits(count) {
        return Array.from({ length: count }, () => Math.floor(Math.random() * 10)).join('');
    }
}

module.exports = RealisticWorker;
