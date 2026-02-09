#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
BI Management - استخراج أسماء المنتجات
Extract product names for initial inventory entry
"""

import json
import os

# Read items
items_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'morabaa-export', 'Items.json')
with open(items_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Extract product names
products = []
for item in data['data']:
    if item.get('Name') and not item.get('Deleted'):
        name = item['Name'].strip()
        if name:
            products.append({
                'id': item['Id'],
                'name': name,
                'buy_price': item.get('BuyPrice', 0) or 0,
                'sale_price': item.get('SalePrice1', 0) or 0,
                'group_id': item.get('GroupId', 0)
            })

print(f'Total products: {len(products)}')

# Save to data folder
output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'products-list.json')
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump({
        'count': len(products),
        'products': products
    }, f, ensure_ascii=False, indent=2)

print(f'Saved to: {output_path}')

# Show first 20
print('\nFirst 20 products:')
for p in products[:20]:
    print(f"  {p['id']:3}: {p['name']}")
