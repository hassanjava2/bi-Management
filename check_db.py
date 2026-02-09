import sqlite3
import os

db_path = 'data/bi_management.db'
if not os.path.exists(db_path):
    print(f"Database not found: {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [t[0] for t in cursor.fetchall()]
print("Tables in database:")
for t in tables:
    print(f"  - {t}")

# Check for goals-related tables
goals_tables = ['point_transactions', 'rewards', 'reward_redemptions', 'monthly_points_archive', 'user_badges']
print("\nGoals tables status:")
for gt in goals_tables:
    if gt in tables:
        print(f"  [+] {gt} exists")
    else:
        print(f"  [-] {gt} MISSING")

# Check users table for goals columns
cursor.execute("PRAGMA table_info(users)")
columns = [c[1] for c in cursor.fetchall()]
goals_columns = ['total_points', 'monthly_points', 'current_level']
print("\nGoals columns in users table:")
for gc in goals_columns:
    if gc in columns:
        print(f"  [+] {gc} exists")
    else:
        print(f"  [-] {gc} MISSING")

conn.close()
