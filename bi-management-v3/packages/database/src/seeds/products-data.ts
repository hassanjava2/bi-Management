/**
 * بيانات المنتجات - 793 منتج
 * يتم تحميلها من ملف JSON
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { GROUP_TO_CATEGORY } from "./categories-data.js";

interface RawProduct {
  id: number;
  name: string;
  buy_price: number;
  sale_price: number;
  group_id: number;
}

interface ProductsFile {
  count: number;
  products: RawProduct[];
}

// تحويل المنتج القديم للصيغة الجديدة
function transformProduct(raw: RawProduct) {
  return {
    id: `prod_${raw.id}`,
    code: `PRD-${String(raw.id).padStart(4, "0")}`,
    name: raw.name,
    nameAr: raw.name,
    costPrice: raw.buy_price,
    sellingPrice: raw.sale_price,
    categoryId: GROUP_TO_CATEGORY[raw.group_id] || "cat_1",
    quantity: 0,
    minQuantity: 1,
    unit: "piece",
    isActive: 1,
    warrantyMonths: 0,
  };
}

// تحميل المنتجات من ملف JSON
export function loadProducts() {
  try {
    // المسار النسبي من مجلد database
    const dataPath = resolve(process.cwd(), "../../../data/products-list.json");
    const rawData = readFileSync(dataPath, "utf-8");
    const data: ProductsFile = JSON.parse(rawData);
    return data.products.map(transformProduct);
  } catch (err) {
    console.warn("⚠️ Could not load products from JSON, using sample data");
    return getSampleProducts();
  }
}

// بيانات عينة في حال فشل تحميل الملف
function getSampleProducts() {
  return [
    {
      id: "prod_1",
      code: "PRD-0001",
      name: "dell latitude 5400 i5 8th -8-256 14.1",
      nameAr: "dell latitude 5400 i5 8th -8-256 14.1",
      costPrice: 210000,
      sellingPrice: 289000,
      categoryId: "cat_2",
      quantity: 0,
      minQuantity: 1,
      unit: "piece",
      isActive: 1,
      warrantyMonths: 0,
    },
    {
      id: "prod_2",
      code: "PRD-0002",
      name: "dell latitude 5400 i5 8th -16-256 14.1 touch",
      nameAr: "dell latitude 5400 i5 8th -16-256 14.1 touch",
      costPrice: 226000,
      sellingPrice: 329000,
      categoryId: "cat_2",
      quantity: 0,
      minQuantity: 1,
      unit: "piece",
      isActive: 1,
      warrantyMonths: 0,
    },
    {
      id: "prod_7",
      code: "PRD-0007",
      name: "تفعيل اوفس 2024 برو بلص",
      nameAr: "تفعيل اوفس 2024 برو بلص",
      costPrice: 30208,
      sellingPrice: 49750,
      categoryId: "cat_3",
      quantity: 0,
      minQuantity: 1,
      unit: "piece",
      isActive: 1,
      warrantyMonths: 0,
    },
    {
      id: "prod_8",
      code: "PRD-0008",
      name: "تفعيل وندوز 10 برو",
      nameAr: "تفعيل وندوز 10 برو",
      costPrice: 2900,
      sellingPrice: 9750,
      categoryId: "cat_3",
      quantity: 0,
      minQuantity: 1,
      unit: "piece",
      isActive: 1,
      warrantyMonths: 0,
    },
    {
      id: "prod_9",
      code: "PRD-0009",
      name: "تفعيل وندوز 11 برو",
      nameAr: "تفعيل وندوز 11 برو",
      costPrice: 2469,
      sellingPrice: 9750,
      categoryId: "cat_3",
      quantity: 0,
      minQuantity: 1,
      unit: "piece",
      isActive: 1,
      warrantyMonths: 0,
    },
  ];
}

export const PRODUCTS = loadProducts();
