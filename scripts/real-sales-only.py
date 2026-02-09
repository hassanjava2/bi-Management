# -*- coding: utf-8 -*-
"""
BI Company - REAL SALES ONLY (No inventory entries)
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

acc_lookup = {a['AccountId']: a.get('Name', '') for a in accounts}

# ALL جرد accounts should be excluded - they're inventory counts, not sales
jard_accounts = set()
for acc in accounts:
    name = acc.get('Name', '')
    if 'جرد' in name:
        jard_accounts.add(acc['AccountId'])

print("="*60)
print("  BI COMPANY - REAL SALES ANALYSIS")
print("  (Excluding ALL inventory count entries)")
print("="*60)

# Real sales only
real_sales = []
real_sales_total = 0
real_sales_paid = 0
real_sales_remaining = 0

for bill in bills:
    if bill.get('OperationType') == 2:  # Sales
        acc_id = bill.get('AccountId', 0)
        if acc_id not in jard_accounts:
            amount = float(bill.get('BillAmount1', 0) or 0)
            paid = float(bill.get('Paid1', 0) or 0)
            remain = float(bill.get('Remain1', 0) or 0)
            
            real_sales.append(bill)
            real_sales_total += amount
            real_sales_paid += paid
            real_sales_remaining += remain

# Purchases
purchases_total = 0
purchases_paid = 0
purchases_remaining = 0
purchase_count = 0

for bill in bills:
    if bill.get('OperationType') == 9:
        amount = float(bill.get('BillAmount1', 0) or 0)
        paid = float(bill.get('Paid1', 0) or 0)
        remain = float(bill.get('Remain1', 0) or 0)
        
        purchases_total += amount
        purchases_paid += paid
        purchases_remaining += remain
        purchase_count += 1

# Returns
sale_returns = sum(float(b.get('BillAmount1', 0) or 0) for b in bills if b.get('OperationType') == 11)
purchase_returns = sum(float(b.get('BillAmount1', 0) or 0) for b in bills if b.get('OperationType') == 12)

print(f"""
  REAL SALES (to actual customers):
    - Number of invoices: {len(real_sales):,}
    - Total amount: {real_sales_total:,.0f} IQD
    - Paid: {real_sales_paid:,.0f} IQD
    - Remaining: {real_sales_remaining:,.0f} IQD
    
  PURCHASES:
    - Number of invoices: {purchase_count:,}
    - Total amount: {purchases_total:,.0f} IQD
    - Paid: {purchases_paid:,.0f} IQD
    - Remaining: {purchases_remaining:,.0f} IQD
    
  RETURNS:
    - Sale returns: {sale_returns:,.0f} IQD
    - Purchase returns: {purchase_returns:,.0f} IQD
""")

# Profit calculation
net_sales = real_sales_total - sale_returns
net_purchases = purchases_total - purchase_returns
gross_profit = net_sales - net_purchases
margin = (gross_profit / net_sales * 100) if net_sales > 0 else 0

print("="*60)
print("  PROFIT CALCULATION")
print("="*60)

print(f"""
  Net Sales: {net_sales:,.0f} IQD
  Net Purchases: {net_purchases:,.0f} IQD
  
  ╔════════════════════════════════════════════╗
  ║  GROSS PROFIT: {gross_profit:>20,.0f} IQD  ║
  ║  MARGIN:       {margin:>20.1f}%     ║
  ╚════════════════════════════════════════════╝
""")

# Monthly breakdown
print("="*60)
print("  MONTHLY SALES (Real customers only)")
print("="*60)

monthly = defaultdict(lambda: {'sales': 0, 'count': 0})
for bill in real_sales:
    date = bill.get('Date', '')
    if date:
        month = date[:7]
        monthly[month]['sales'] += float(bill.get('BillAmount1', 0) or 0)
        monthly[month]['count'] += 1

print(f"\n{'Month':<10} {'Sales':>18} {'Invoices':>10}")
print("-" * 40)
for month in sorted(monthly.keys(), reverse=True)[:12]:
    data = monthly[month]
    print(f"{month:<10} {data['sales']:>18,.0f} {data['count']:>10}")

# Top customers
print("\n" + "="*60)
print("  TOP 10 REAL CUSTOMERS")
print("="*60)

customer_totals = defaultdict(lambda: {'total': 0, 'paid': 0, 'count': 0})
for bill in real_sales:
    acc_id = bill.get('AccountId', 0)
    customer_totals[acc_id]['total'] += float(bill.get('BillAmount1', 0) or 0)
    customer_totals[acc_id]['paid'] += float(bill.get('Paid1', 0) or 0)
    customer_totals[acc_id]['count'] += 1

sorted_customers = sorted(customer_totals.items(), key=lambda x: x[1]['total'], reverse=True)

print(f"\n{'Customer':<35} {'Total':>15} {'Paid':>15} {'Owing':>15}")
print("-" * 85)
for acc_id, data in sorted_customers[:10]:
    name = acc_lookup.get(acc_id, 'Unknown')[:33]
    owing = data['total'] - data['paid']
    print(f"{name:<35} {data['total']:>15,.0f} {data['paid']:>15,.0f} {owing:>15,.0f}")

# Summary
print("\n" + "="*60)
print("  FINANCIAL POSITION")
print("="*60)

print(f"""
  Receivables (customers owe us): {real_sales_remaining:,.0f} IQD
  Payables (we owe suppliers): {purchases_remaining:,.0f} IQD
  Net: {real_sales_remaining - purchases_remaining:,.0f} IQD
  
  Gross Profit: {gross_profit:,.0f} IQD
""")
