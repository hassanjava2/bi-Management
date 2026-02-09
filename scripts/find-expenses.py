# -*- coding: utf-8 -*-
"""
Find all expenses from Bonds
"""
import json
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

with open(r'D:\bi Management\data\morabaa-export\Bonds.json', 'r', encoding='utf-8') as f:
    bonds = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\accounts.json', 'r', encoding='utf-8') as f:
    accounts = json.load(f)['data']

acc_lookup = {a['AccountId']: a.get('Name', '') for a in accounts}

# Expense account IDs
expense_acc_ids = {38, 81, 82, 1225, 1226, 1308, 2568}  # Business expenses
personal_acc_ids = {1000, 1198, 1627}  # Personal (حسن الشريفي, سوناتا)

print("="*60)
print("  EXPENSES ANALYSIS")
print("="*60)

business_expenses = 0
personal_expenses = 0
all_expenses = []

for bond in bonds:
    acc_from = bond.get('AccountFromId', 0)
    acc_to = bond.get('AccountToId', 0)
    amount1 = float(bond.get('Amount1', 0) or 0)
    amount2 = float(bond.get('Amount2', 0) or 0)
    amount = amount1 if amount1 > 0 else amount2
    note = bond.get('Note', '') or ''
    date = str(bond.get('Date', ''))[:10]
    
    # Check if payment TO expense account
    if acc_to in expense_acc_ids:
        business_expenses += amount
        acc_name = acc_lookup.get(acc_to, '')
        all_expenses.append({'type': 'Business', 'name': acc_name, 'amount': amount, 'date': date, 'note': note})
    
    if acc_to in personal_acc_ids:
        personal_expenses += amount
        acc_name = acc_lookup.get(acc_to, '')
        all_expenses.append({'type': 'Personal', 'name': acc_name, 'amount': amount, 'date': date, 'note': note})
    
    # Also check FROM (withdrawals)
    if acc_from in expense_acc_ids:
        business_expenses += amount
        acc_name = acc_lookup.get(acc_from, '')
        all_expenses.append({'type': 'Business', 'name': acc_name, 'amount': amount, 'date': date, 'note': note})
    
    if acc_from in personal_acc_ids:
        personal_expenses += amount
        acc_name = acc_lookup.get(acc_from, '')
        all_expenses.append({'type': 'Personal', 'name': acc_name, 'amount': amount, 'date': date, 'note': note})

# Sort by amount
all_expenses.sort(key=lambda x: x['amount'], reverse=True)

print(f"\nBusiness Expenses: {business_expenses:,.0f} IQD")
print(f"Personal Expenses: {personal_expenses:,.0f} IQD")
print(f"TOTAL: {business_expenses + personal_expenses:,.0f} IQD")

print("\n--- Top 20 Expense Transactions ---\n")
for i, exp in enumerate(all_expenses[:20], 1):
    print(f"{i:>2}. [{exp['type'][:4]}] {exp['date']} | {exp['name'][:25]:<27} | {exp['amount']:>12,.0f}")

# Now recalculate with correct data
print("\n" + "="*60)
print("  FINAL PROFIT CALCULATION")
print("="*60)

# Load bills for sales/purchases
with open(r'D:\bi Management\data\morabaa-export\Bills.json', 'r', encoding='utf-8') as f:
    bills = json.load(f)['data']

# Jard accounts
jard_accounts = set()
for acc in accounts:
    if 'جرد' in acc.get('Name', ''):
        jard_accounts.add(acc['AccountId'])

# Sales (no jard)
sales = sum(float(b.get('BillAmount1', 0) or 0) for b in bills 
            if b.get('OperationType') == 2 and b.get('AccountId') not in jard_accounts)
sale_returns = sum(float(b.get('BillAmount1', 0) or 0) for b in bills if b.get('OperationType') == 11)
net_sales = sales - sale_returns

# Purchases
purchases = sum(float(b.get('BillAmount1', 0) or 0) for b in bills if b.get('OperationType') == 9)
purchase_returns = sum(float(b.get('BillAmount1', 0) or 0) for b in bills if b.get('OperationType') == 12)
net_purchases = purchases - purchase_returns

# Profit
gross_profit = net_sales - net_purchases
net_profit = gross_profit - business_expenses

print(f"""
  Net Sales:              {net_sales:>15,.0f} IQD
  Net Purchases:          {net_purchases:>15,.0f} IQD
  ───────────────────────────────────────────
  Gross Profit:           {gross_profit:>15,.0f} IQD
  
  Business Expenses:      {business_expenses:>15,.0f} IQD
  ───────────────────────────────────────────
  NET PROFIT (Business):  {net_profit:>15,.0f} IQD
  
  (Personal expenses excluded: {personal_expenses:,.0f} IQD)
""")
