# -*- coding: utf-8 -*-
"""
Correct Item by Item Calculation using SinglePrice
"""
import json
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Load data
with open(r'D:\bi Management\data\morabaa-export\Bills.json', 'r', encoding='utf-8') as f:
    bills = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\BillItems.json', 'r', encoding='utf-8') as f:
    bill_items = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\Items.json', 'r', encoding='utf-8') as f:
    items_data = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\accounts.json', 'r', encoding='utf-8') as f:
    accounts = json.load(f)['data']

# Item info from Items table (backup prices)
item_master = {}
for item in items_data:
    item_master[item['Id']] = {
        'name': item.get('Name', ''),
        'buy_price': float(item.get('BuyPrice', 0) or 0),
        'sell_price': float(item.get('SalePrice1', 0) or 0)
    }

acc_lookup = {a['AccountId']: a.get('Name', '') for a in accounts}

# جرد accounts to ignore (software errors)
jard_error_accounts = set()
for acc in accounts:
    name = acc.get('Name', '')
    # جرد and جرد شهر 12 are errors, جرد اكسسوارات is inventory
    if ('جرد' in name and 'اكسسوارات' not in name):
        jard_error_accounts.add(acc['AccountId'])

# Bill info
bill_info = {}
for bill in bills:
    bill_id = bill.get('BillId')
    bill_info[bill_id] = {
        'type': bill.get('OperationType'),
        'account_id': bill.get('AccountId', 0),
        'is_jard_error': bill.get('AccountId', 0) in jard_error_accounts
    }

# Track each item
inventory = defaultdict(lambda: {
    'name': '',
    'purchased_qty': 0,
    'purchased_cost': 0,  # Total cost of purchases
    'sold_qty': 0,
    'sold_revenue': 0,  # Total revenue from sales
    'return_sale_qty': 0,
    'return_purchase_qty': 0,
    'jard_qty': 0  # جرد error - ignored
})

print("Processing bill items...")

# Process all bill items
for bi in bill_items:
    bill_id = bi.get('BillId')
    item_id = bi.get('ItemId')
    qty = float(bi.get('Number', 0) or 0)
    single_price = float(bi.get('SinglePrice', 0) or 0)
    op_type = bi.get('OperationsType')  # Can also get from bill
    
    if not item_id:
        continue
    
    # Get item name
    if item_id in item_master:
        inventory[item_id]['name'] = item_master[item_id]['name']
    
    # Use OperationsType from BillItems directly
    if op_type == 9:  # Purchase
        inventory[item_id]['purchased_qty'] += qty
        inventory[item_id]['purchased_cost'] += qty * single_price
    
    elif op_type == 2:  # Sale
        # Check if it's a jard error
        if bill_id in bill_info and bill_info[bill_id]['is_jard_error']:
            inventory[item_id]['jard_qty'] += qty
        else:
            inventory[item_id]['sold_qty'] += qty
            inventory[item_id]['sold_revenue'] += qty * single_price
    
    elif op_type == 11:  # Sale return
        inventory[item_id]['return_sale_qty'] += qty
    
    elif op_type == 12:  # Purchase return
        inventory[item_id]['return_purchase_qty'] += qty

print(f"Processed {len(inventory)} unique items")

# Calculate totals
total_purchased_qty = 0
total_purchased_cost = 0
total_sold_qty = 0
total_sold_revenue = 0
total_cogs = 0
total_profit = 0
total_remaining_qty = 0
total_remaining_value = 0
total_jard_qty = 0

# For detailed report
item_details = []

for item_id, data in inventory.items():
    # Net quantities
    net_purchased = data['purchased_qty'] - data['return_purchase_qty']
    net_sold = data['sold_qty'] - data['return_sale_qty']
    remaining = net_purchased - net_sold
    
    # Average buy price
    if net_purchased > 0:
        avg_buy_price = data['purchased_cost'] / data['purchased_qty'] if data['purchased_qty'] > 0 else 0
    elif item_id in item_master:
        avg_buy_price = item_master[item_id]['buy_price']
    else:
        avg_buy_price = 0
    
    # Cost of goods sold
    cogs = net_sold * avg_buy_price if net_sold > 0 else 0
    
    # Profit
    profit = data['sold_revenue'] - cogs
    
    # Remaining value
    remaining_value = remaining * avg_buy_price if remaining > 0 else 0
    
    # Add to totals
    total_purchased_qty += max(0, net_purchased)
    total_purchased_cost += data['purchased_cost']
    total_sold_qty += max(0, net_sold)
    total_sold_revenue += data['sold_revenue']
    total_cogs += cogs
    total_profit += profit
    total_remaining_qty += max(0, remaining)
    total_remaining_value += max(0, remaining_value)
    total_jard_qty += data['jard_qty']
    
    if data['sold_revenue'] > 0 or net_purchased > 0:
        item_details.append({
            'name': data['name'],
            'purchased': net_purchased,
            'sold': net_sold,
            'remaining': remaining,
            'revenue': data['sold_revenue'],
            'cogs': cogs,
            'profit': profit,
            'remaining_value': remaining_value
        })

# Sort by profit
item_details.sort(key=lambda x: x['profit'], reverse=True)

print("\n" + "="*70)
print("  TOP 20 ITEMS BY PROFIT")
print("="*70 + "\n")

print(f"{'Item':<40} {'Sold':>6} {'Revenue':>14} {'Cost':>14} {'Profit':>14}")
print("-" * 95)

for item in item_details[:20]:
    name = item['name'][:38] if item['name'] else 'Unknown'
    print(f"{name:<40} {item['sold']:>6.0f} {item['revenue']:>14,.0f} {item['cogs']:>14,.0f} {item['profit']:>14,.0f}")

print("\n" + "="*70)
print("  SUMMARY")
print("="*70)

print(f"""
  QUANTITIES:
    Total Purchased:      {total_purchased_qty:>15,.0f} items
    Total Sold:           {total_sold_qty:>15,.0f} items
    Remaining Stock:      {total_remaining_qty:>15,.0f} items
    Jard (errors):        {total_jard_qty:>15,.0f} items

  FINANCIALS:
    Total Revenue:        {total_sold_revenue:>15,.0f} IQD
    Cost of Goods Sold:   {total_cogs:>15,.0f} IQD
    ─────────────────────────────────────────────
    GROSS PROFIT:         {total_profit:>15,.0f} IQD
    
    Inventory Value:      {total_remaining_value:>15,.0f} IQD
""")

if total_sold_revenue > 0:
    margin = (total_profit / total_sold_revenue) * 100
    print(f"    Profit Margin:        {margin:>15.1f}%")

print("\n" + "="*70)
print("  FINAL")
print("="*70)

print(f"""
  ╔════════════════════════════════════════════════════════╗
  ║                                                        ║
  ║   إجمالي الربح:       {total_profit:>15,.0f} د.ع        ║
  ║                                                        ║
  ║   قيمة المخزون:       {total_remaining_value:>15,.0f} د.ع        ║
  ║                                                        ║
  ║   المجموع:            {total_profit + total_remaining_value:>15,.0f} د.ع        ║
  ║                                                        ║
  ╚════════════════════════════════════════════════════════╝
""")
