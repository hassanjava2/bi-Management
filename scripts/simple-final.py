# -*- coding: utf-8 -*-
"""
Simple Final Calculation
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

# Jard accounts
jard_accounts = set()
for acc in accounts:
    if 'جرد' in acc.get('Name', ''):
        jard_accounts.add(acc['AccountId'])

# Get bills by type
sale_bills = {}  # BillId -> bill
purchase_bills = {}

for bill in bills:
    op = bill.get('OperationType')
    bill_id = bill.get('BillId')
    acc_id = bill.get('AccountId')
    
    if op == 2 and acc_id not in jard_accounts:  # Real sales
        sale_bills[bill_id] = bill
    elif op == 9:  # Purchases
        purchase_bills[bill_id] = bill

# Count items
items_sold = 0
items_purchased = 0

for bi in bill_items:
    bill_id = bi.get('BillId')
    qty = float(bi.get('Number', 0) or 0)  # Number is quantity
    
    if bill_id in sale_bills:
        items_sold += qty
    elif bill_id in purchase_bills:
        items_purchased += qty

print("="*55)
print("  BI COMPANY - FINAL")
print("="*55)

# Sales
sales = sum(float(b.get('BillAmount1', 0) or 0) for b in bills 
            if b.get('OperationType') == 2 and b.get('AccountId') not in jard_accounts)
sale_returns = sum(float(b.get('BillAmount1', 0) or 0) for b in bills if b.get('OperationType') == 11)
net_sales = sales - sale_returns

# Purchases
purchases = sum(float(b.get('BillAmount1', 0) or 0) for b in bills if b.get('OperationType') == 9)
purchase_returns = sum(float(b.get('BillAmount1', 0) or 0) for b in bills if b.get('OperationType') == 12)
net_purchases = purchases - purchase_returns

# Calculate ratio
if items_purchased > 0:
    sold_ratio = items_sold / items_purchased
    remaining_ratio = 1 - sold_ratio
else:
    sold_ratio = 1
    remaining_ratio = 0

# COGS = purchases * ratio sold
cogs = net_purchases * sold_ratio
inventory_value = net_purchases * remaining_ratio

# Expenses
expense_ids = {38, 81, 82, 1225, 1226, 1308, 2568}
expenses = sum(float(b.get('Amount1', 0) or 0) for b in bonds if b.get('AccountToId') in expense_ids)

# Personal
personal_ids = {1000, 1198, 1627}
personal = sum(float(b.get('Amount1', 0) or 0) for b in bonds if b.get('AccountToId') in personal_ids)

print(f"""
  المبيعات:
    إجمالي:  {sales:>15,.0f}
    راجع:    {sale_returns:>15,.0f}
    صافي:    {net_sales:>15,.0f}

  المشتريات:
    إجمالي:  {purchases:>15,.0f}
    راجع:    {purchase_returns:>15,.0f}
    صافي:    {net_purchases:>15,.0f}

  الكميات:
    مشتريات: {items_purchased:>15,.0f} قطعة
    مبيعات:  {items_sold:>15,.0f} قطعة
    متبقي:   {items_purchased - items_sold:>15,.0f} قطعة ({remaining_ratio*100:.1f}%)
""")

gross_profit = net_sales - cogs
net_profit = gross_profit - expenses

print("="*55)
print("  الحساب الصحيح")
print("="*55)
print(f"""
  صافي المبيعات:          {net_sales:>15,.0f}
  تكلفة المباع ({sold_ratio*100:.0f}%):   {cogs:>15,.0f}
  ─────────────────────────────────────────
  إجمالي الربح:           {gross_profit:>15,.0f}
  المصاريف:               {expenses:>15,.0f}
  ─────────────────────────────────────────
  صافي الربح:             {net_profit:>15,.0f}
  
  ════════════════════════════════════════
  قيمة المخزون المتبقي:   {inventory_value:>15,.0f}
  السحوبات الشخصية:       {personal:>15,.0f}
  ════════════════════════════════════════
""")
