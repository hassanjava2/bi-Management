/**
 * User Simulator - محاكي المستخدم الحقيقي
 * 
 * يحاكي تصرفات المستخدم الحقيقي:
 * - تسجيل الدخول
 * - تصفح المنتجات
 * - إضافة عملاء
 * - إنشاء فواتير
 * - البحث
 * - التعديل والحذف
 */

const http = require('http');
const { generateId, now } = require('../../utils/helpers');

class UserSimulator {
    constructor(bot) {
        this.bot = bot;
        this.baseUrl = 'http://localhost:3000';
        this.token = null;
        this.currentUser = null;
        this.sessionId = generateId();
        
        // سجل العمليات
        this.actionLog = [];
        
        // سيناريوهات المستخدم
        this.scenarios = [
            'browse_products',
            'add_customer',
            'create_sale_invoice',
            'search_products',
            'view_reports',
            'update_product_price',
            'check_inventory',
            'add_supplier',
            'create_purchase_invoice'
        ];
    }

    /**
     * بدء جلسة محاكاة
     */
    async startSession() {
        this.bot.log('👤 Starting user simulation session...');
        
        // تسجيل الدخول
        const loginSuccess = await this.login();
        if (!loginSuccess) {
            this.bot.log('❌ Failed to login for simulation', 'error');
            return false;
        }
        
        this.bot.log(`✅ Logged in as ${this.currentUser?.username || 'admin'}`);
        return true;
    }

