# -*- coding: utf-8 -*-
"""
Final Simple Calculation
Based on actual invoice data
"""
import json
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

with open(r'D:\bi Management\data\morabaa-export\Bills.json', 'r', encoding='utf-8') as f:
    bills = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\accounts.json', 'r', encoding='utf-8') as f:
    accounts = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\Bonds.json', 'r', encoding='utf-8') as f:
    bonds = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\BillItems.json', 'r', encoding='utf-8') as f:
    bill_items = json.load(f)['data']

acc_lookup = {a['AccountId']: a.get('Name', '') for a in accounts}

# Jard accounts
jard_accounts = set()
for acc in accounts:
    if 'جرد' in acc.get('Name', ''):
        jard_accounts.add(acc['AccountId'])

print("="*60)
print("  BI COMPANY - FINAL CALCULATION")  
print("="*60)

# 1. SALES (excluding jard)
sales_total = 0
sales_count = 0
for bill in bills:
    if bill.get('OperationType') == 2:
        if bill.get('AccountId') not in jard_accounts:
            sales_total += float(bill.get('BillAmount1', 0) or 0)
            sales_count += 1

# Sale returns
sale_returns = sum(float(b.get('BillAmount1', 0) or 0) for b in bills if b.get('OperationType') == 11)

print(f"\n  المبيعات:")
print(f"    عدد الفواتير: {sales_count}")
print(f"    إجمالي: {sales_total:,.0f}")
print(f"    راجع: {sale_returns:,.0f}")
print(f"    صافي: {sales_total - sale_returns:,.0f}")

# 2. PURCHASES  
purchases_total = 0
purchases_count = 0
for bill in bills:
    if bill.get('OperationType') == 9:
        purchases_total += float(bill.get('BillAmount1', 0) or 0)
        purchases_count += 1

# Purchase returns
purchase_returns = sum(float(b.get('BillAmount1', 0) or 0) for b in bills if b.get('OperationType') == 12)

print(f"\n  المشتريات:")
print(f"    عدد الفواتير: {purchases_count}")
print(f"    إجمالي: {purchases_total:,.0f}")
print(f"    راجع: {purchase_returns:,.0f}")
print(f"    صافي: {purchases_total - purchase_returns:,.0f}")

# 3. Calculate average items sold vs purchased to estimate inventory
# Get bill types
sale_bill_ids = set(b.get('BillId') for b in bills if b.get('OperationType') == 2 and b.get('AccountId') not in jard_accounts)
purchase_bill_ids = set(b.get('BillId') for b in bills if b.get('OperationType') == 9)

items_sold_qty = 0
items_purchased_qty = 0

for bi in bill_items:
    qty = float(bi.get('Quantity', 0) or 0)
    bill_id = bi.get('BillId')
    if bill_id in sale_bill_ids:
        items_sold_qty += qty
    elif bill_id in purchase_bill_ids:
        items_purchased_qty += qty

print(f"\n  الكميات:")
print(f"    كمية المشتريات: {items_purchased_qty:,.0f}")
print(f"    كمية المبيعات: {items_sold_qty:,.0f}")
print(f"    الفرق (مخزون تقريبي): {items_purchased_qty - items_sold_qty:,.0f}")

# Estimate what percentage was sold
if items_purchased_qty > 0:
    sold_ratio = items_sold_qty / items_purchased_qty
    print(f"    نسبة المباع: {sold_ratio * 100:.1f}%")

# 4. EXPENSES (business only)
expense_ids = {38, 81, 82, 1225, 1226, 1308, 2568}
business_expenses = 0
for bond in bonds:
    acc_to = bond.get('AccountToId', 0)
    amount1 = float(bond.get('Amount1', 0) or 0)
    if acc_to in expense_ids:
        business_expenses += amount1

print(f"\n  المصاريف التجارية: {business_expenses:,.0f}")

# 5. PERSONAL WITHDRAWALS
personal_ids = {1000, 1198, 1627}
personal = 0
for bond in bonds:
    acc_to = bond.get('AccountToId', 0)
    amount1 = float(bond.get('Amount1', 0) or 0)
    if acc_to in personal_ids:
        personal += amount1

print(f"  السحوبات الشخصية: {personal:,.0f}")

# FINAL CALCULATION
print("\n" + "="*60)
print("  النتيجة")
print("="*60)

net_sales = sales_total - sale_returns
net_purchases = purchases_total - purchase_returns

# Estimate COGS based on sold ratio
if items_purchased_qty > 0:
    estimated_cogs = net_purchases * sold_ratio
else:
    estimated_cogs = net_purchases  # Assume all sold

# Or calculate simply
gross_profit_simple = net_sales - net_purchases
gross_profit_estimated = net_sales - estimated_cogs

print(f"""
  طريقة 1 (كل المشتريات كمصروف):
  ─────────────────────────────────
  صافي المبيعات:    {net_sales:>15,.0f}
  صافي المشتريات:   {net_purchases:>15,.0f}
  ─────────────────────────────────
  الربح الإجمالي:   {gross_profit_simple:>15,.0f}
  المصاريف:         {business_expenses:>15,.0f}
  ─────────────────────────────────
  صافي الربح:       {gross_profit_simple - business_expenses:>15,.0f}
""")

print(f"""
  طريقة 2 (تكلفة المباع فقط - {sold_ratio*100:.0f}%):
  ─────────────────────────────────
  صافي المبيعات:    {net_sales:>15,.0f}
  تكلفة المباع:     {estimated_cogs:>15,.0f}
  ─────────────────────────────────
  الربح الإجمالي:   {gross_profit_estimated:>15,.0f}
  المصاريف:         {business_expenses:>15,.0f}
  ─────────────────────────────────
  صافي الربح:       {gross_profit_estimated - business_expenses:>15,.0f}
  
  (المخزون المتبقي قيمته تقريباً: {net_purchases - estimated_cogs:,.0f})
""")
