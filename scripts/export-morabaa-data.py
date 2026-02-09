# -*- coding: utf-8 -*-
"""
Bi Management - Export Morabaa Data
Exports all data from SQL Server to JSON files
"""

import pyodbc
import json
import os
import sys
from datetime import datetime, date
from decimal import Decimal

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Connection settings
SERVER = r'.\MORABSQL2014'
DATABASE = 'MorabaaDB'

# Output directory
OUTPUT_DIR = r'D:\bi Management\data\morabaa-export'

def get_connection():
    """Connect to database"""
    conn_str = f'DRIVER={{SQL Server}};SERVER={SERVER};DATABASE={DATABASE};Trusted_Connection=yes;'
    return pyodbc.connect(conn_str)

def json_serializer(obj):
    """Convert special types to JSON"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, bytes):
        return obj.hex()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

def get_all_tables(cursor):
    """Get list of all tables"""
    cursor.execute("""
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE='BASE TABLE'
        ORDER BY TABLE_NAME
    """)
    return [row[0] for row in cursor.fetchall()]

def export_table(cursor, table_name, output_dir):
    """Export a single table to JSON"""
    try:
        # الحصول على أسماء الأعمدة
        cursor.execute(f"SELECT TOP 0 * FROM [{table_name}]")
        columns = [desc[0] for desc in cursor.description]
        
        # الحصول على البيانات
        cursor.execute(f"SELECT * FROM [{table_name}]")
        rows = cursor.fetchall()
        
        # تحويل لـ list of dicts
        data = []
        for row in rows:
            row_dict = {}
            for i, col in enumerate(columns):
                row_dict[col] = row[i]
            data.append(row_dict)
        
        # حفظ الملف
        output_file = os.path.join(output_dir, f"{table_name}.json")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({
                'table': table_name,
                'columns': columns,
                'count': len(data),
                'exported_at': datetime.now().isoformat(),
                'data': data
            }, f, ensure_ascii=False, indent=2, default=json_serializer)
        
        return len(data)
    except Exception as e:
        print(f"  [ERROR] {table_name}: {e}")
        return -1

def main():
    print("=" * 60)
    print("  Bi Management - Morabaa Data Export")
    print("=" * 60)
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Connect
    print(f"\n[*] Connecting to {SERVER}...")
    conn = get_connection()
    cursor = conn.cursor()
    print("[OK] Connected successfully!")
    
    # Get tables
    tables = get_all_tables(cursor)
    print(f"\n[*] Tables found: {len(tables)}")
    
    # Export each table
    print("\n[*] Starting export...")
    results = {}
    total_records = 0
    
    for i, table in enumerate(tables, 1):
        count = export_table(cursor, table, OUTPUT_DIR)
        if count >= 0:
            results[table] = count
            total_records += count
            print(f"  [{i}/{len(tables)}] {table}: {count:,} records")
        else:
            results[table] = 'ERROR'
    
    # Save summary
    summary = {
        'export_date': datetime.now().isoformat(),
        'server': SERVER,
        'database': DATABASE,
        'total_tables': len(tables),
        'total_records': total_records,
        'tables': results
    }
    
    summary_file = os.path.join(OUTPUT_DIR, '_SUMMARY.json')
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print("\n" + "=" * 60)
    print(f"  Export Complete!")
    print(f"  Tables: {len(tables)}")
    print(f"  Records: {total_records:,}")
    print(f"  Output: {OUTPUT_DIR}")
    print("=" * 60)
    
    cursor.close()
    conn.close()

if __name__ == '__main__':
    main()
