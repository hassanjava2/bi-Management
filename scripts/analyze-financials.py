# -*- coding: utf-8 -*-
"""
Bi Management - Financial Analysis
Analyzes profits, expenses, and financial data from Morabaa export
"""

import json
import os
import sys
from datetime import datetime
from collections import defaultdict

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

DATA_DIR = r'D:\bi Management\data\morabaa-export'

def load_json(filename):
    """Load a JSON file from the export directory"""
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def format_currency(amount, currency='IQD'):
    """Format amount as currency"""
    if amount is None:
        return "0"
    return f"{amount:,.0f}"

def analyze_bills():
    """Analyze bills/invoices"""
    print("\n" + "="*70)
    print("  BILLS ANALYSIS (Invoices)")
    print("="*70)
    
    bills = load_json('Bills.json')['data']
    
    # Operation Types:
    # 2 = Sale, 9 = Purchase, 11 = Sale Return, 12 = Purchase Return, 18 = Other
    op_names = {
        2: 'Sale (Biy3)',
        9: 'Purchase (Shira)',
        11: 'Sale Return (Raj3 Biy3)',
        12: 'Purchase Return (Raj3 Shira)',
        18: 'Other'
    }
    
    op_stats = defaultdict(lambda: {
        'count': 0, 
        'total': 0, 
        'paid': 0, 
        'remain': 0,
        'discount': 0
    })
    
    monthly_sales = defaultdict(float)
    monthly_purchases = defaultdict(float)
    
    for bill in bills:
        op = bill.get('OperationType', 0)
        amount1 = float(bill.get('BillAmount1', 0) or 0)
        paid1 = float(bill.get('Paid1', 0) or 0)
        remain1 = float(bill.get('Remain1', 0) or 0)
        discount1 = float(bill.get('Discount1', 0) or 0)
        
        op_stats[op]['count'] += 1
        op_stats[op]['total'] += amount1
        op_stats[op]['paid'] += paid1
        op_stats[op]['remain'] += remain1
        op_stats[op]['discount'] += discount1
        
        # Monthly analysis
        date_str = bill.get('Date', '')
        if date_str:
            try:
                date = datetime.fromisoformat(date_str.split('.')[0])
                month_key = date.strftime('%Y-%m')
                if op == 2:  # Sales
                    monthly_sales[month_key] += amount1
                elif op == 9:  # Purchases
                    monthly_purchases[month_key] += amount1
            except:
                pass
    
    print("\n--- By Operation Type ---\n")
    print(f"{'Type':<25} {'Count':>8} {'Total Amount':>18} {'Paid':>18} {'Remaining':>18}")
    print("-" * 90)
    
    total_sales = 0
    total_purchases = 0
    total_remaining = 0
    
    for op in sorted(op_stats.keys()):
        data = op_stats[op]
        name = op_names.get(op, f'Type {op}')
        print(f"{name:<25} {data['count']:>8} {data['total']:>18,.0f} {data['paid']:>18,.0f} {data['remain']:>18,.0f}")
        
        if op == 2:
            total_sales = data['total']
        elif op == 9:
            total_purchases = data['total']
        total_remaining += data['remain']
    
    print("-" * 90)
    print(f"{'TOTAL':<25} {len(bills):>8}")
    
    # Monthly Sales Report
    print("\n--- Monthly Sales (Last 6 months) ---\n")
    sorted_months = sorted(monthly_sales.keys(), reverse=True)[:6]
    for month in sorted_months:
        sales = monthly_sales.get(month, 0)
        purchases = monthly_purchases.get(month, 0)
        profit = sales - purchases
        margin = (profit / sales * 100) if sales > 0 else 0
        print(f"  {month}: Sales={format_currency(sales):>15} | Purchases={format_currency(purchases):>15} | Gross={format_currency(profit):>15} ({margin:.1f}%)")
    
    return {
        'total_sales': total_sales,
        'total_purchases': total_purchases,
        'total_remaining': total_remaining,
        'sales_count': op_stats[2]['count'],
        'purchase_count': op_stats[9]['count']
    }

