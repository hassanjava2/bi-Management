# -*- coding: utf-8 -*-
import json
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

with open(r'D:\bi Management\data\morabaa-export\BillItems.json', 'r', encoding='utf-8') as f:
    bi = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\Items.json', 'r', encoding='utf-8') as f:
    items = json.load(f)['data']

item_lookup = {i['Id']: i.get('Name', '') for i in items}

# Find purchase items with actual prices
print('Sample PURCHASE items (OperationsType=9):')
print('-' * 60)
count = 0
for item in bi:
    if item.get('OperationsType') == 9 and count < 10:
        item_id = item.get('ItemId')
        name = item_lookup.get(item_id, '')[:40]
        qty = item.get('Number', 0)
        buy = item.get('BuyPrice', 0)
        single = item.get('SinglePrice', 0)
        sale_in_buy = item.get('SalePriceInBuyBill', 0)
        
        if single and single > 0:
            print(f'{name}')
            print(f'  Qty: {qty}, BuyPrice: {buy}, SinglePrice: {single}, SaleInBuy: {sale_in_buy}')
            print()
            count += 1

print('\nSample SALE items (OperationsType=2):')
print('-' * 60)
count = 0
for item in bi:
    if item.get('OperationsType') == 2 and count < 10:
        item_id = item.get('ItemId')
        name = item_lookup.get(item_id, '')[:40]
        qty = item.get('Number', 0)
        single = item.get('SinglePrice', 0)
        
        if single and single > 0:
            print(f'{name}')
            print(f'  Qty: {qty}, SinglePrice: {single}')
            print()
            count += 1

# Check Items table for prices
print('\nSample from Items table:')
print('-' * 60)
for item in items[:10]:
    name = item.get('Name', '')[:40]
    buy = item.get('BuyPrice', 0)
    sale = item.get('SalePrice1', 0)
    if buy or sale:
        print(f'{name}')
        print(f'  BuyPrice: {buy}, SalePrice1: {sale}')