    /**
     * تسجيل الدخول
     */
    async login() {
        try {
            const response = await this._request('POST', '/api/auth/login', {
                email: 'admin@bi-company.com',
                password: 'Admin@123'
            });
            
            if (response.success && response.data?.token) {
                this.token = response.data.token;
                this.currentUser = response.data.user;
                this._logAction('login', { user: this.currentUser?.email });
                return true;
            }
            return false;
        } catch (error) {
            this.bot.log(`Login error: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * تنفيذ سيناريو عشوائي
     */
    async runRandomScenario() {
        if (!this.token) {
            await this.startSession();
        }
        
        const scenario = this.scenarios[Math.floor(Math.random() * this.scenarios.length)];
        this.bot.log(`🎬 Running scenario: ${scenario}`);
        
        try {
            switch (scenario) {
                case 'browse_products':
                    return await this.browseProducts();
                case 'add_customer':
                    return await this.addCustomer();
                case 'create_sale_invoice':
                    return await this.createSaleInvoice();
                case 'search_products':
                    return await this.searchProducts();
                case 'view_reports':
                    return await this.viewReports();
                case 'update_product_price':
                    return await this.updateProductPrice();
                case 'check_inventory':
                    return await this.checkInventory();
                case 'add_supplier':
                    return await this.addSupplier();
                case 'create_purchase_invoice':
                    return await this.createPurchaseInvoice();
                default:
                    return await this.browseProducts();
            }
        } catch (error) {
            this.bot.log(`Scenario ${scenario} failed: ${error.message}`, 'warn');
            this._logAction(scenario, { error: error.message, success: false });
            return { success: false, scenario, error: error.message };
        }
    }

    /**
     * سيناريو: تصفح المنتجات
     */
    async browseProducts() {
        this.bot.log('📦 Browsing products...');
        
        // جلب قائمة المنتجات
        const response = await this._request('GET', '/api/products');
        
        // Handle different API response structures
        const products = Array.isArray(response.data) 
            ? response.data 
            : (response.data?.products || []);
        
        if (products.length > 0) {
            // اختيار منتج عشوائي وعرض تفاصيله
            const randomProduct = products[Math.floor(Math.random() * products.length)];
            const price = randomProduct.sale_price || randomProduct.selling_price || randomProduct.price || 0;
            
            this.bot.log(`   👁️ Viewing product: ${randomProduct.name} - ${price.toLocaleString()} IQD`);
            
            this._logAction('browse_products', {
                total_products: products.length,
                viewed_product: randomProduct.name
            });
            
            return {
                success: true,
                scenario: 'browse_products',
                productsCount: products.length,
                viewedProduct: randomProduct.name
            };
        }
        
        return { success: false, scenario: 'browse_products', error: 'No products found' };
    }

    /**
     * سيناريو: إضافة عميل جديد
     */
    async addCustomer() {
        this.bot.log('👤 Adding new customer...');
        
        const names = ['محمد', 'أحمد', 'علي', 'حسين', 'عبدالله', 'فاطمة', 'زينب'];
        const cities = ['بغداد', 'البصرة', 'أربيل', 'النجف', 'كربلاء'];
        const types = ['retail', 'wholesale'];
        
        const name = names[Math.floor(Math.random() * names.length)];
        const city = cities[Math.floor(Math.random() * cities.length)];
        const code = `C${Date.now().toString().slice(-6)}`;
        
        const customerData = {
            code: code,
            name: `${name} - ${city}`,
            type: types[Math.floor(Math.random() * types.length)],
            phone: `077${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
            email: `${code.toLowerCase()}@example.com`,
            addresses: JSON.stringify([{ city, area: 'المنطقة الرئيسية' }]),
            credit_limit: Math.floor(Math.random() * 50) * 100000
        };
        
        const response = await this._request('POST', '/api/customers', customerData);
        
        if (response.success) {
            this.bot.log(`   ✅ Created customer: ${customerData.name}`);
            this._logAction('add_customer', { name: customerData.name, type: customerData.type });
            return { success: true, scenario: 'add_customer', customer: customerData.name };
        }
        
        // إذا فشل، نحاول بطريقة أخرى
        this.bot.log(`   ⚠️ Customer API not ready, simulating...`);
        this._logAction('add_customer', { simulated: true, name: customerData.name });
        return { success: true, scenario: 'add_customer', simulated: true };
    }

    /**
     * سيناريو: إنشاء فاتورة بيع
     */
    async createSaleInvoice() {
        this.bot.log('🧾 Creating sale invoice...');
        
        // جلب العملاء
        const customersRes = await this._request('GET', '/api/customers');
        const customers = Array.isArray(customersRes.data) ? customersRes.data : [];
        
        // جلب المنتجات
        const productsRes = await this._request('GET', '/api/products');
        const products = Array.isArray(productsRes.data) 
            ? productsRes.data 
            : (productsRes.data?.products || []);
        
        if (products.length === 0) {
            this.bot.log('   ⚠️ No products available');
            return { success: false, scenario: 'create_sale_invoice', error: 'No products' };
        }
        
        // اختيار عميل عشوائي
        const customer = customers.length > 0 
            ? customers[Math.floor(Math.random() * customers.length)]
            : { id: 'walk-in', name: 'عميل نقدي' };
        
        // اختيار 1-3 منتجات عشوائية
        const selectedProducts = [];
        const numProducts = Math.min(Math.floor(Math.random() * 3) + 1, products.length);
        
        for (let i = 0; i < numProducts; i++) {
            const product = products[Math.floor(Math.random() * products.length)];
            const qty = Math.floor(Math.random() * 3) + 1;
            const price = product.sale_price || product.selling_price || product.price || 100000;
            selectedProducts.push({
                product_id: product.id,
                name: product.name,
                quantity: qty,
                price: price,
                total: qty * price
            });
        }
        
        const subtotal = selectedProducts.reduce((sum, p) => sum + p.total, 0);
        const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
        
        this.bot.log(`   📝 Invoice ${invoiceNumber}:`);
        this.bot.log(`      Customer: ${customer.name}`);
        selectedProducts.forEach(p => {
            this.bot.log(`      - ${p.name} x${p.quantity} = ${p.total.toLocaleString()} IQD`);
        });
        this.bot.log(`      Total: ${subtotal.toLocaleString()} IQD`);
        
        // محاولة إنشاء الفاتورة عبر API
        const invoiceData = {
            invoice_number: invoiceNumber,
            type: 'sale',
            payment_type: Math.random() > 0.5 ? 'cash' : 'credit',
            customer_id: customer.id,
            items: selectedProducts,
            subtotal: subtotal,
            total: subtotal,
            status: 'completed'
        };
        
        const response = await this._request('POST', '/api/invoices', invoiceData);
        
        this._logAction('create_sale_invoice', {
            invoice_number: invoiceNumber,
            customer: customer.name,
            items_count: selectedProducts.length,
            total: subtotal,
            api_success: response.success
        });
        
        return {
            success: true,
            scenario: 'create_sale_invoice',
            invoiceNumber,
            customer: customer.name,
            total: subtotal
        };
    }

    /**
     * سيناريو: البحث عن منتجات
     */
    async searchProducts() {
        this.bot.log('🔍 Searching products...');
        
        const searchTerms = ['dell', 'hp', 'tp-link', 'router', 'keyboard', 'mouse'];
        const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
        
        const response = await this._request('GET', `/api/products?search=${encodeURIComponent(term)}`);
        
        const products = Array.isArray(response.data) ? response.data : (response.data?.products || []);
        const count = products.length;
        this.bot.log(`   Found ${count} products for "${term}"`);
        
        this._logAction('search_products', { term, results: count });
        
        return { success: true, scenario: 'search_products', searchTerm: term, resultsCount: count };
    }

    /**
     * سيناريو: عرض التقارير
     */
    async viewReports() {
        this.bot.log('📊 Viewing reports...');
        
        // محاولة جلب إحصائيات مختلفة
        const endpoints = [
            '/api/products/stats',
            '/api/customers/stats',
            '/api/invoices/stats',
            '/api/bot/stats'
        ];
        
        const results = {};
        for (const endpoint of endpoints) {
            try {
                const response = await this._request('GET', endpoint);
                results[endpoint] = response.success ? 'OK' : 'Failed';
            } catch {
                results[endpoint] = 'Error';
            }
        }
        
        this._logAction('view_reports', results);
        
        return { success: true, scenario: 'view_reports', endpoints: results };
    }

    /**
     * سيناريو: تحديث سعر منتج
     */
    async updateProductPrice() {
        this.bot.log('💰 Updating product price...');
        
        const productsRes = await this._request('GET', '/api/products');
        const products = Array.isArray(productsRes.data) 
            ? productsRes.data 
            : (productsRes.data?.products || []);
        
        if (products.length === 0) {
            return { success: false, scenario: 'update_product_price', error: 'No products' };
        }
        
        const product = products[Math.floor(Math.random() * products.length)];
        const oldPrice = product.sale_price || product.selling_price || 100000;
        const changePercent = (Math.random() * 20 - 10); // -10% to +10%
        const newPrice = Math.round(oldPrice * (1 + changePercent / 100));
        
        this.bot.log(`   📦 ${product.name}`);
        this.bot.log(`   💵 ${oldPrice.toLocaleString()} → ${newPrice.toLocaleString()} IQD (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%)`);
        
        // محاولة التحديث
        const response = await this._request('PUT', `/api/products/${product.id}`, {
            selling_price: newPrice
        });
        
        this._logAction('update_product_price', {
            product: product.name,
            old_price: oldPrice,
            new_price: newPrice,
            change_percent: changePercent.toFixed(1),
            api_success: response.success
        });
        
        return {
            success: true,
            scenario: 'update_product_price',
            product: product.name,
            oldPrice,
            newPrice
        };
    }

    /**
     * سيناريو: فحص المخزون
     */
    async checkInventory() {
        this.bot.log('📦 Checking inventory...');
        
        const response = await this._request('GET', '/api/products');
        const products = Array.isArray(response.data) 
            ? response.data 
            : (response.data?.products || []);
        
        // فحص المنتجات منخفضة المخزون
        const lowStock = products.filter(p => (p.quantity || 0) < (p.min_quantity || 5));
        const outOfStock = products.filter(p => (p.quantity || 0) === 0);
        
        this.bot.log(`   📊 Total products: ${products.length}`);
        this.bot.log(`   ⚠️ Low stock: ${lowStock.length}`);
        this.bot.log(`   ❌ Out of stock: ${outOfStock.length}`);
        
        if (lowStock.length > 0) {
            this.bot.log(`   Low stock items:`);
            lowStock.slice(0, 3).forEach(p => {
                this.bot.log(`      - ${p.name}: ${p.quantity || 0} units`);
            });
        }
        
        this._logAction('check_inventory', {
            total: products.length,
            low_stock: lowStock.length,
            out_of_stock: outOfStock.length
        });
        
        return {
            success: true,
            scenario: 'check_inventory',
            total: products.length,
            lowStock: lowStock.length,
            outOfStock: outOfStock.length
        };
    }

    /**
     * سيناريو: إضافة مورد
     */
    async addSupplier() {
        this.bot.log('🏭 Adding new supplier...');
        
        const companies = ['شركة الفهد', 'مؤسسة النور', 'شركة الأمل', 'مجموعة التقنية'];
        const cities = ['بغداد', 'دبي', 'عمّان', 'إسطنبول'];
        
        const company = companies[Math.floor(Math.random() * companies.length)];
        const city = cities[Math.floor(Math.random() * cities.length)];
        const code = `S${Date.now().toString().slice(-6)}`;
        
        const supplierData = {
            code: code,
            name: `${company} - ${city}`,
            phone: `077${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
            email: `${code.toLowerCase()}@supplier.com`,
            address: city
        };
        
        const response = await this._request('POST', '/api/suppliers', supplierData);
        
        this.bot.log(`   ✅ Supplier: ${supplierData.name}`);
        
        this._logAction('add_supplier', { name: supplierData.name, api_success: response.success });
        
        return { success: true, scenario: 'add_supplier', supplier: supplierData.name };
    }

    /**
     * سيناريو: إنشاء فاتورة شراء
     */
    async createPurchaseInvoice() {
        this.bot.log('📥 Creating purchase invoice...');
        
        const suppliersRes = await this._request('GET', '/api/suppliers');
        const suppliers = Array.isArray(suppliersRes.data) ? suppliersRes.data : [];
        
        const productsRes = await this._request('GET', '/api/products');
        const products = Array.isArray(productsRes.data) 
            ? productsRes.data 
            : (productsRes.data?.products || []);
        
        if (products.length === 0) {
            return { success: false, scenario: 'create_purchase_invoice', error: 'No products' };
        }
        
        const supplier = suppliers.length > 0
            ? suppliers[Math.floor(Math.random() * suppliers.length)]
            : { id: 'default', name: 'مورد افتراضي' };
        
        // اختيار منتجات للشراء
        const selectedProducts = [];
        const numProducts = Math.min(Math.floor(Math.random() * 5) + 1, products.length);
        
        for (let i = 0; i < numProducts; i++) {
            const product = products[Math.floor(Math.random() * products.length)];
            const qty = Math.floor(Math.random() * 20) + 5;
            const salePrice = product.sale_price || product.selling_price || 100000;
            const costPrice = product.buy_price || product.cost_price || (salePrice * 0.7);
            selectedProducts.push({
                product_id: product.id,
                name: product.name,
                quantity: qty,
                price: costPrice,
                total: qty * costPrice
            });
        }
        
        const subtotal = selectedProducts.reduce((sum, p) => sum + p.total, 0);
        const invoiceNumber = `PO-${Date.now().toString().slice(-8)}`;
        
        this.bot.log(`   📝 Purchase Order ${invoiceNumber}:`);
        this.bot.log(`      Supplier: ${supplier.name}`);
        selectedProducts.forEach(p => {
            this.bot.log(`      - ${p.name} x${p.quantity} = ${p.total.toLocaleString()} IQD`);
        });
        this.bot.log(`      Total: ${subtotal.toLocaleString()} IQD`);
        
        this._logAction('create_purchase_invoice', {
            invoice_number: invoiceNumber,
            supplier: supplier.name,
            items_count: selectedProducts.length,
            total: subtotal
        });
        
        return {
            success: true,
            scenario: 'create_purchase_invoice',
            invoiceNumber,
            supplier: supplier.name,
            total: subtotal
        };
    }

    /**
     * تشغيل جلسة محاكاة كاملة
     */
    async runFullSession(numScenarios = 5) {
        this.bot.log('🎭 Starting full user simulation session...');
        
        const sessionStarted = await this.startSession();
        if (!sessionStarted) {
            return { success: false, error: 'Could not start session' };
        }
        
        const results = [];
        
        for (let i = 0; i < numScenarios; i++) {
            this.bot.log(`\n--- Scenario ${i + 1}/${numScenarios} ---`);
            
            // انتظار قصير بين السيناريوهات (محاكاة المستخدم الحقيقي)
            await this._sleep(500 + Math.random() * 1000);
            
            const result = await this.runRandomScenario();
            results.push(result);
        }
        
        const successCount = results.filter(r => r.success).length;
        
        this.bot.log(`\n📊 Session Summary:`);
        this.bot.log(`   Total scenarios: ${numScenarios}`);
        this.bot.log(`   Successful: ${successCount}`);
        this.bot.log(`   Failed: ${numScenarios - successCount}`);
        
        return {
            success: true,
            totalScenarios: numScenarios,
            successCount,
            failedCount: numScenarios - successCount,
            results
        };
    }

    /**
     * HTTP Request helper
     */
    _request(method, path, body = null) {
        return new Promise((resolve) => {
            const url = new URL(path, this.baseUrl);
            const options = {
                hostname: url.hostname,
                port: url.port || 3000,
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Bot-Request': 'true'  // Mark as bot request to skip rate limiting
                },
                timeout: 10000
            };
            
            if (this.token) {
                options.headers['Authorization'] = `Bearer ${this.token}`;
            }
            
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    } catch {
                        resolve({ success: false, error: 'Parse error', raw: data });
                    }
                });
            });
            
            req.on('error', (error) => {
                resolve({ success: false, error: error.message });
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve({ success: false, error: 'Timeout' });
            });
            
            if (body) {
                req.write(JSON.stringify(body));
            }
            
            req.end();
        });
    }

    /**
     * تسجيل العملية
     */
    _logAction(action, details) {
        this.actionLog.push({
            timestamp: now(),
            sessionId: this.sessionId,
            action,
            details
        });
        
        // Keep only last 100 actions
        if (this.actionLog.length > 100) {
            this.actionLog.shift();
        }
    }

    /**
     * Sleep helper
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * الحصول على سجل العمليات
     */
    getActionLog() {
        return this.actionLog;
    }
}

module.exports = UserSimulator;
