# -*- coding: utf-8 -*-
import json
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Check December 2025 bills
with open(r'D:\bi Management\data\morabaa-export\Bills.json', 'r', encoding='utf-8') as f:
    bills = json.load(f)['data']

# Load accounts
with open(r'D:\bi Management\data\morabaa-export\accounts.json', 'r', encoding='utf-8') as f:
    accounts = json.load(f)['data']

acc_lookup = {a['AccountId']: a.get('Name', '') for a in accounts}

# Filter December sales
dec_bills = []
for b in bills:
    if b.get('OperationType') == 2:  # Sales
        date = b.get('Date', '')
        if '2025-12' in date:
            dec_bills.append(b)

# Sort by amount
dec_bills.sort(key=lambda x: float(x.get('BillAmount1', 0) or 0), reverse=True)

print('=== December 2025 - Top 15 Sales Bills ===')
print()
for i, bill in enumerate(dec_bills[:15], 1):
    acc_id = bill.get('AccountId', 0)
    acc_name = acc_lookup.get(acc_id, 'Unknown')
    amount = float(bill.get('BillAmount1', 0) or 0)
    date = bill.get('Date', '')[:10]
    print(f'{i}. {date} | {acc_name[:35]:<36} | {amount:>15,.0f} IQD')

print()
print(f'Total December Sales Bills: {len(dec_bills)}')

total_dec = sum(float(b.get('BillAmount1', 0) or 0) for b in dec_bills)
print(f'Total December Sales Amount: {total_dec:,.0f} IQD')

# Check for internal/inventory accounts
print('\n=== Checking for Inventory/Internal Accounts ===\n')

# Find large account patterns
account_totals = {}
for b in bills:
    if b.get('OperationType') == 2:  # Sales
        acc_id = b.get('AccountId', 0)
        amount = float(b.get('BillAmount1', 0) or 0)
        if acc_id not in account_totals:
            account_totals[acc_id] = {'name': acc_lookup.get(acc_id, ''), 'total': 0, 'count': 0}
        account_totals[acc_id]['total'] += amount
        account_totals[acc_id]['count'] += 1

# Sort by total
sorted_accounts = sorted(account_totals.items(), key=lambda x: x[1]['total'], reverse=True)

print('=== Top 15 Accounts by Total Sales ===\n')
for i, (acc_id, data) in enumerate(sorted_accounts[:15], 1):
    print(f'{i}. {data["name"][:40]:<42} | Bills: {data["count"]:>4} | Total: {data["total"]:>15,.0f} IQD')
