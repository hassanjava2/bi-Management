import requests, json, sys

base = "https://erp.biiraq.com"

print("=== LOGIN ===")
r = requests.post(f"{base}/api/auth/login", json={"email": "admin@bi-erp.local", "password": "Admin@123"}, timeout=15)
print(f"Status: {r.status_code}")
data = r.json()
success = data.get("success")
print(f"Success: {success}")

if r.status_code != 200 or not success:
    print(f"Login failed: {json.dumps(data, ensure_ascii=False)}")
    sys.exit(1)

token = data["data"]["token"]
user = data["data"]["user"]
uname = user.get("full_name", "?")
urole = user.get("role", "?")
print(f"User: {uname} ({urole})")
headers = {"Authorization": f"Bearer {token}"}

endpoints = [
    ("/api/dashboard/stats", "Dashboard"),
    ("/api/inventory/devices", "Inventory Devices"),
    ("/api/inventory/stats", "Inventory Stats"),
    ("/api/invoices", "Invoices"),
    ("/api/invoices/stats", "Invoice Stats"),
    ("/api/customers", "Customers"),
    ("/api/suppliers", "Suppliers"),
    ("/api/products", "Products"),
    ("/api/accounting/overview", "Accounting"),
    ("/api/returns", "Returns"),
    ("/api/returns/stats", "Return Stats"),
    ("/api/tasks", "Tasks"),
    ("/api/attendance/today", "Attendance"),
    ("/api/approvals", "Approvals"),
    ("/api/delivery", "Delivery"),
    ("/api/warranty", "Warranty"),
    ("/api/notifications", "Notifications"),
    ("/api/permissions/roles", "Roles"),
    ("/api/audit", "Audit"),
    ("/api/settings", "Settings"),
    ("/api/users", "Users"),
    ("/api/goals", "Goals"),
    ("/api/training", "Training"),
    ("/api/shares", "Shares"),
    ("/api/fixed-assets", "Fixed Assets"),
    ("/api/bot/stats", "Bot Stats"),
]

print("\n=== API ENDPOINTS ===")
ok = 0
fail = 0
errors = []
for ep, name in endpoints:
    try:
        r2 = requests.get(f"{base}{ep}", headers=headers, timeout=10)
        status = r2.status_code
        body = r2.text[:150]
        if status == 200:
            ok += 1
            print(f"  OK  [{status}] {name}")
        else:
            fail += 1
            errors.append((name, status, body))
            print(f"  FAIL [{status}] {name}: {body}")
    except Exception as e:
        fail += 1
        errors.append((name, 0, str(e)))
        print(f"  ERR  {name}: {e}")

print(f"\n=== SUMMARY ===")
print(f"Total: {ok} OK, {fail} FAIL out of {len(endpoints)}")

if errors:
    print(f"\n=== ERRORS ===")
    for name, status, body in errors:
        print(f"  [{status}] {name}: {body[:200]}")
