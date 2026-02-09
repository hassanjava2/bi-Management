/**
 * Data Generator Module
 * إنشاء بيانات تجريبية (فواتير، عملاء، منتجات، حركات)
 */

const { run, get, all } = require('../../config/database');
const { generateId, now } = require('../../utils/helpers');

class DataGenerator {
    constructor(bot) {
        this.bot = bot;
        
        // Sample data
        this.sampleNames = {
            firstNames: ['أحمد', 'محمد', 'علي', 'حسين', 'عبدالله', 'فاطمة', 'زينب', 'مريم', 'سارة', 'نور'],
            lastNames: ['العلي', 'الحسن', 'المحمود', 'السعيد', 'الكريم', 'الأمين', 'الرشيد', 'الفهد', 'العبدالله', 'الناصر'],
            companies: ['شركة النور', 'مؤسسة السلام', 'شركة الأمل', 'مجموعة النجاح', 'شركة المستقبل'],
            products: [
                { name: 'لابتوب HP', category: 'أجهزة كمبيوتر', price: 450 },
                { name: 'لابتوب Dell', category: 'أجهزة كمبيوتر', price: 500 },
                { name: 'لابتوب Lenovo', category: 'أجهزة كمبيوتر', price: 400 },
                { name: 'آيفون 15', category: 'هواتف', price: 1200 },
                { name: 'سامسونج S24', category: 'هواتف', price: 1000 },
                { name: 'شاشة LG 27"', category: 'شاشات', price: 250 },
                { name: 'كيبورد ميكانيكي', category: 'إكسسوارات', price: 80 },
                { name: 'ماوس لاسلكي', category: 'إكسسوارات', price: 35 },
                { name: 'طابعة HP', category: 'طابعات', price: 150 },
                { name: 'راوتر WiFi', category: 'شبكات', price: 60 }
            ],
            cities: ['بغداد', 'البصرة', 'أربيل', 'النجف', 'كربلاء', 'الموصل', 'السليمانية', 'الناصرية']
        };
        
        this.lastGeneration = null;
    }
    
    /**
     * إنشاء بيانات فعلية
     */
    async generateTestData() {
        this.bot.log('📦 Generating real data...');
        
        const results = {
            customers: 0,
            suppliers: 0,
            products: 0,
            invoices: 0,
            transactions: 0,
            tasks: 0
        };
        
        try {
            // Generate multiple items for realistic data
            const actions = ['customer', 'customer', 'product', 'product', 'invoice', 'invoice', 'invoice', 'task', 'inventory_movement'];
            const action = actions[Math.floor(Math.random() * actions.length)];
            
            switch (action) {
                case 'customer':
                    await this._generateCustomer();
                    results.customers = 1;
                    break;
                    
                case 'product':
                    await this._generateProduct();
                    results.products = 1;
                    break;
                    
                case 'invoice':
                    const invoiceResult = await this._generateInvoice();
                    results.invoices = invoiceResult ? 1 : 0;
                    break;
                    
                case 'task':
                    await this._generateTask();
                    results.tasks = 1;
                    break;
                    
                case 'inventory_movement':
                    await this._generateInventoryMovement();
                    results.transactions = 1;
                    break;
            }
            
            this.lastGeneration = { action, timestamp: now(), results };
            this.bot.log(`✅ Generated: ${action}`);
            
        } catch (error) {
            this.bot.log(`❌ Generation error: ${error.message}`, 'error');
        }
        
        return results;
    }

    /**
     * إنشاء بيانات مجمعة (bulk)
     */
    async generateBulkData(counts = {}) {
        const {
            customers = 5,
            products = 10,
            invoices = 3,
            tasks = 5
        } = counts;

        this.bot.log(`📦 Generating bulk data: ${customers} customers, ${products} products, ${invoices} invoices, ${tasks} tasks`);

        const results = {
            customers: 0,
            products: 0,
            invoices: 0,
            tasks: 0
        };

        // Generate customers
        for (let i = 0; i < customers; i++) {
            const customer = await this._generateCustomer();
            if (customer) results.customers++;
        }

        // Generate products
        for (let i = 0; i < products; i++) {
            const product = await this._generateProduct();
            if (product) results.products++;
        }

        // Generate invoices
        for (let i = 0; i < invoices; i++) {
            const invoice = await this._generateInvoice();
            if (invoice) results.invoices++;
        }

        // Generate tasks
        for (let i = 0; i < tasks; i++) {
            const task = await this._generateTask();
            if (task) results.tasks++;
        }

        this.bot.log(`✅ Bulk generation complete: ${JSON.stringify(results)}`);
        return results;
    }
    
