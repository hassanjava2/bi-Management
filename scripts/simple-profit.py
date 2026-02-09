# -*- coding: utf-8 -*-
"""
Simple Profit Calculation
Sales - Purchases - Expenses = Profit
"""
import json
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Load data
with open(r'D:\bi Management\data\morabaa-export\Bills.json', 'r', encoding='utf-8') as f:
    bills = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\accounts.json', 'r', encoding='utf-8') as f:
    accounts = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\Bonds.json', 'r', encoding='utf-8') as f:
    bonds = json.load(f)['data']

acc_lookup = {a['AccountId']: a.get('Name', '') for a in accounts}

# Find جرد accounts to exclude
jard_accounts = set()
for acc in accounts:
    name = acc.get('Name', '')
    if 'جرد' in name:
        jard_accounts.add(acc['AccountId'])

print("="*55)
print("  BI COMPANY - SIMPLE PROFIT CALCULATION")
print("="*55)

# 1. SALES (excluding جرد)
sales_total = 0
sales_count = 0
for bill in bills:
    if bill.get('OperationType') == 2:  # Sale
        acc_id = bill.get('AccountId', 0)
        if acc_id not in jard_accounts:
            sales_total += float(bill.get('BillAmount1', 0) or 0)
            sales_count += 1

# Sale returns
sale_returns = 0
for bill in bills:
    if bill.get('OperationType') == 11:  # Sale return
        sale_returns += float(bill.get('BillAmount1', 0) or 0)

net_sales = sales_total - sale_returns

# 2. PURCHASES
purchases_total = 0
purchases_count = 0
for bill in bills:
    if bill.get('OperationType') == 9:  # Purchase
        purchases_total += float(bill.get('BillAmount1', 0) or 0)
        purchases_count += 1

# Purchase returns
purchase_returns = 0
for bill in bills:
    if bill.get('OperationType') == 12:  # Purchase return
        purchase_returns += float(bill.get('BillAmount1', 0) or 0)

net_purchases = purchases_total - purchase_returns

# 3. EXPENSES (from Bonds)
expenses_total = 0
expenses_count = 0

# Also check for expense accounts
expense_keywords = ['مصروف', 'مصاريف', 'ايجار', 'كهرباء', 'رواتب', 'صيانة', 'نقل', 'اتصالات']
expense_accounts = set()
for acc in accounts:
    name = acc.get('Name', '')
    for kw in expense_keywords:
        if kw in name:
            expense_accounts.add(acc['AccountId'])
            break

# Get expenses from bonds
for bond in bonds:
    acc_id = bond.get('AccountId', 0)
    acc_name = acc_lookup.get(acc_id, '')
    amount = float(bond.get('Amount', 0) or 0)
    bond_type = bond.get('BondType', 0)
    
    # Payment bonds (type 2) to expense accounts
    if bond_type == 2 and acc_id in expense_accounts:
        expenses_total += amount
        expenses_count += 1
    # Or check by name keywords
    elif bond_type == 2:
        for kw in expense_keywords:
            if kw in acc_name:
                expenses_total += amount
                expenses_count += 1
                break

# Check for expense bills (type 18 or other)
for bill in bills:
    op = bill.get('OperationType')
    if op not in [2, 9, 11, 12]:  # Not sale, purchase, or returns
        acc_id = bill.get('AccountId', 0)
        if acc_id in expense_accounts:
            expenses_total += float(bill.get('BillAmount1', 0) or 0)

print(f"""
  ┌─────────────────────────────────────────────────┐
  │  SALES                                          │
  │    Invoices: {sales_count:>6}                            │
  │    Total: {sales_total:>15,.0f} IQD               │
  │    Returns: {sale_returns:>13,.0f} IQD               │
  │    NET SALES: {net_sales:>12,.0f} IQD               │
  └─────────────────────────────────────────────────┘
  
  ┌─────────────────────────────────────────────────┐
  │  PURCHASES                                      │
  │    Invoices: {purchases_count:>6}                            │
  │    Total: {purchases_total:>15,.0f} IQD               │
  │    Returns: {purchase_returns:>13,.0f} IQD               │
  │    NET PURCHASES: {net_purchases:>8,.0f} IQD               │
  └─────────────────────────────────────────────────┘
  
  ┌─────────────────────────────────────────────────┐
  │  EXPENSES: {expenses_total:>14,.0f} IQD               │
  └─────────────────────────────────────────────────┘
""")

# PROFIT CALCULATION
gross_profit = net_sales - net_purchases
net_profit = gross_profit - expenses_total

print("="*55)
print("  RESULT")
print("="*55)

print(f"""
  Net Sales:        {net_sales:>18,.0f} IQD
  - Net Purchases:  {net_purchases:>18,.0f} IQD
  ─────────────────────────────────────────
  Gross Profit:     {gross_profit:>18,.0f} IQD
  
  - Expenses:       {expenses_total:>18,.0f} IQD
  ─────────────────────────────────────────
""")

if net_profit >= 0:
    print(f"  ✅ NET PROFIT:    {net_profit:>18,.0f} IQD")
else:
    print(f"  ❌ NET LOSS:      {net_profit:>18,.0f} IQD")

print("\n" + "="*55)
