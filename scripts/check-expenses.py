# -*- coding: utf-8 -*-
import json
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Check bonds
with open(r'D:\bi Management\data\morabaa-export\Bonds.json', 'r', encoding='utf-8') as f:
    bonds = json.load(f)

with open(r'D:\bi Management\data\morabaa-export\accounts.json', 'r', encoding='utf-8') as f:
    accounts = json.load(f)['data']

acc_lookup = {a['AccountId']: a.get('Name', '') for a in accounts}

print('Bonds columns:', bonds['columns'])
print('Total bonds:', bonds['count'])

# Show sample bonds
print('\n--- Sample Bonds ---')
for b in bonds['data'][:10]:
    acc_id = b.get('AccountId', 0)
    acc_name = acc_lookup.get(acc_id, '')
    amount = b.get('Amount', 0) or 0
    bond_type = b.get('BondType', 0)
    note = b.get('Note', '') or ''
    print(f"Type:{bond_type} | {amount:>12,.0f} | {acc_name[:30]:<32} | {note[:30]}")

# Find expense-related accounts
print('\n--- Looking for expense accounts ---')
expense_keywords = ['مصروف', 'مصاريف', 'ايجار', 'كهرباء', 'رواتب', 'صيانة', 'نقل', 'حسن الشريفي', 'سوناتا']

for acc in accounts:
    name = acc.get('Name', '')
    for kw in expense_keywords:
        if kw in name:
            print(f"  Found: {name} (ID: {acc['AccountId']})")
            break

# Check movments table for expenses
with open(r'D:\bi Management\data\morabaa-export\movments.json', 'r', encoding='utf-8') as f:
    movements = json.load(f)

print(f'\n--- Movements ---')
print(f'Total: {movements["count"]}')
print(f'Columns: {movements["columns"]}')

# Sample
print('\nSample movements:')
for m in movements['data'][:5]:
    acc_id = m.get('AccountId', 0)
    acc_name = acc_lookup.get(acc_id, '')
    debit = m.get('Debit', 0) or 0
    credit = m.get('Credit', 0) or 0
    print(f"  {acc_name[:35]:<37} | Debit: {debit:>12,.0f} | Credit: {credit:>12,.0f}")
