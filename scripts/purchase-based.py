# -*- coding: utf-8 -*-
"""
Purchase-Based Calculation
Only trust purchase invoices - everything else has errors
"""
import json
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Load data
with open(r'D:\bi Management\data\morabaa-export\BillItems.json', 'r', encoding='utf-8') as f:
    bill_items = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\Items.json', 'r', encoding='utf-8') as f:
    items_data = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\Bills.json', 'r', encoding='utf-8') as f:
    bills = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\accounts.json', 'r', encoding='utf-8') as f:
    accounts = json.load(f)['data']

# Item names
item_names = {i['Id']: i.get('Name', '') for i in items_data}

# جرد accounts (errors)
jard_accounts = set()
for acc in accounts:
    name = acc.get('Name', '')
    if 'جرد' in name and 'اكسسوارات' not in name:
        jard_accounts.add(acc['AccountId'])

# Bill info
bill_acc = {b.get('BillId'): b.get('AccountId', 0) for b in bills}

print("="*60)
print("  PURCHASE-BASED INVENTORY")
print("  (فقط فواتير الشراء)")
print("="*60)

# Build inventory from PURCHASES ONLY
inventory = defaultdict(lambda: {
    'name': '',
    'purchased_qty': 0,
    'purchase_cost': 0,
    'avg_buy_price': 0,
    'sold_qty': 0,
    'sold_revenue': 0
})

# Step 1: Process PURCHASES (OperationsType = 9)
print("\nStep 1: Processing purchases...")
for bi in bill_items:
    if bi.get('OperationsType') == 9:  # Purchase
        item_id = bi.get('ItemId')
        qty = float(bi.get('Number', 0) or 0)
        price = float(bi.get('SinglePrice', 0) or 0)
        
        if item_id and qty > 0:
            inventory[item_id]['name'] = item_names.get(item_id, '')
            inventory[item_id]['purchased_qty'] += qty
            inventory[item_id]['purchase_cost'] += qty * price

# Calculate average buy price
for item_id, data in inventory.items():
    if data['purchased_qty'] > 0:
        data['avg_buy_price'] = data['purchase_cost'] / data['purchased_qty']

# Step 2: Process SALES (only real sales, not جرد)
print("Step 2: Processing sales (excluding جرد errors)...")
for bi in bill_items:
    if bi.get('OperationsType') == 2:  # Sale
        bill_id = bi.get('BillId')
        item_id = bi.get('ItemId')
        qty = float(bi.get('Number', 0) or 0)
        price = float(bi.get('SinglePrice', 0) or 0)
        
        # Skip if جرد account
        if bill_acc.get(bill_id, 0) in jard_accounts:
            continue
        
        if item_id and qty > 0 and item_id in inventory:
            # Only count sales up to purchased quantity
            available = inventory[item_id]['purchased_qty'] - inventory[item_id]['sold_qty']
            actual_sold = min(qty, available) if available > 0 else 0
            
            inventory[item_id]['sold_qty'] += actual_sold
            inventory[item_id]['sold_revenue'] += actual_sold * price

# Step 3: Calculate results
print("Step 3: Calculating results...")

total_purchase_cost = 0
total_sold_qty = 0
total_revenue = 0
total_cogs = 0
total_profit = 0
total_remaining_qty = 0
total_remaining_value = 0

item_results = []

for item_id, data in inventory.items():
    if data['purchased_qty'] > 0:
        remaining = data['purchased_qty'] - data['sold_qty']
        cogs = data['sold_qty'] * data['avg_buy_price']
        profit = data['sold_revenue'] - cogs
        remaining_value = remaining * data['avg_buy_price']
        
        total_purchase_cost += data['purchase_cost']
        total_sold_qty += data['sold_qty']
        total_revenue += data['sold_revenue']
        total_cogs += cogs
        total_profit += profit
        total_remaining_qty += remaining
        total_remaining_value += remaining_value
        
        if data['sold_qty'] > 0:
            item_results.append({
                'name': data['name'],
                'purchased': data['purchased_qty'],
                'sold': data['sold_qty'],
                'remaining': remaining,
                'revenue': data['sold_revenue'],
                'cogs': cogs,
                'profit': profit
            })

# Sort by profit
item_results.sort(key=lambda x: x['profit'], reverse=True)

print(f"\nItems with purchases: {len(inventory)}")
print(f"Items with sales: {len(item_results)}")

# Display top items
print("\n" + "="*60)
print("  TOP 15 BY PROFIT")
print("="*60 + "\n")

print(f"{'Item':<40} {'Buy':>6} {'Sell':>6} {'Left':>6} {'Profit':>14}")
print("-" * 80)

for item in item_results[:15]:
    name = item['name'][:38] if item['name'] else '?'
    print(f"{name:<40} {item['purchased']:>6.0f} {item['sold']:>6.0f} {item['remaining']:>6.0f} {item['profit']:>14,.0f}")

# Summary
print("\n" + "="*60)
print("  SUMMARY")
print("="*60)

total_purchased_qty = sum(d['purchased_qty'] for d in inventory.values())

print(f"""
  QUANTITIES (based on purchase invoices):
    Total Purchased:      {total_purchased_qty:>12,.0f} items
    Total Sold:           {total_sold_qty:>12,.0f} items
    Remaining Stock:      {total_remaining_qty:>12,.0f} items
    
  FINANCIALS:
    Purchase Cost:        {total_purchase_cost:>12,.0f} IQD
    Sales Revenue:        {total_revenue:>12,.0f} IQD
    Cost of Goods Sold:   {total_cogs:>12,.0f} IQD
    ──────────────────────────────────────
    GROSS PROFIT:         {total_profit:>12,.0f} IQD
    
    Inventory Value:      {total_remaining_value:>12,.0f} IQD
""")

if total_revenue > 0:
    margin = (total_profit / total_revenue) * 100
    print(f"    Profit Margin:        {margin:>12.1f}%")

print("\n" + "="*60)
print("  FINAL RESULT")
print("="*60)

print(f"""
  ╔════════════════════════════════════════════════════╗
  ║                                                    ║
  ║   إجمالي الربح:      {total_profit:>14,.0f} د.ع       ║
  ║                                                    ║
  ║   قيمة المخزون:      {total_remaining_value:>14,.0f} د.ع       ║
  ║                                                    ║
  ║   ─────────────────────────────────────────────    ║
  ║                                                    ║
  ║   المجموع:           {total_profit + total_remaining_value:>14,.0f} د.ع       ║
  ║                                                    ║
  ╚════════════════════════════════════════════════════╝
""")
