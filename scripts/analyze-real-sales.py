# -*- coding: utf-8 -*-
"""
BI Company - Real Sales Analysis (Excluding Inventory Accounts)
"""
import json
import sys
from datetime import datetime
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Load data
with open(r'D:\bi Management\data\morabaa-export\Bills.json', 'r', encoding='utf-8') as f:
    bills = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\accounts.json', 'r', encoding='utf-8') as f:
    accounts = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\Items.json', 'r', encoding='utf-8') as f:
    items = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\BillItems.json', 'r', encoding='utf-8') as f:
    bill_items = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\Quantities.json', 'r', encoding='utf-8') as f:
    quantities = json.load(f)['data']

acc_lookup = {a['AccountId']: a.get('Name', '') for a in accounts}
item_lookup = {i['Id']: i for i in items}

print("="*70)
print("  BI COMPANY - REAL FINANCIAL ANALYSIS")
print("  (Excluding Inventory/Jard Accounts)")
print("="*70)

# Identify inventory accounts (جرد)
inventory_accounts = set()
for acc in accounts:
    name = acc.get('Name', '')
    if 'جرد' in name:
        inventory_accounts.add(acc['AccountId'])

print(f"\nInventory accounts identified: {len(inventory_accounts)}")

# Analyze REAL sales (excluding inventory)
real_sales = []
inventory_sales = []
purchases = []
sale_returns = []
purchase_returns = []

for bill in bills:
    op = bill.get('OperationType')
    acc_id = bill.get('AccountId', 0)
    amount = float(bill.get('BillAmount1', 0) or 0)
    paid = float(bill.get('Paid1', 0) or 0)
    remain = float(bill.get('Remain1', 0) or 0)
    date = bill.get('Date', '')
    
    if op == 2:  # Sales
        if acc_id in inventory_accounts:
            inventory_sales.append(bill)
        else:
            real_sales.append(bill)
    elif op == 9:  # Purchase
        purchases.append(bill)
    elif op == 11:  # Sale return
        sale_returns.append(bill)
    elif op == 12:  # Purchase return
        purchase_returns.append(bill)

# Calculate totals
total_real_sales = sum(float(b.get('BillAmount1', 0) or 0) for b in real_sales)
total_inventory = sum(float(b.get('BillAmount1', 0) or 0) for b in inventory_sales)
total_purchases = sum(float(b.get('BillAmount1', 0) or 0) for b in purchases)
total_sale_returns = sum(float(b.get('BillAmount1', 0) or 0) for b in sale_returns)
total_purchase_returns = sum(float(b.get('BillAmount1', 0) or 0) for b in purchase_returns)

total_paid_sales = sum(float(b.get('Paid1', 0) or 0) for b in real_sales)
total_remaining_sales = sum(float(b.get('Remain1', 0) or 0) for b in real_sales)
total_paid_purchases = sum(float(b.get('Paid1', 0) or 0) for b in purchases)
total_remaining_purchases = sum(float(b.get('Remain1', 0) or 0) for b in purchases)

print("\n" + "="*70)
print("  SUMMARY OF OPERATIONS")
print("="*70)

print(f"""
  REAL SALES (excluding inventory):
    - Number of bills: {len(real_sales):,}
    - Total amount: {total_real_sales:,.0f} IQD
    - Paid: {total_paid_sales:,.0f} IQD
    - Remaining (Receivables): {total_remaining_sales:,.0f} IQD

  INVENTORY ENTRIES (not real sales):
    - Number of bills: {len(inventory_sales):,}
    - Total value: {total_inventory:,.0f} IQD
    
  PURCHASES:
    - Number of bills: {len(purchases):,}
    - Total amount: {total_purchases:,.0f} IQD
    - Paid: {total_paid_purchases:,.0f} IQD
    - Remaining (Payables): {total_remaining_purchases:,.0f} IQD
    
  SALE RETURNS:
    - Number of bills: {len(sale_returns):,}
    - Total amount: {total_sale_returns:,.0f} IQD
    
  PURCHASE RETURNS:
    - Number of bills: {len(purchase_returns):,}
    - Total amount: {total_purchase_returns:,.0f} IQD
""")

# Calculate real profit
net_sales = total_real_sales - total_sale_returns
net_purchases = total_purchases - total_purchase_returns
gross_profit = net_sales - net_purchases

print("="*70)
print("  PROFIT CALCULATION")
print("="*70)

print(f"""
  Net Sales: {net_sales:,.0f} IQD
  - (Real Sales: {total_real_sales:,.0f} - Returns: {total_sale_returns:,.0f})
  
  Net Purchases: {net_purchases:,.0f} IQD
  - (Purchases: {total_purchases:,.0f} - Returns: {total_purchase_returns:,.0f})
  
  GROSS PROFIT: {gross_profit:,.0f} IQD
""")

