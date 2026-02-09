"""
Add Goals tables to bi_management database
"""
import sqlite3
import os

db_path = 'data/bi_management.db'
if not os.path.exists(db_path):
    print(f"Database not found: {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("[*] Adding Goals tables...")

# Add columns to users table
try:
    cursor.execute("ALTER TABLE users ADD COLUMN total_points INTEGER DEFAULT 0")
    print("[+] Added total_points column to users")
except sqlite3.OperationalError as e:
    if "duplicate column" in str(e).lower():
        print("[*] total_points column already exists")
    else:
        print(f"[!] Error: {e}")

try:
    cursor.execute("ALTER TABLE users ADD COLUMN monthly_points INTEGER DEFAULT 0")
    print("[+] Added monthly_points column to users")
except sqlite3.OperationalError as e:
    if "duplicate column" in str(e).lower():
        print("[*] monthly_points column already exists")
    else:
        print(f"[!] Error: {e}")

try:
    cursor.execute("ALTER TABLE users ADD COLUMN current_level INTEGER DEFAULT 1")
    print("[+] Added current_level column to users")
except sqlite3.OperationalError as e:
    if "duplicate column" in str(e).lower():
        print("[*] current_level column already exists")
    else:
        print(f"[!] Error: {e}")

# Create point_transactions table
cursor.execute("""
    CREATE TABLE IF NOT EXISTS point_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        points INTEGER NOT NULL,
        reason TEXT NOT NULL,
        description TEXT,
        admin_note TEXT,
        reference_type TEXT,
        reference_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
""")
print("[+] Created point_transactions table")

# Create rewards table
cursor.execute("""
    CREATE TABLE IF NOT EXISTS rewards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_en TEXT,
        description TEXT,
        icon TEXT DEFAULT '???',
        points_required INTEGER NOT NULL,
        quantity INTEGER,
        category TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
print("[+] Created rewards table")

# Create reward_redemptions table
cursor.execute("""
    CREATE TABLE IF NOT EXISTS reward_redemptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        reward_id TEXT NOT NULL,
        points_spent INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'delivered', 'rejected')),
        admin_note TEXT,
        processed_by TEXT,
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (reward_id) REFERENCES rewards(id),
        FOREIGN KEY (processed_by) REFERENCES users(id)
    )
""")
print("[+] Created reward_redemptions table")

# Create monthly_points_archive table
cursor.execute("""
    CREATE TABLE IF NOT EXISTS monthly_points_archive (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        month TEXT NOT NULL,
        year TEXT NOT NULL,
        points INTEGER NOT NULL,
        rank INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, month, year)
    )
""")
print("[+] Created monthly_points_archive table")

# Create user_badges table
cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_badges (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        badge_id TEXT NOT NULL,
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, badge_id)
    )
""")
print("[+] Created user_badges table")

# Create indexes
cursor.execute("CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_point_transactions_date ON point_transactions(created_at)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user ON reward_redemptions(user_id)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON reward_redemptions(status)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_monthly_archive_user ON monthly_points_archive(user_id)")
print("[+] Created indexes")

# Insert sample rewards
rewards = [
    ('reward_1', 'Day Off', 'Extra day off', '????', 500, None, 'time_off'),
    ('reward_2', 'Shopping Voucher', '50,000 IQD voucher', '????', 300, None, 'voucher'),
    ('reward_3', 'Free Lunch', 'Free lunch meal', '????', 100, None, 'food'),
    ('reward_4', 'VIP Parking', 'VIP parking for a month', '????', 400, None, 'perk'),
    ('reward_5', 'Early Leave', 'Leave 1 hour early', '???', 150, None, 'time_off'),
    ('reward_6', 'Certificate', 'Achievement certificate', '????', 200, None, 'recognition'),
    ('reward_7', 'Mystery Gift', 'Mystery gift from management', '????', 250, None, 'gift'),
]

for r in rewards:
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO rewards (id, name, description, icon, points_required, quantity, category)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, r)
    except Exception as e:
        print(f"[!] Error inserting reward {r[0]}: {e}")

print("[+] Inserted sample rewards")

# Give admin user some initial points
cursor.execute("UPDATE users SET total_points = 100, monthly_points = 100, current_level = 2 WHERE email = 'admin@bi-company.com'")
print("[+] Updated admin with initial points")

conn.commit()
conn.close()

print("\n[+] Goals schema added successfully!")
