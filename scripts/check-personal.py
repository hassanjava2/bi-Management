# -*- coding: utf-8 -*-
import json
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

with open(r'D:\bi Management\data\morabaa-export\Bonds.json', 'r', encoding='utf-8') as f:
    bonds = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\accounts.json', 'r', encoding='utf-8') as f:
    accounts = json.load(f)['data']

acc_lookup = {a['AccountId']: a.get('Name', '') for a in accounts}

personal_ids = {1000, 1198, 1627}

print('Transactions TO personal accounts:')
print('-' * 60)
total = 0
count = 0
for b in bonds:
    if b.get('AccountToId') in personal_ids:
        amt = float(b.get('Amount1', 0) or 0)
        if amt > 0:
            total += amt
            count += 1
            acc = acc_lookup.get(b.get('AccountToId'), '')
            date = str(b.get('Date', ''))[:10]
            print(f'{date} | {acc[:25]:<27} | {amt:>12,.0f}')

print('-' * 60)
print(f'Count: {count}')
print(f'TOTAL: {total:,.0f}')

# Also show account names
print('\nPersonal account names:')
for aid in personal_ids:
    print(f'  {aid}: {acc_lookup.get(aid, "?")}')
