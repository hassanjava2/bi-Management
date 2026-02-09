# -*- coding: utf-8 -*-
"""
Corrected Analysis - No double counting
"""
import json
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

with open(r'D:\bi Management\data\morabaa-export\Bonds.json', 'r', encoding='utf-8') as f:
    bonds = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\accounts.json', 'r', encoding='utf-8') as f:
    accounts = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\Bills.json', 'r', encoding='utf-8') as f:
    bills = json.load(f)['data']

acc_lookup = {a['AccountId']: a.get('Name', '') for a in accounts}

# Check bonds structure - avoid double counting
print("="*60)
print("  CHECKING PERSONAL ACCOUNT TRANSACTIONS")
print("="*60)

# Personal account IDs
personal_ids = {1000, 1198, 1627}  # صندوق حسن الشريفي, حسن الشريفي, سوناتا

# Check unique transactions
personal_total = 0
seen_transactions = set()

for bond in bonds:
    acc_from = bond.get('AccountFromId', 0)
    acc_to = bond.get('AccountToId', 0)
    amount1 = float(bond.get('Amount1', 0) or 0)
    date = str(bond.get('Date', ''))
    bond_id = bond.get('Id', 0)
    
    # Only count once - either FROM or TO, not both
    if acc_to in personal_ids and amount1 > 0:
        # Money going TO personal account = withdrawal
        if bond_id not in seen_transactions:
            personal_total += amount1
            seen_transactions.add(bond_id)
            if amount1 > 10000000:  # Show large transactions
                acc_name = acc_lookup.get(acc_to, '')
                print(f"  {date[:10]} | TO {acc_name[:25]:<27} | {amount1:>12,.0f}")

print(f"\nTotal Personal Withdrawals: {personal_total:,.0f} IQD")
print(f"Number of transactions: {len(seen_transactions)}")

# Now let's look at what was actually SOLD vs what's in stock
print("\n" + "="*60)
print("  COST OF GOODS SOLD (not total purchases)")
print("="*60)

# Load BillItems to calculate actual items sold
with open(r'D:\bi Management\data\morabaa-export\BillItems.json', 'r', encoding='utf-8') as f:
    bill_items = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\Items.json', 'r', encoding='utf-8') as f:
    items = json.load(f)['data']

item_lookup = {i['Id']: i for i in items}

# Find jard accounts
jard_accounts = set()
for acc in accounts:
    if 'جرد' in acc.get('Name', ''):
        jard_accounts.add(acc['AccountId'])

# Get bill IDs for real sales (not jard)
real_sale_bill_ids = set()
for bill in bills:
    if bill.get('OperationType') == 2:  # Sale
        if bill.get('AccountId') not in jard_accounts:
            real_sale_bill_ids.add(bill.get('BillId'))

# Calculate cost of goods sold
cost_of_goods_sold = 0
items_sold_count = 0

for bi in bill_items:
    if bi.get('BillId') in real_sale_bill_ids:
        item_id = bi.get('ItemId')
        qty = float(bi.get('Quantity', 0) or 0)
        
        if item_id in item_lookup:
            buy_price = float(item_lookup[item_id].get('BuyPrice', 0) or 0)
            cost_of_goods_sold += buy_price * qty
            items_sold_count += 1

print(f"\nItems sold (line items): {items_sold_count:,}")
print(f"Cost of Goods Sold: {cost_of_goods_sold:,.0f} IQD")

# Now correct profit calculation
print("\n" + "="*60)
print("  CORRECT PROFIT CALCULATION")
print("="*60)

# Sales
sales = sum(float(b.get('BillAmount1', 0) or 0) for b in bills 
            if b.get('OperationType') == 2 and b.get('AccountId') not in jard_accounts)
sale_returns = sum(float(b.get('BillAmount1', 0) or 0) for b in bills if b.get('OperationType') == 11)
net_sales = sales - sale_returns

# Use COGS instead of total purchases
gross_profit = net_sales - cost_of_goods_sold

# Business expenses (not personal)
expense_ids = {38, 81, 82, 1225, 1226, 1308, 2568}
business_expenses = 0
for bond in bonds:
    acc_to = bond.get('AccountToId', 0)
    amount1 = float(bond.get('Amount1', 0) or 0)
    if acc_to in expense_ids:
        business_expenses += amount1

net_profit = gross_profit - business_expenses

print(f"""
  صافي المبيعات (Net Sales):     {net_sales:>15,.0f} IQD
  تكلفة البضاعة المباعة (COGS):  {cost_of_goods_sold:>15,.0f} IQD
  ─────────────────────────────────────────────────
  إجمالي الربح (Gross Profit):   {gross_profit:>15,.0f} IQD
  
  مصاريف تجارية (Expenses):      {business_expenses:>15,.0f} IQD
  ─────────────────────────────────────────────────
  صافي الربح (Net Profit):       {net_profit:>15,.0f} IQD
  
  سحوبات شخصية (Personal):       {personal_total:>15,.0f} IQD
""")

# Margin
if net_sales > 0:
    gross_margin = (gross_profit / net_sales) * 100
    print(f"  هامش الربح الإجمالي: {gross_margin:.1f}%")