if net_sales > 0:
    margin = (gross_profit / net_sales) * 100
    print(f"  Gross Margin: {margin:.1f}%")

# Monthly breakdown (real sales only)
print("\n" + "="*70)
print("  MONTHLY ANALYSIS (Real Sales Only)")
print("="*70 + "\n")

monthly = defaultdict(lambda: {'sales': 0, 'purchases': 0, 'returns': 0, 'count': 0})

for bill in real_sales:
    date = bill.get('Date', '')
    if date:
        try:
            dt = datetime.fromisoformat(date.split('.')[0])
            month = dt.strftime('%Y-%m')
            monthly[month]['sales'] += float(bill.get('BillAmount1', 0) or 0)
            monthly[month]['count'] += 1
        except:
            pass

for bill in purchases:
    date = bill.get('Date', '')
    if date:
        try:
            dt = datetime.fromisoformat(date.split('.')[0])
            month = dt.strftime('%Y-%m')
            monthly[month]['purchases'] += float(bill.get('BillAmount1', 0) or 0)
        except:
            pass

print(f"{'Month':<10} {'Sales':>18} {'Purchases':>18} {'Gross Profit':>18} {'Margin':>10} {'Bills':>8}")
print("-" * 85)

for month in sorted(monthly.keys(), reverse=True):
    data = monthly[month]
    profit = data['sales'] - data['purchases']
    margin = (profit / data['sales'] * 100) if data['sales'] > 0 else 0
    print(f"{month:<10} {data['sales']:>18,.0f} {data['purchases']:>18,.0f} {profit:>18,.0f} {margin:>9.1f}% {data['count']:>8}")

# Top real customers
print("\n" + "="*70)
print("  TOP 15 REAL CUSTOMERS (By Sales)")
print("="*70 + "\n")

customer_totals = defaultdict(lambda: {'total': 0, 'count': 0, 'paid': 0})
for bill in real_sales:
    acc_id = bill.get('AccountId', 0)
    customer_totals[acc_id]['total'] += float(bill.get('BillAmount1', 0) or 0)
    customer_totals[acc_id]['paid'] += float(bill.get('Paid1', 0) or 0)
    customer_totals[acc_id]['count'] += 1

sorted_customers = sorted(customer_totals.items(), key=lambda x: x[1]['total'], reverse=True)

print(f"{'#':<3} {'Customer Name':<40} {'Bills':>6} {'Total Sales':>18} {'Paid':>18}")
print("-" * 90)
for i, (acc_id, data) in enumerate(sorted_customers[:15], 1):
    name = acc_lookup.get(acc_id, 'Unknown')[:38]
    print(f"{i:<3} {name:<40} {data['count']:>6} {data['total']:>18,.0f} {data['paid']:>18,.0f}")

# Stock analysis
print("\n" + "="*70)
print("  CURRENT STOCK VALUE")
print("="*70 + "\n")

total_stock_buy = 0
total_stock_sell = 0
items_in_stock = 0

for qty in quantities:
    if qty.get('Deleted'):
        continue
    item_id = qty.get('ItemId', 0)
    stock = float(qty.get('Number', 0) or 0)
    
    if stock > 0 and item_id in item_lookup:
        item = item_lookup[item_id]
        buy_price = float(item.get('BuyPrice', 0) or 0)
        sell_price = float(item.get('SalePrice1', 0) or 0)
        
        total_stock_buy += buy_price * stock
        total_stock_sell += sell_price * stock
        items_in_stock += 1

print(f"  Items with stock: {items_in_stock}")
print(f"  Stock Value (Cost): {total_stock_buy:,.0f} IQD")
print(f"  Stock Value (Retail): {total_stock_sell:,.0f} IQD")
print(f"  Potential Profit in Stock: {total_stock_sell - total_stock_buy:,.0f} IQD")

# FINAL SUMMARY
print("\n" + "="*70)
print("  FINANCIAL POSITION SUMMARY")
print("="*70)

print(f"""
  ASSETS:
    - Cash Receivables (Debtors): {total_remaining_sales:,.0f} IQD
    - Inventory Value (Cost): {total_stock_buy:,.0f} IQD
    - Inventory Value (Retail): {total_stock_sell:,.0f} IQD
    
  LIABILITIES:
    - Payables (Creditors): {total_remaining_purchases:,.0f} IQD
    
  NET POSITION:
    - Receivables - Payables: {total_remaining_sales - total_remaining_purchases:,.0f} IQD
    
  PROFITABILITY:
    - Gross Profit to date: {gross_profit:,.0f} IQD
    - Gross Margin: {margin:.1f}%
""")

print("="*70)
print("  END OF ANALYSIS")
print("="*70)
