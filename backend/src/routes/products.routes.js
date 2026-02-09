/**
 * BI Management - Products API
 * إدارة المنتجات - من قاعدة البيانات
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { auth } = require('../middleware/auth');
const productService = require('../services/product.service');

// Fallback: تحميل من JSON إذا جدول المنتجات غير موجود
let productsData = null;
function loadProductsFromJson() {
  if (!productsData) {
    try {
      const filePath = path.join(__dirname, '../../../data/products-list.json');
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        productsData = JSON.parse(data);
      } else {
        const archivePath = path.join(__dirname, '../../../_archive/data/products-list.json');
        if (fs.existsSync(archivePath)) {
          const data = fs.readFileSync(archivePath, 'utf8');
          productsData = JSON.parse(data);
        }
      }
      if (productsData) console.log(`[Products] JSON fallback: ${productsData.count} products`);
    } catch (e) {
      console.error('[Products] JSON fallback error:', e.message);
    }
    if (!productsData) productsData = { count: 0, products: [] };
  }
  return productsData;
}

const productGroups = productService.PRODUCT_GROUPS;

// الحصول على كل المنتجات
router.get('/', auth, async (req, res) => {
  try {
    if (!productService.ensureProductsTable()) {
      const data = loadProductsFromJson();
      let products = [...(data.products || [])];
      const { search, group_id, page = 1, limit = 50 } = req.query;
      if (search) {
        const term = search.toLowerCase();
        products = products.filter((p) => (p.name || '').toLowerCase().includes(term));
      }
      if (group_id && group_id !== 'all') {
        products = products.filter((p) => p.group_id === parseInt(group_id, 10));
      }
      const limitNum = parseInt(limit, 10) || 50;
      const pageNum = parseInt(page, 10);
      const start = (pageNum - 1) * limitNum;
      const paginated = products.slice(start, start + limitNum);
      const enriched = paginated.map((p) => ({
        ...p,
        group_name: productGroups[p.group_id]?.name || 'عام',
        profit: (p.sale_price || 0) - (p.buy_price || 0),
        profit_percent: p.buy_price ? (((p.sale_price || 0) - p.buy_price) / p.buy_price * 100).toFixed(1) : 0,
      }));
      return res.json({
        success: true,
        data: enriched,
        pagination: { total: products.length, page: pageNum, limit: limitNum, pages: Math.ceil(products.length / limitNum) || 1 },
      });
    }
    const { search, group_id, category_id, page, limit } = req.query;
    const result = productService.list({ search, group_id, category_id, page, limit });
    const enrichedProducts = result.rows.map((p) => ({
      ...p,
      group_id: p.category_id ? parseInt(p.category_id, 10) : 1,
      group_name: p.category_name || productGroups[parseInt(p.category_id, 10)]?.name || 'عام',
      buy_price: p.cost_price,
      sale_price: p.selling_price,
      profit: (p.selling_price || 0) - (p.cost_price || 0),
      profit_percent: p.cost_price ? (((p.selling_price || 0) - p.cost_price) / p.cost_price * 100).toFixed(1) : 0,
    }));
    res.json({
      success: true,
      data: enrichedProducts,
      pagination: { total: result.total, page: result.page, limit: result.limit, pages: result.pages },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// البحث السريع (autocomplete)
router.get('/search', auth, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!productService.ensureProductsTable()) {
      const data = loadProductsFromJson();
      if (!q || q.length < 2) return res.json({ success: true, data: [] });
      const term = (q || '').toLowerCase();
      const results = (data.products || [])
        .filter((p) => (p.name || '').toLowerCase().includes(term))
        .slice(0, parseInt(limit, 10))
        .map((p) => ({ id: p.id, name: p.name, buy_price: p.buy_price, sale_price: p.sale_price, group_id: p.group_id, group_name: productGroups[p.group_id]?.name || 'عام' }));
      return res.json({ success: true, data: results });
    }
    const data = productService.search(q, limit);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// الحصول على منتج واحد
router.get('/meta/groups', auth, async (req, res) => {
  try {
    if (!productService.ensureProductsTable()) {
      const data = loadProductsFromJson();
      const groupCounts = {};
      (data.products || []).forEach((p) => { groupCounts[p.group_id] = (groupCounts[p.group_id] || 0) + 1; });
      const groups = Object.values(productGroups).map((g) => ({ ...g, count: groupCounts[parseInt(g.id, 10)] || 0 }));
      return res.json({ success: true, data: groups });
    }
    const groups = productService.getGroups();
    res.json({ success: true, data: groups });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// إحصائيات المنتجات
router.get('/meta/stats', auth, async (req, res) => {
  try {
    if (!productService.ensureProductsTable()) {
      const data = loadProductsFromJson();
      const products = data.products || [];
      const total = products.length;
      let totalBuy = 0, totalSale = 0;
      const by_group = {};
      products.forEach((p) => {
        by_group[p.group_id] = (by_group[p.group_id] || 0) + 1;
        totalBuy += p.buy_price || 0;
        totalSale += p.sale_price || 0;
      });
      return res.json({
        success: true,
        data: { total, by_group, avg_buy_price: total ? Math.round(totalBuy / total) : 0, avg_sale_price: total ? Math.round(totalSale / total) : 0, total_value: 0 },
      });
    }
    const stats = productService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// الحصول على منتج بالمعرف
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!productService.ensureProductsTable()) {
      const data = loadProductsFromJson();
      const product = (data.products || []).find((p) => p.id === parseInt(id, 10));
      if (!product) return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
      return res.json({ success: true, data: { ...product, group_name: productGroups[product.group_id]?.name || 'عام' } });
    }
    const product = productService.getById(id);
    if (!product) return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// إنشاء منتج
router.post('/', auth, async (req, res) => {
  try {
    if (!productService.ensureProductsTable()) {
      return res.status(503).json({ success: false, message: 'جدول المنتجات غير متوفر. قم بتشغيل تهيئة قاعدة البيانات أولاً.' });
    }
    const created = productService.create({ ...req.body, created_by: req.user?.id });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تحديث منتج
router.put('/:id', auth, async (req, res) => {
  try {
    if (!productService.ensureProductsTable()) {
      return res.status(503).json({ success: false, message: 'جدول المنتجات غير متوفر.' });
    }
    const updated = productService.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// حذف منتج (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!productService.ensureProductsTable()) {
      return res.status(503).json({ success: false, message: 'جدول المنتجات غير متوفر.' });
    }
    const ok = productService.remove(req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// استيراد من JSON (للمسؤول - seed)
router.post('/seed', auth, async (req, res) => {
  try {
    if (!productService.ensureProductsTable()) {
      return res.status(503).json({ success: false, message: 'جدول المنتجات غير متوفر.' });
    }
    const data = loadProductsFromJson();
    const products = data.products || [];
    if (!products.length) return res.json({ success: true, message: 'لا توجد بيانات للاستيراد', imported: 0 });
    const imported = productService.seedFromJson(products);
    res.json({ success: true, message: `تم استيراد ${imported} منتج`, imported });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