    /**
     * إنشاء عميل
     */
    async _generateCustomer() {
        const firstName = this._random(this.sampleNames.firstNames);
        const lastName = this._random(this.sampleNames.lastNames);
        const city = this._random(this.sampleNames.cities);
        const id = generateId();
        const code = `C${Date.now().toString().slice(-6)}`;
        
        const addresses = JSON.stringify([{
            city: city,
            area: `شارع ${Math.floor(Math.random() * 100) + 1}`,
            details: `محلة ${Math.floor(Math.random() * 50) + 1}`,
            is_default: true
        }]);
        
        const customer = {
            id: id,
            code: code,
            name: `${firstName} ${lastName}`,
            type: Math.random() > 0.7 ? 'wholesale' : 'retail',
            phone: this._generatePhone(),
            email: `customer${code}@example.com`,
            addresses: addresses,
            credit_limit: Math.floor(Math.random() * 50) * 100000
        };
        
        try {
            run(`
                INSERT INTO customers (id, code, name, type, phone, email, addresses, credit_limit)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                customer.id, customer.code, customer.name, customer.type,
                customer.phone, customer.email, customer.addresses, customer.credit_limit
            ]);
            
            this.bot.logToDB('customer_generated', { customer_id: customer.id, name: customer.name });
            this.bot.log(`👤 Created customer: ${customer.name} - ${city}`);
            return customer;
        } catch (error) {
            this.bot.log(`Could not create customer: ${error.message}`, 'warn');
            return null;
        }
    }
    
    /**
     * إنشاء منتج
     */
    async _generateProduct() {
        const sampleProduct = this._random(this.sampleNames.products);
        const variant = Math.floor(Math.random() * 1000);
        const code = `P${Date.now().toString().slice(-6)}`;
        
        const product = {
            id: generateId(),
            code: code,
            sku: `SKU-${code}`,
            name: `${sampleProduct.name} - ${variant}`,
            brand: this._random(['HP', 'Dell', 'Lenovo', 'Samsung', 'Apple', 'LG', 'Asus', 'Acer']),
            cost_price: Math.round(sampleProduct.price * 0.7 * 1000), // بالدينار
            selling_price: Math.round(sampleProduct.price * 1000),
            wholesale_price: Math.round(sampleProduct.price * 0.9 * 1000),
            quantity: Math.floor(Math.random() * 50) + 5,
            min_quantity: 3,
            warranty_months: this._random([0, 6, 12, 24]),
            is_active: 1
        };
        
        try {
            run(`
                INSERT INTO products (id, code, sku, name, brand, cost_price, selling_price, wholesale_price, quantity, min_quantity, warranty_months, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                product.id, product.code, product.sku, product.name, product.brand,
                product.cost_price, product.selling_price, product.wholesale_price,
                product.quantity, product.min_quantity, product.warranty_months, product.is_active
            ]);
            
            this.bot.logToDB('product_generated', { product_id: product.id, name: product.name });
            this.bot.log(`📦 Created product: ${product.name} - ${product.selling_price} IQD`);
            return product;
        } catch (error) {
            this.bot.log(`Could not create product: ${error.message}`, 'warn');
            return null;
        }
    }
    
