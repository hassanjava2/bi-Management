# -*- coding: utf-8 -*-
"""
BI Company - Corrected Financial Analysis
- Exclude: جرد اكسسوارات (1-4) - not real sales
- Keep: جرد شهر 12-2025, جرد - real sales
- Exclude personal expenses: حسن الشريفي, مصاريف السوناتا
"""
import json
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Load data
with open(r'D:\bi Management\data\morabaa-export\Bills.json', 'r', encoding='utf-8') as f:
    bills = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\accounts.json', 'r', encoding='utf-8') as f:
    accounts = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\Bonds.json', 'r', encoding='utf-8') as f:
    bonds = json.load(f)['data']

acc_lookup = {a['AccountId']: a.get('Name', '') for a in accounts}

print("="*70)
print("  BI COMPANY - CORRECTED FINANCIAL ANALYSIS")
print("="*70)

# Identify accounts to exclude
accessories_accounts = set()  # جرد اكسسوارات - to exclude
real_inventory_accounts = set()  # جرد, جرد شهر 12 - to keep as real sales
personal_expense_accounts = set()  # مصاريف شخصية

for acc in accounts:
    name = acc.get('Name', '')
    acc_id = acc['AccountId']
    
    if 'جرد اكسسوارات' in name:
        accessories_accounts.add(acc_id)
        print(f"  [EXCLUDE - Accessories] {name}")
    elif 'جرد' in name:
        real_inventory_accounts.add(acc_id)
        print(f"  [KEEP - Real Sales] {name}")
    
    if 'حسن الشريفي' in name or 'السوناتا' in name or 'سوناتا' in name:
        personal_expense_accounts.add(acc_id)
        print(f"  [PERSONAL EXPENSE] {name}")

# Calculate accessories total (to be excluded)
accessories_total = 0
for bill in bills:
    if bill.get('OperationType') == 2:  # Sales
        acc_id = bill.get('AccountId', 0)
        if acc_id in accessories_accounts:
            accessories_total += float(bill.get('BillAmount1', 0) or 0)

print(f"\n  Accessories Inventory to Exclude: {accessories_total:,.0f} IQD")

# Analyze sales
real_sales_total = 0
real_sales_count = 0
inventory_sales_total = 0  # جرد شهر 12 - real wholesale
inventory_sales_count = 0

for bill in bills:
    if bill.get('OperationType') == 2:  # Sales
        acc_id = bill.get('AccountId', 0)
        amount = float(bill.get('BillAmount1', 0) or 0)
        
        if acc_id in accessories_accounts:
            continue  # Skip accessories
        elif acc_id in real_inventory_accounts:
            inventory_sales_total += amount
            inventory_sales_count += 1
        else:
            real_sales_total += amount
            real_sales_count += 1

# Purchases
total_purchases = 0
purchase_count = 0
for bill in bills:
    if bill.get('OperationType') == 9:
        total_purchases += float(bill.get('BillAmount1', 0) or 0)
        purchase_count += 1

# Returns
sale_returns = sum(float(b.get('BillAmount1', 0) or 0) for b in bills if b.get('OperationType') == 11)
purchase_returns = sum(float(b.get('BillAmount1', 0) or 0) for b in bills if b.get('OperationType') == 12)

# Find personal expenses in bonds/movements
personal_expenses = 0
for bond in bonds:
    notes = str(bond.get('Note', '') or '')
    if 'حسن الشريفي' in notes or 'السوناتا' in notes or 'سوناتا' in notes:
        personal_expenses += float(bond.get('Amount', 0) or 0)

print("\n" + "="*70)
print("  CORRECTED SALES BREAKDOWN")
print("="*70)

print(f"""
  Regular Sales (Retail/Wholesale):
    - Bills: {real_sales_count:,}
    - Amount: {real_sales_total:,.0f} IQD
    
  Inventory Sales (جرد شهر 12-2025, etc):
    - Bills: {inventory_sales_count:,}
    - Amount: {inventory_sales_total:,.0f} IQD
    
  TOTAL REAL SALES: {real_sales_total + inventory_sales_total:,.0f} IQD
  
  Excluded (Accessories - to delete):
    - Amount: {accessories_total:,.0f} IQD
""")

print("="*70)
print("  CORRECTED PROFIT CALCULATION")
print("="*70)

total_sales = real_sales_total + inventory_sales_total
net_sales = total_sales - sale_returns
net_purchases = total_purchases - purchase_returns
gross_profit = net_sales - net_purchases

print(f"""
  Total Sales: {total_sales:,.0f} IQD
  - Sale Returns: {sale_returns:,.0f} IQD
  = Net Sales: {net_sales:,.0f} IQD
  
  Total Purchases: {total_purchases:,.0f} IQD
  - Purchase Returns: {purchase_returns:,.0f} IQD
  = Net Purchases: {net_purchases:,.0f} IQD
  
  ════════════════════════════════════════
  GROSS PROFIT: {gross_profit:,.0f} IQD
  Gross Margin: {(gross_profit/net_sales*100) if net_sales > 0 else 0:.1f}%
  ════════════════════════════════════════
""")

if personal_expenses > 0:
    print(f"  Personal Expenses Found (Hassan Al-Sharifi/Sonata): {personal_expenses:,.0f} IQD")
    print(f"  Business Profit (after removing personal): {gross_profit + personal_expenses:,.0f} IQD")

# Receivables/Payables
receivables = 0
payables = 0

for bill in bills:
    acc_id = bill.get('AccountId', 0)
    remain = float(bill.get('Remain1', 0) or 0)
    op = bill.get('OperationType')
    
    if acc_id in accessories_accounts:
        continue
    
    if op == 2:  # Sales - receivable
        receivables += remain
    elif op == 9:  # Purchase - payable
        payables += remain

print("="*70)
print("  RECEIVABLES & PAYABLES (Corrected)")
print("="*70)

print(f"""
  Receivables (Debtors owe us): {receivables:,.0f} IQD
  Payables (We owe suppliers): {payables:,.0f} IQD
  
  Net Position: {receivables - payables:,.0f} IQD
""")

print("="*70)
print("  SUMMARY")
print("="*70)

print(f"""
  ╔══════════════════════════════════════════════════════════════╗
  ║  GROSS PROFIT:           {gross_profit:>20,.0f} IQD      ║
  ║  GROSS MARGIN:           {(gross_profit/net_sales*100) if net_sales > 0 else 0:>20.1f}%         ║
  ║  RECEIVABLES:            {receivables:>20,.0f} IQD      ║
  ║  PAYABLES:               {payables:>20,.0f} IQD      ║
  ╚══════════════════════════════════════════════════════════════╝
""")
