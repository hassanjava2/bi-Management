# -*- coding: utf-8 -*-
"""
Final Correct Profit - Cash boxes are not expenses
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

# Jard accounts to exclude
jard_accounts = set()
for acc in accounts:
    if 'جرد' in acc.get('Name', ''):
        jard_accounts.add(acc['AccountId'])

# Get real sales and purchases bill IDs
sale_bill_ids = set()
purchase_bill_ids = set()

for bill in bills:
    op = bill.get('OperationType')
    bill_id = bill.get('BillId')
    acc_id = bill.get('AccountId')
    
    if op == 2 and acc_id not in jard_accounts:
        sale_bill_ids.add(bill_id)
    elif op == 9:
        purchase_bill_ids.add(bill_id)

# Count quantities
items_sold = 0
items_purchased = 0

for bi in bill_items:
    bill_id = bi.get('BillId')
    qty = float(bi.get('Number', 0) or 0)
    
    if bill_id in sale_bill_ids:
        items_sold += qty
    elif bill_id in purchase_bill_ids:
        items_purchased += qty

# Calculate ratio
sold_ratio = items_sold / items_purchased if items_purchased > 0 else 1

# Sales
sales = sum(float(b.get('BillAmount1', 0) or 0) for b in bills 
            if b.get('OperationType') == 2 and b.get('AccountId') not in jard_accounts)
sale_returns = sum(float(b.get('BillAmount1', 0) or 0) for b in bills if b.get('OperationType') == 11)
net_sales = sales - sale_returns

# Purchases
purchases = sum(float(b.get('BillAmount1', 0) or 0) for b in bills if b.get('OperationType') == 9)
purchase_returns = sum(float(b.get('BillAmount1', 0) or 0) for b in bills if b.get('OperationType') == 12)
net_purchases = purchases - purchase_returns

# COGS based on ratio
cogs = net_purchases * sold_ratio
inventory_value = net_purchases * (1 - sold_ratio)

# REAL expenses only (not cash boxes)
# Cash box keywords to EXCLUDE
cashbox_keywords = ['صندوق', 'قاصة', 'كاش']
expense_keywords = ['مصروف', 'مصاريف', 'ايجار', 'كهرباء', 'رواتب', 'صيانة', 'اتصالات', 'نقل بضائع', 'ضرائب']

# Find real expense accounts
expense_accounts = set()
for acc in accounts:
    name = acc.get('Name', '')
    # Skip if it's a cash box
    is_cashbox = any(kw in name for kw in cashbox_keywords)
    is_expense = any(kw in name for kw in expense_keywords)
    
    if is_expense and not is_cashbox:
        expense_accounts.add(acc['AccountId'])
        print(f"  Expense account: {name}")

# Calculate expenses from bonds
expenses = 0
for bond in bonds:
    acc_to = bond.get('AccountToId', 0)
    if acc_to in expense_accounts:
        expenses += float(bond.get('Amount1', 0) or 0)

# Also check bills for expenses (type 18 or other)
for bill in bills:
    op = bill.get('OperationType')
    if op not in [2, 9, 11, 12]:  # Not regular operations
        acc_id = bill.get('AccountId', 0)
        if acc_id in expense_accounts:
            expenses += float(bill.get('BillAmount1', 0) or 0)

print("\n" + "="*55)
print("  BI COMPANY - FINAL PROFIT")
print("="*55)

gross_profit = net_sales - cogs
net_profit = gross_profit - expenses

print(f"""
  المبيعات:
    إجمالي المبيعات:     {sales:>15,.0f}
    راجع المبيعات:       {sale_returns:>15,.0f}
    صافي المبيعات:       {net_sales:>15,.0f}

  المشتريات:
    إجمالي المشتريات:    {purchases:>15,.0f}
    راجع المشتريات:      {purchase_returns:>15,.0f}
    صافي المشتريات:      {net_purchases:>15,.0f}

  الكميات:
    مشتريات:             {items_purchased:>15,.0f} قطعة
    مبيعات:              {items_sold:>15,.0f} قطعة
    متبقي بالمخزن:       {items_purchased - items_sold:>15,.0f} قطعة
    نسبة المباع:         {sold_ratio*100:>15.1f}%

  المصاريف التجارية:     {expenses:>15,.0f}
""")

print("="*55)
print("  النتيجة النهائية")
print("="*55)
print(f"""
  صافي المبيعات:         {net_sales:>15,.0f}
  تكلفة المباع:          {cogs:>15,.0f}
  ─────────────────────────────────────
  إجمالي الربح:          {gross_profit:>15,.0f}
  المصاريف:              {expenses:>15,.0f}
  ─────────────────────────────────────
  
  ╔═════════════════════════════════════════════╗
  ║  صافي الربح:         {net_profit:>15,.0f}       ║
  ║  قيمة المخزون:       {inventory_value:>15,.0f}       ║
  ╚═════════════════════════════════════════════╝
""")
