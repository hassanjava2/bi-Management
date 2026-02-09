# -*- coding: utf-8 -*-
"""
Check the جرد invoices in detail
"""
import json
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Load data
with open(r'D:\bi Management\data\morabaa-export\Bills.json', 'r', encoding='utf-8') as f:
    bills = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\accounts.json', 'r', encoding='utf-8') as f:
    accounts = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\BillItems.json', 'r', encoding='utf-8') as f:
    bill_items = json.load(f)['data']

with open(r'D:\bi Management\data\morabaa-export\Items.json', 'r', encoding='utf-8') as f:
    items = json.load(f)['data']

acc_lookup = {a['AccountId']: a.get('Name', '') for a in accounts}
item_lookup = {i['Id']: i.get('Name', '') for i in items}

# Find جرد accounts
jard_accounts = {}
for acc in accounts:
    name = acc.get('Name', '')
    if 'جرد' in name and 'اكسسوارات' not in name:
        jard_accounts[acc['AccountId']] = name
        print(f"Account: {name} (ID: {acc['AccountId']})")

print("\n" + "="*70)
print("  DETAILED JARD INVOICES")
print("="*70)

# Get all جرد bills
jard_bills = []
for bill in bills:
    acc_id = bill.get('AccountId', 0)
    if acc_id in jard_accounts:
        jard_bills.append(bill)

# Sort by date
jard_bills.sort(key=lambda x: x.get('Date', ''))

print(f"\nTotal جرد bills: {len(jard_bills)}")
print(f"\n{'#':<4} {'Date':<12} {'Account':<25} {'Amount':>18} {'Paid':>15} {'Bill#':<10}")
print("-" * 90)

total = 0
for i, bill in enumerate(jard_bills, 1):
    acc_name = jard_accounts.get(bill.get('AccountId', 0), '')[:23]
    amount = float(bill.get('BillAmount1', 0) or 0)
    paid = float(bill.get('Paid1', 0) or 0)
    date = str(bill.get('Date', ''))[:10]
    bill_num = bill.get('Number', '')
    total += amount
    
    print(f"{i:<4} {date:<12} {acc_name:<25} {amount:>18,.0f} {paid:>15,.0f} {bill_num:<10}")

print("-" * 90)
print(f"{'TOTAL':<42} {total:>18,.0f}")

# Check if these are the same items repeated
print("\n" + "="*70)
print("  CHECKING FOR DUPLICATES / SAME ITEMS")
print("="*70)

# Get bill IDs for jard
jard_bill_ids = [b.get('BillId') for b in jard_bills]

# Count items in these bills
item_counts = {}
for bi in bill_items:
    if bi.get('BillId') in jard_bill_ids:
        item_id = bi.get('ItemId')
        qty = float(bi.get('Quantity', 0) or 0)
        if item_id not in item_counts:
            item_counts[item_id] = 0
        item_counts[item_id] += qty

print(f"\nUnique items in جرد bills: {len(item_counts)}")

# Show sample items
print("\nSample items from جرد bills:")
for item_id, qty in list(item_counts.items())[:10]:
    name = item_lookup.get(item_id, 'Unknown')[:50]
    print(f"  - {name}: {qty:.0f} units")

# Check جرد شهر 12-2025 specifically
print("\n" + "="*70)
print("  جرد شهر 12-2025 - DETAILED CHECK")
print("="*70)

dec_jard_acc = None
for acc_id, name in jard_accounts.items():
    if '12-2025' in name:
        dec_jard_acc = acc_id
        break

if dec_jard_acc:
    dec_bills = [b for b in jard_bills if b.get('AccountId') == dec_jard_acc]
    print(f"\nNumber of bills: {len(dec_bills)}")
    
    dec_total = sum(float(b.get('BillAmount1', 0) or 0) for b in dec_bills)
    print(f"Total amount: {dec_total:,.0f} IQD")
    
    # Check if all bills have same/similar amounts
    amounts = [float(b.get('BillAmount1', 0) or 0) for b in dec_bills]
    print(f"\nAmount range: {min(amounts):,.0f} - {max(amounts):,.0f}")
    print(f"Average per bill: {sum(amounts)/len(amounts):,.0f}")
    
    # This looks like the same inventory counted multiple times!
    print("\n*** OBSERVATION ***")
    print(f"44 bills with similar amounts (~200M each) = inventory counted multiple times?")