    /**
     * إنشاء فاتورة
     */
    async _generateInvoice() {
        // Get random customer
        const customer = get(`SELECT id, name FROM customers ORDER BY RANDOM() LIMIT 1`);
        if (!customer) {
            await this._generateCustomer();
            return null;
        }
        
        // Get random products
        const products = all(`SELECT id, name, selling_price, quantity FROM products WHERE quantity > 0 ORDER BY RANDOM() LIMIT 3`);
        if (!products || products.length === 0) {
            await this._generateProduct();
            return null;
        }
        
        const invoiceNumber = this._generateInvoiceNumber();
        const invoiceType = Math.random() > 0.3 ? 'sale' : 'purchase';
        const paymentType = this._random(['cash', 'credit', 'aqsaty']);
        
        // Calculate items first
        const items = [];
        let subtotal = 0;
        
        for (const product of products) {
            const qty = Math.min(Math.floor(Math.random() * 3) + 1, product.quantity || 1);
            const price = product.selling_price || 100000;
            const total = qty * price;
            
            items.push({
                id: generateId(),
                product_id: product.id,
                product_name: product.name,
                quantity: qty,
                unit_price: price,
                total: total
            });
            
            subtotal += total;
        }
        
        const discountPercent = Math.random() > 0.7 ? Math.floor(Math.random() * 10) : 0;
        const discountAmount = subtotal * discountPercent / 100;
        const total = subtotal - discountAmount;
        
        const invoice = {
            id: generateId(),
            invoice_number: invoiceNumber,
            type: invoiceType,
            payment_type: paymentType,
            customer_id: customer.id,
            status: paymentType === 'cash' ? 'completed' : 'pending',
            subtotal: subtotal,
            discount_percent: discountPercent,
            discount_amount: discountAmount,
            total: total,
            payment_method: paymentType,
            payment_status: paymentType === 'cash' ? 'paid' : 'pending',
            paid_amount: paymentType === 'cash' ? total : 0,
            remaining_amount: paymentType === 'cash' ? 0 : total,
            notes: 'فاتورة من البوت الذكي'
        };
        
        try {
            // Insert invoice
            run(`
                INSERT INTO invoices (id, invoice_number, type, payment_type, customer_id, status,
                    subtotal, discount_percent, discount_amount, total, payment_method, payment_status,
                    paid_amount, remaining_amount, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                invoice.id, invoice.invoice_number, invoice.type, invoice.payment_type, 
                invoice.customer_id, invoice.status, invoice.subtotal, invoice.discount_percent,
                invoice.discount_amount, invoice.total, invoice.payment_method, invoice.payment_status,
                invoice.paid_amount, invoice.remaining_amount, invoice.notes
            ]);
            
            // Insert items
            for (const item of items) {
                run(`
                    INSERT INTO invoice_items (id, invoice_id, product_id, quantity, unit_price, total)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [item.id, invoice.id, item.product_id, item.quantity, item.unit_price, item.total]);
                
                // Update product quantity
                if (invoiceType === 'sale') {
                    run(`UPDATE products SET quantity = quantity - ? WHERE id = ?`, [item.quantity, item.product_id]);
                } else {
                    run(`UPDATE products SET quantity = quantity + ? WHERE id = ?`, [item.quantity, item.product_id]);
                }
            }
            
            this.bot.logToDB('invoice_generated', {
                invoice_id: invoice.id,
                invoice_number: invoice.invoice_number,
                type: invoice.type,
                total: invoice.total,
                items_count: items.length
            });
            
            this.bot.log(`🧾 Created invoice: ${invoice.invoice_number} - ${invoice.total.toLocaleString()} IQD (${items.length} items)`);
            return invoice;
        } catch (error) {
            this.bot.log(`Could not create invoice: ${error.message}`, 'warn');
            return null;
        }
    }
    
    /**
     * إنشاء مهمة
     * Note: جدول tasks غير موجود في الـ schema الحالي - يتم تخطيها
     */
    async _generateTask() {
        // Skip task generation as table doesn't exist in current schema
        this.bot.log('⏭️ Skipping task generation (table not in schema)');
        return null;
    }
    
    /**
     * إنشاء حركة مخزون
     */
    async _generateInventoryMovement() {
        const product = get(`SELECT id, name, quantity FROM products WHERE quantity > 0 ORDER BY RANDOM() LIMIT 1`);
        if (!product) return null;
        
        const movementTypes = ['in', 'out', 'adjustment', 'transfer'];
        const type = this._random(movementTypes);
        const qty = Math.min(Math.floor(Math.random() * 10) + 1, product.quantity);
        
        const movement = {
            id: generateId(),
            product_id: product.id,
            product_name: product.name,
            type: type,
            quantity: type === 'out' ? -qty : qty,
            reason: 'حركة تجريبية من البوت الذكي',
            created_at: now(),
            created_by: 'bot'
        };
        
        try {
            run(`
                INSERT INTO inventory_movements (id, product_id, type, quantity, reason, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                movement.id, movement.product_id, movement.type,
                movement.quantity, movement.reason, movement.created_at
            ]);
            
            // Update product quantity
            run(`UPDATE products SET quantity = quantity + ? WHERE id = ?`, [movement.quantity, movement.product_id]);
            
            this.bot.logToDB('inventory_movement_generated', { movement_id: movement.id, type: movement.type });
            return movement;
        } catch (error) {
            this.bot.log(`Could not create inventory movement: ${error.message}`, 'warn');
            return null;
        }
    }
    
    /**
     * Helper functions
     */
    _random(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
    
    _generatePhone() {
        const prefix = ['077', '078', '079', '075'];
        return `${this._random(prefix)}${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
    }
    
    _generateInvoiceNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `INV-${year}${month}-${random}`;
    }
    
    _futureDate(maxDays) {
        const date = new Date();
        date.setDate(date.getDate() + Math.floor(Math.random() * maxDays) + 1);
        return date.toISOString();
    }
}

module.exports = DataGenerator;