def analyze_bonds():
    """Analyze bonds (receipts/payments)"""
    print("\n" + "="*70)
    print("  BONDS ANALYSIS (Receipts & Payments)")
    print("="*70)
    
    bonds = load_json('Bonds.json')['data']
    
    # Bond types analysis
    total_receipts = 0  # Money received
    total_payments = 0  # Money paid
    
    for bond in bonds:
        amount = float(bond.get('Amount', 0) or 0)
        bond_type = bond.get('BondType', 0)
        
        # Assuming: 1 = Receipt, 2 = Payment (common pattern)
        if bond_type == 1:
            total_receipts += amount
        elif bond_type == 2:
            total_payments += amount
    
    print(f"\n  Total Bonds: {len(bonds)}")
    print(f"  Receipts (Qabd): {format_currency(total_receipts)} IQD")
    print(f"  Payments (Daf3): {format_currency(total_payments)} IQD")
    
    return {
        'total_bonds': len(bonds),
        'receipts': total_receipts,
        'payments': total_payments
    }

def analyze_items():
    """Analyze items/products for profit margins"""
    print("\n" + "="*70)
    print("  ITEMS ANALYSIS (Products & Profit Margins)")
    print("="*70)
    
    items = load_json('Items.json')['data']
    quantities = load_json('Quantities.json')['data']
    
    # Create quantity lookup
    qty_lookup = {q['ItemId']: q.get('Quantity', 0) for q in quantities if 'ItemId' in q}
    
    total_buy_value = 0
    total_sell_value = 0
    items_with_stock = 0
    items_with_profit = []
    
    for item in items:
        if item.get('Deleted'):
            continue
            
        item_id = item.get('Id', 0)
        buy_price = float(item.get('BuyPrice', 0) or 0)
        sell_price = float(item.get('SalePrice1', 0) or 0)
        qty = qty_lookup.get(item_id, 0)
        profit_percent = float(item.get('profit1', 0) or 0)
        
        if qty and qty > 0:
            items_with_stock += 1
            total_buy_value += buy_price * qty
            total_sell_value += sell_price * qty
            
            if profit_percent > 0:
                items_with_profit.append({
                    'name': item.get('Name', ''),
                    'buy': buy_price,
                    'sell': sell_price,
                    'qty': qty,
                    'profit': profit_percent
                })
    
    # Sort by profit percentage
    items_with_profit.sort(key=lambda x: x['profit'], reverse=True)
    
    print(f"\n  Total Items: {len(items)}")
    print(f"  Items with Stock: {items_with_stock}")
    print(f"  Total Stock Value (Buy): {format_currency(total_buy_value)} IQD")
    print(f"  Total Stock Value (Sell): {format_currency(total_sell_value)} IQD")
    print(f"  Potential Profit: {format_currency(total_sell_value - total_buy_value)} IQD")
    
    if total_buy_value > 0:
        avg_margin = ((total_sell_value - total_buy_value) / total_buy_value) * 100
        print(f"  Average Margin: {avg_margin:.1f}%")
    
    # Top 10 highest margin items
    print("\n--- Top 10 Highest Profit Margin Items ---\n")
    for i, item in enumerate(items_with_profit[:10], 1):
        print(f"  {i}. {item['name'][:40]:<42} Buy: {format_currency(item['buy']):>12} | Sell: {format_currency(item['sell']):>12} | Margin: {item['profit']:.1f}%")
    
    return {
        'total_items': len(items),
        'items_with_stock': items_with_stock,
        'stock_buy_value': total_buy_value,
        'stock_sell_value': total_sell_value
    }

