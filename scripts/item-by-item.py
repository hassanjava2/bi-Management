# -*- coding: utf-8 -*-
"""
Item by Item Analysis - Build new inventory from scratch
"""
import json
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Load all data
with open(r'D:\bi Management\data\morabaa-export\Bills.json', 'r', encoding='utf-8') as f:
    bills = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\BillItems.json', 'r', encoding='utf-8') as f:
    bill_items = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\Items.json', 'r', encoding='utf-8') as f:
    items_data = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\accounts.json', 'r', encoding='utf-8') as f:
    accounts = json.load(f)['data']

# Create lookups
item_info = {}
for item in items_data:
    item_info[item['Id']] = {
        'name': item.get('Name', ''),
        'buy_price': float(item.get('BuyPrice', 0) or 0),
        'sell_price': float(item.get('SalePrice1', 0) or 0)
    }

acc_lookup = {a['AccountId']: a.get('Name', '') for a in accounts}

# Find جرد accounts (to IGNORE as sales - they're errors)
jard_accounts = set()
for acc in accounts:
    name = acc.get('Name', '')
    if 'جرد' in name and 'اكسسوارات' not in name:  # جرد, جرد شهر 12
        jard_accounts.add(acc['AccountId'])
        print(f"  Ignore (error): {name}")

# Categorize bills
bill_info = {}
for bill in bills:
    bill_id = bill.get('BillId')
    op = bill.get('OperationType')
    acc_id = bill.get('AccountId', 0)
    acc_name = acc_lookup.get(acc_id, '')
    
    bill_info[bill_id] = {
        'type': op,
        'account_id': acc_id,
        'account_name': acc_name,
        'is_jard_error': acc_id in jard_accounts
    }

print("\n" + "="*70)
print("  ITEM BY ITEM INVENTORY CALCULATION")
print("="*70)

# Track each item
inventory = defaultdict(lambda: {
    'name': '',
    'purchased_qty': 0,
    'purchased_value': 0,
    'sold_qty': 0,
    'sold_value': 0,
    'returned_sale_qty': 0,
    'returned_purchase_qty': 0,
    'jard_error_qty': 0,  # Sold to جرد (error)
    'buy_prices': [],
    'sell_prices': []
})

# Process all bill items
for bi in bill_items:
    bill_id = bi.get('BillId')
    item_id = bi.get('ItemId')
    qty = float(bi.get('Number', 0) or 0)
    buy_price = float(bi.get('BuyPrice', 0) or 0)
    sell_price = float(bi.get('SinglePrice', 0) or 0)
    
    if bill_id not in bill_info:
        continue
    
    info = bill_info[bill_id]
    op = info['type']
    
    # Get item name
    if item_id in item_info:
        inventory[item_id]['name'] = item_info[item_id]['name']
    
    if op == 9:  # Purchase
        inventory[item_id]['purchased_qty'] += qty
        inventory[item_id]['purchased_value'] += qty * buy_price
        if buy_price > 0:
            inventory[item_id]['buy_prices'].append(buy_price)
    
    elif op == 2:  # Sale
        if info['is_jard_error']:
            # جرد error - don't count as real sale
            inventory[item_id]['jard_error_qty'] += qty
        else:
            # Real sale
            inventory[item_id]['sold_qty'] += qty
            inventory[item_id]['sold_value'] += qty * sell_price
            if sell_price > 0:
                inventory[item_id]['sell_prices'].append(sell_price)
    
    elif op == 11:  # Sale return
        inventory[item_id]['returned_sale_qty'] += qty
    
    elif op == 12:  # Purchase return
        inventory[item_id]['returned_purchase_qty'] += qty

# Calculate totals
total_purchased = 0
total_cost = 0
total_sold_qty = 0
total_revenue = 0
total_cogs = 0
total_remaining_qty = 0
total_remaining_value = 0
total_profit = 0
items_with_activity = 0

print("\n--- Top 30 Items by Revenue ---\n")
print(f"{'Item Name':<45} {'Bought':>8} {'Sold':>8} {'Left':>8} {'Profit':>15}")
print("-" * 90)

# Sort by sold value
sorted_items = sorted(inventory.items(), key=lambda x: x[1]['sold_value'], reverse=True)

for item_id, data in sorted_items[:30]:
    name = data['name'][:43] if data['name'] else f"Item #{item_id}"
    
    # Net quantities
    net_purchased = data['purchased_qty'] - data['returned_purchase_qty']
    net_sold = data['sold_qty'] - data['returned_sale_qty']
    remaining = net_purchased - net_sold
    
    # Average buy price
    if data['buy_prices']:
        avg_buy = sum(data['buy_prices']) / len(data['buy_prices'])
    elif net_purchased > 0:
        avg_buy = data['purchased_value'] / net_purchased
    else:
        avg_buy = 0
    
    # Profit for this item
    if net_sold > 0 and avg_buy > 0:
        cogs = net_sold * avg_buy
        profit = data['sold_value'] - cogs
    else:
        cogs = 0
        profit = 0
    
    # Remaining value
    remaining_value = remaining * avg_buy if remaining > 0 else 0
    
    if net_purchased > 0 or net_sold > 0:
        items_with_activity += 1
        total_purchased += net_purchased
        total_cost += data['purchased_value']
        total_sold_qty += net_sold
        total_revenue += data['sold_value']
        total_cogs += cogs
        total_profit += profit
        total_remaining_qty += max(0, remaining)
        total_remaining_value += max(0, remaining_value)
        
        print(f"{name:<45} {net_purchased:>8.0f} {net_sold:>8.0f} {remaining:>8.0f} {profit:>15,.0f}")

# Summary
print("\n" + "="*70)
print("  SUMMARY")
print("="*70)

print(f"""
  Items with activity: {items_with_activity}
  
  QUANTITIES:
    Total Purchased:     {total_purchased:>15,.0f}
    Total Sold:          {total_sold_qty:>15,.0f}
    Remaining in Stock:  {total_remaining_qty:>15,.0f}
  
  FINANCIALS:
    Total Revenue:       {total_revenue:>15,.0f} IQD
    Cost of Goods Sold:  {total_cogs:>15,.0f} IQD
    ─────────────────────────────────────────
    GROSS PROFIT:        {total_profit:>15,.0f} IQD
    
    Inventory Value:     {total_remaining_value:>15,.0f} IQD
""")

# Check margin
if total_revenue > 0:
    margin = (total_profit / total_revenue) * 100
    print(f"    Profit Margin:       {margin:>15.1f}%")

print("\n" + "="*70)
print("  FINAL RESULT")
print("="*70)

print(f"""
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║   إجمالي الربح:      {total_profit:>15,.0f} د.ع         ║
  ║                                                       ║
  ║   قيمة المخزون:      {total_remaining_value:>15,.0f} د.ع         ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
""")

# Show جرد errors
jard_error_items = sum(1 for d in inventory.values() if d['jard_error_qty'] > 0)
jard_error_qty = sum(d['jard_error_qty'] for d in inventory.values())
print(f"  Note: {jard_error_qty:.0f} items in {jard_error_items} products marked as جرد (ignored as errors)")