def analyze_accounts():
    """Analyze customer/supplier accounts"""
    print("\n" + "="*70)
    print("  ACCOUNTS ANALYSIS (Customers & Suppliers)")
    print("="*70)
    
    accounts = load_json('accounts.json')['data']
    account_types = load_json('accountTypes.json')['data']
    
    # Create type lookup
    type_lookup = {t['MainId']: t.get('Name', '') for t in account_types}
    
    # Categorize accounts
    customers = []
    suppliers = []
    others = []
    
    for acc in accounts:
        if acc.get('Deleted'):
            continue
        
        type_id = acc.get('AccountTypeId', 0)
        type_name = type_lookup.get(type_id, '')
        
        # Common patterns for suppliers
        if 'مورد' in type_name or 'تجهيز' in type_name or type_id in [1121, 1130]:
            suppliers.append(acc)
        # Common patterns for customers
        elif 'زبون' in type_name or 'عميل' in type_name or type_id in [3110, 3120]:
            customers.append(acc)
        else:
            others.append(acc)
    
    print(f"\n  Total Accounts: {len(accounts)}")
    print(f"  Suppliers: ~{len(suppliers)}")
    print(f"  Customers: ~{len(customers)}")
    print(f"  Other Accounts: {len(others)}")
    
    return {
        'total_accounts': len(accounts),
        'suppliers': len(suppliers),
        'customers': len(customers)
    }

def analyze_movements():
    """Analyze financial movements"""
    print("\n" + "="*70)
    print("  MOVEMENTS ANALYSIS (Financial Transactions)")
    print("="*70)
    
    movements = load_json('movments.json')['data']
    
    total_debit = 0
    total_credit = 0
    
    for mov in movements:
        debit = float(mov.get('Debit', 0) or 0)
        credit = float(mov.get('Credit', 0) or 0)
        total_debit += debit
        total_credit += credit
    
    print(f"\n  Total Movements: {len(movements)}")
    print(f"  Total Debit: {format_currency(total_debit)} IQD")
    print(f"  Total Credit: {format_currency(total_credit)} IQD")
    
    return {
        'total_movements': len(movements),
        'total_debit': total_debit,
        'total_credit': total_credit
    }

def main():
    print("\n" + "#"*70)
    print("#" + " "*68 + "#")
    print("#" + "  BI COMPANY - FINANCIAL ANALYSIS REPORT".center(68) + "#")
    print("#" + f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}".center(68) + "#")
    print("#" + " "*68 + "#")
    print("#"*70)
    
    # Run all analyses
    bills_data = analyze_bills()
    bonds_data = analyze_bonds()
    items_data = analyze_items()
    accounts_data = analyze_accounts()
    movements_data = analyze_movements()
    
    # Summary
    print("\n" + "="*70)
    print("  EXECUTIVE SUMMARY")
    print("="*70)
    
    print("\n  --- Key Metrics ---")
    print(f"  Total Sales: {format_currency(bills_data['total_sales'])} IQD ({bills_data['sales_count']} invoices)")
    print(f"  Total Purchases: {format_currency(bills_data['total_purchases'])} IQD ({bills_data['purchase_count']} invoices)")
    
    gross_profit = bills_data['total_sales'] - bills_data['total_purchases']
    if bills_data['total_sales'] > 0:
        gross_margin = (gross_profit / bills_data['total_sales']) * 100
    else:
        gross_margin = 0
    
    print(f"  Gross Profit: {format_currency(gross_profit)} IQD ({gross_margin:.1f}% margin)")
    print(f"  Outstanding Receivables: {format_currency(bills_data['total_remaining'])} IQD")
    
    print(f"\n  Stock Value (Cost): {format_currency(items_data['stock_buy_value'])} IQD")
    print(f"  Stock Value (Retail): {format_currency(items_data['stock_sell_value'])} IQD")
    
    print("\n" + "="*70)
    print("  END OF REPORT")
    print("="*70 + "\n")

if __name__ == '__main__':
    main()
