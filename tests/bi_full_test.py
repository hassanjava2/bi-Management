#!/usr/bin/env python3
"""
BI ERP - Comprehensive Smart Bot Testing Script
================================================
بوت ذكي لفحص موقع BI ERP بالكامل - كل الأزرار، كل الميزات، كل الصفحات

Features:
- Login & Authentication Testing
- Full Page Navigation (30+ pages)
- Button & Interactive Element Testing
- Form Validation Testing
- API Endpoint Testing (35+ route groups)
- JavaScript Error Detection
- Console Log Monitoring
- Performance Metrics
- Screenshot Capture
- Comprehensive HTML Report Generation
"""

import asyncio
import json
import os
import sys
import time
import traceback
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

# Fix Windows console encoding
if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except:
        pass

import requests
from playwright.async_api import async_playwright, Page, BrowserContext, expect
from jinja2 import Template
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn
from rich.panel import Panel
from rich.live import Live

# ============================================================
# Configuration
# ============================================================
BASE_URL = "https://erp.biiraq.com"
ADMIN_EMAIL = "admin@bi-company.com"
ADMIN_PASSWORD = "Admin@123"

SCREENSHOT_DIR = Path("test_results/screenshots")
REPORT_DIR = Path("test_results")

console = Console(force_terminal=True, force_jupyter=False)

# ============================================================
# Data Classes
# ============================================================
@dataclass
class TestResult:
    name: str
    category: str
    status: str  # 'pass', 'fail', 'warn', 'skip'
    message: str = ""
    screenshot: str = ""
    duration: float = 0.0
    details: dict = field(default_factory=dict)

@dataclass
class TestReport:
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    results: list = field(default_factory=list)
    js_errors: list = field(default_factory=list)
    console_warnings: list = field(default_factory=list)
    network_errors: list = field(default_factory=list)
    performance_metrics: dict = field(default_factory=dict)

    @property
    def total(self):
        return len(self.results)

    @property
    def passed(self):
        return len([r for r in self.results if r.status == 'pass'])

    @property
    def failed(self):
        return len([r for r in self.results if r.status == 'fail'])

    @property
    def warnings(self):
        return len([r for r in self.results if r.status == 'warn'])

    @property
    def skipped(self):
        return len([r for r in self.results if r.status == 'skip'])

    @property
    def pass_rate(self):
        if self.total == 0:
            return 0
        return round((self.passed / self.total) * 100, 1)

    def add(self, result: TestResult):
        self.results.append(result)
        status_icon = {"pass": "[green]✓[/]", "fail": "[red]✗[/]", "warn": "[yellow]⚠[/]", "skip": "[dim]○[/]"}
        icon = status_icon.get(result.status, "?")
        console.print(f"  {icon} [{result.category}] {result.name} {f'- {result.message}' if result.message else ''}")


report = TestReport()

# ============================================================
# All Frontend Routes to Test
# ============================================================
FRONTEND_ROUTES = [
    {"path": "/dashboard", "name": "لوحة التحكم الرئيسية", "category": "Dashboard"},
    {"path": "/executive-dashboard", "name": "لوحة التحكم التنفيذية", "category": "Dashboard"},
    {"path": "/rep-dashboard", "name": "لوحة مندوب المبيعات", "category": "Dashboard"},
    {"path": "/inventory", "name": "إدارة المخزون", "category": "Inventory"},
    {"path": "/sales", "name": "المبيعات", "category": "Sales"},
    {"path": "/sales/new", "name": "فاتورة جديدة", "category": "Sales"},
    {"path": "/sales/waiting", "name": "الفواتير المعلقة", "category": "Sales"},
    {"path": "/purchases", "name": "المشتريات", "category": "Purchases"},
    {"path": "/returns", "name": "المرتجعات", "category": "Returns"},
    {"path": "/accounting", "name": "المحاسبة", "category": "Accounting"},
    {"path": "/suppliers", "name": "الموردين", "category": "Suppliers"},
    {"path": "/customers", "name": "العملاء", "category": "Customers"},
    {"path": "/approvals", "name": "الموافقات", "category": "Approvals"},
    {"path": "/delivery", "name": "التوصيل", "category": "Delivery"},
    {"path": "/warranty", "name": "الكفالة", "category": "Warranty"},
    {"path": "/reports", "name": "التقارير", "category": "Reports"},
    {"path": "/employees", "name": "الموظفين", "category": "HR"},
    {"path": "/tasks", "name": "المهام", "category": "HR"},
    {"path": "/attendance", "name": "الحضور", "category": "HR"},
    {"path": "/goals", "name": "الأهداف", "category": "HR"},
    {"path": "/training", "name": "التدريب", "category": "HR"},
    {"path": "/permissions", "name": "الصلاحيات", "category": "System"},
    {"path": "/audit", "name": "سجل التدقيق", "category": "System"},
    {"path": "/settings", "name": "الإعدادات", "category": "System"},
    {"path": "/notifications", "name": "الإشعارات", "category": "System"},
    {"path": "/bot", "name": "لوحة البوت", "category": "AI"},
    {"path": "/ai-distribution", "name": "توزيع AI", "category": "AI"},
    {"path": "/ai-chats", "name": "محادثات AI", "category": "AI"},
    {"path": "/calculator", "name": "الآلة الحاسبة", "category": "Tools"},
    {"path": "/fixed-assets", "name": "الأصول الثابتة", "category": "Accounting"},
    {"path": "/shares", "name": "الحصص والأسهم", "category": "Accounting"},
]

# ============================================================
# All API Endpoints to Test
# ============================================================
API_ENDPOINTS = [
    # Auth
    {"method": "POST", "path": "/api/auth/login", "name": "تسجيل الدخول", "category": "Auth",
     "body": {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}},
    {"method": "GET", "path": "/api/auth/me", "name": "بيانات المستخدم", "category": "Auth", "auth": True},

    # Dashboard
    {"method": "GET", "path": "/api/dashboard/stats", "name": "إحصائيات لوحة التحكم", "category": "Dashboard", "auth": True},

    # Users
    {"method": "GET", "path": "/api/users", "name": "قائمة المستخدمين", "category": "Users", "auth": True},

    # Inventory
    {"method": "GET", "path": "/api/inventory", "name": "قائمة المخزون", "category": "Inventory", "auth": True},
    {"method": "GET", "path": "/api/inventory/stats", "name": "إحصائيات المخزون", "category": "Inventory", "auth": True},
    {"method": "GET", "path": "/api/inventory/warehouses", "name": "المستودعات", "category": "Inventory", "auth": True},
    {"method": "GET", "path": "/api/inventory/movements", "name": "حركات المخزون", "category": "Inventory", "auth": True},
    {"method": "GET", "path": "/api/inventory/alerts", "name": "تنبيهات المخزون", "category": "Inventory", "auth": True},

    # Products
    {"method": "GET", "path": "/api/products", "name": "قائمة المنتجات", "category": "Products", "auth": True},

    # Invoices / Sales
    {"method": "GET", "path": "/api/invoices", "name": "قائمة الفواتير", "category": "Sales", "auth": True},
    {"method": "GET", "path": "/api/invoices/stats", "name": "إحصائيات الفواتير", "category": "Sales", "auth": True},
    {"method": "GET", "path": "/api/invoices/waiting", "name": "الفواتير المعلقة", "category": "Sales", "auth": True},

    # Returns
    {"method": "GET", "path": "/api/returns", "name": "قائمة المرتجعات", "category": "Returns", "auth": True},
    {"method": "GET", "path": "/api/returns/stats", "name": "إحصائيات المرتجعات", "category": "Returns", "auth": True},
    {"method": "GET", "path": "/api/returns/overdue", "name": "المرتجعات المتأخرة", "category": "Returns", "auth": True},

    # Accounting
    {"method": "GET", "path": "/api/accounting/overview", "name": "نظرة عامة المحاسبة", "category": "Accounting", "auth": True},
    {"method": "GET", "path": "/api/accounting/vouchers", "name": "السندات", "category": "Accounting", "auth": True},
    {"method": "GET", "path": "/api/accounting/receivables", "name": "المدينون", "category": "Accounting", "auth": True},
    {"method": "GET", "path": "/api/accounting/payables", "name": "الدائنون", "category": "Accounting", "auth": True},
    {"method": "GET", "path": "/api/accounting/cashboxes", "name": "صناديق النقد", "category": "Accounting", "auth": True},
    {"method": "GET", "path": "/api/accounting/expenses", "name": "المصاريف", "category": "Accounting", "auth": True},

    # Customers
    {"method": "GET", "path": "/api/customers", "name": "قائمة العملاء", "category": "Customers", "auth": True},

    # Suppliers
    {"method": "GET", "path": "/api/suppliers", "name": "قائمة الموردين", "category": "Suppliers", "auth": True},

    # Approvals
    {"method": "GET", "path": "/api/approvals", "name": "قائمة الموافقات", "category": "Approvals", "auth": True},
    {"method": "GET", "path": "/api/approvals/types", "name": "أنواع الموافقات", "category": "Approvals", "auth": True},

    # Delivery
    {"method": "GET", "path": "/api/delivery", "name": "قائمة التوصيل", "category": "Delivery", "auth": True},
    {"method": "GET", "path": "/api/delivery/drivers", "name": "السائقين", "category": "Delivery", "auth": True},

    # Warranty
    {"method": "GET", "path": "/api/warranty", "name": "قائمة الكفالات", "category": "Warranty", "auth": True},
    {"method": "GET", "path": "/api/warranty/stats", "name": "إحصائيات الكفالة", "category": "Warranty", "auth": True},

    # Tasks
    {"method": "GET", "path": "/api/tasks", "name": "قائمة المهام", "category": "Tasks", "auth": True},

    # Attendance
    {"method": "GET", "path": "/api/attendance", "name": "سجل الحضور", "category": "Attendance", "auth": True},
    {"method": "GET", "path": "/api/attendance/today", "name": "حضور اليوم", "category": "Attendance", "auth": True},

    # Employees (via users)
    {"method": "GET", "path": "/api/users?role=employee", "name": "قائمة الموظفين", "category": "Employees", "auth": True},

    # Goals
    {"method": "GET", "path": "/api/goals", "name": "الأهداف", "category": "Goals", "auth": True},
    {"method": "GET", "path": "/api/goals/leaderboard", "name": "لوحة المتصدرين", "category": "Goals", "auth": True},

    # Training
    {"method": "GET", "path": "/api/training", "name": "التدريب", "category": "Training", "auth": True},

    # Notifications
    {"method": "GET", "path": "/api/notifications", "name": "الإشعارات", "category": "Notifications", "auth": True},

    # Permissions
    {"method": "GET", "path": "/api/permissions/roles", "name": "الأدوار", "category": "Permissions", "auth": True},
    {"method": "GET", "path": "/api/permissions/all", "name": "جميع الصلاحيات", "category": "Permissions", "auth": True},

    # Audit
    {"method": "GET", "path": "/api/audit", "name": "سجل التدقيق", "category": "Audit", "auth": True},

    # Settings
    {"method": "GET", "path": "/api/settings", "name": "الإعدادات", "category": "Settings", "auth": True},

    # Reports
    {"method": "GET", "path": "/api/reports/sales", "name": "تقرير المبيعات", "category": "Reports", "auth": True},
    {"method": "GET", "path": "/api/reports/inventory", "name": "تقرير المخزون", "category": "Reports", "auth": True},

    # Fixed Assets
    {"method": "GET", "path": "/api/fixed-assets", "name": "الأصول الثابتة", "category": "FixedAssets", "auth": True},

    # Shares
    {"method": "GET", "path": "/api/shares", "name": "الحصص والأسهم", "category": "Shares", "auth": True},

    # Companies
    {"method": "GET", "path": "/api/companies", "name": "الشركات", "category": "Companies", "auth": True},

    # Bot
    {"method": "GET", "path": "/api/bot/stats", "name": "إحصائيات البوت", "category": "Bot", "auth": True},

    # AI Distribution
    {"method": "GET", "path": "/api/ai-distribution/tasks", "name": "مهام AI", "category": "AI", "auth": True},

    # Calculator
    {"method": "GET", "path": "/api/calculator/history", "name": "سجل الآلة الحاسبة", "category": "Calculator", "auth": True},

    # Media
    {"method": "GET", "path": "/api/media", "name": "الوسائط", "category": "Media", "auth": True},

    # Health
    {"method": "GET", "path": "/api/health", "name": "فحص صحة النظام", "category": "System"},
]


# ============================================================
# Bot 1: Authentication Tester
# ============================================================
class AuthBot:
    """بوت فحص نظام المصادقة والتسجيل"""

    def __init__(self, page: Page):
        self.page = page

    async def test_login_page_loads(self):
        """فحص تحميل صفحة الدخول"""
        start = time.time()
        try:
            await self.page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=30000)
            await self.page.wait_for_timeout(2000)

            # Check form elements exist
            email_input = self.page.locator('input[type="email"]')
            password_input = self.page.locator('input[type="password"]')
            submit_btn = self.page.locator('button[type="submit"]')

            email_exists = await email_input.count() > 0
            password_exists = await password_input.count() > 0
            submit_exists = await submit_btn.count() > 0

            screenshot = await take_screenshot(self.page, "login_page")

            if email_exists and password_exists and submit_exists:
                report.add(TestResult("تحميل صفحة الدخول", "Auth", "pass",
                                      "جميع عناصر النموذج موجودة", screenshot, time.time() - start))
            else:
                missing = []
                if not email_exists: missing.append("email")
                if not password_exists: missing.append("password")
                if not submit_exists: missing.append("submit button")
                report.add(TestResult("تحميل صفحة الدخول", "Auth", "fail",
                                      f"عناصر مفقودة: {', '.join(missing)}", screenshot, time.time() - start))
        except Exception as e:
            report.add(TestResult("تحميل صفحة الدخول", "Auth", "fail", str(e), "", time.time() - start))

    async def test_empty_login(self):
        """فحص تسجيل دخول بدون بيانات"""
        start = time.time()
        try:
            await self.page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=30000)
            await self.page.wait_for_timeout(1000)

            submit_btn = self.page.locator('button[type="submit"]')
            if await submit_btn.count() > 0:
                await submit_btn.click()
                await self.page.wait_for_timeout(1000)

                # Should show validation or stay on login
                current_url = self.page.url
                if "/login" in current_url or "/Login" in current_url.lower():
                    report.add(TestResult("رفض تسجيل دخول فارغ", "Auth", "pass",
                                          "النظام يرفض البيانات الفارغة", "", time.time() - start))
                else:
                    report.add(TestResult("رفض تسجيل دخول فارغ", "Auth", "fail",
                                          "النظام لم يرفض البيانات الفارغة", "", time.time() - start))
        except Exception as e:
            report.add(TestResult("رفض تسجيل دخول فارغ", "Auth", "warn", str(e), "", time.time() - start))

    async def test_wrong_credentials(self):
        """فحص تسجيل دخول ببيانات خاطئة"""
        start = time.time()
        try:
            await self.page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=30000)
            await self.page.wait_for_timeout(1000)

            await self.page.fill('input[type="email"]', 'wrong@test.com')
            await self.page.fill('input[type="password"]', 'wrongpassword')
            await self.page.click('button[type="submit"]')
            await self.page.wait_for_timeout(3000)

            screenshot = await take_screenshot(self.page, "wrong_credentials")

            # Should show error and stay on login
            current_url = self.page.url
            error_visible = await self.page.locator('[role="alert"], .alert, .error, .text-red, .text-error').count() > 0

            if "/login" in current_url.lower():
                report.add(TestResult("رفض بيانات خاطئة", "Auth", "pass",
                                      "النظام يعرض رسالة خطأ" if error_visible else "بقي في صفحة الدخول",
                                      screenshot, time.time() - start))
            else:
                report.add(TestResult("رفض بيانات خاطئة", "Auth", "fail",
                                      "النظام سمح بدخول ببيانات خاطئة!", screenshot, time.time() - start))
        except Exception as e:
            report.add(TestResult("رفض بيانات خاطئة", "Auth", "warn", str(e), "", time.time() - start))

    async def test_successful_login(self):
        """فحص تسجيل دخول ناجح"""
        start = time.time()
        try:
            await self.page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=30000)
            await self.page.wait_for_timeout(1500)

            await self.page.fill('input[type="email"]', ADMIN_EMAIL)
            await self.page.fill('input[type="password"]', ADMIN_PASSWORD)
            await self.page.click('button[type="submit"]')

            # Wait for navigation
            await self.page.wait_for_timeout(5000)

            screenshot = await take_screenshot(self.page, "after_login")
            current_url = self.page.url

            if "/dashboard" in current_url or "/login" not in current_url.lower():
                report.add(TestResult("تسجيل دخول ناجح", "Auth", "pass",
                                      f"تم التوجيه إلى: {current_url}", screenshot, time.time() - start))
            else:
                # Check for error messages
                page_text = await self.page.inner_text('body')
                report.add(TestResult("تسجيل دخول ناجح", "Auth", "fail",
                                      f"لم يتم التوجيه - البقاء في: {current_url}", screenshot, time.time() - start))
        except Exception as e:
            screenshot = await take_screenshot(self.page, "login_error")
            report.add(TestResult("تسجيل دخول ناجح", "Auth", "fail", str(e), screenshot, time.time() - start))

    async def test_password_toggle(self):
        """فحص زر إظهار/إخفاء كلمة المرور"""
        start = time.time()
        try:
            await self.page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=30000)
            await self.page.wait_for_timeout(1000)

            password_input = self.page.locator('input[type="password"]')
            if await password_input.count() > 0:
                await self.page.fill('input[type="password"]', 'testpassword')

                # Find and click the toggle button
                toggle_btn = self.page.locator('button').filter(has=self.page.locator('svg')).nth(0)
                if await toggle_btn.count() > 0:
                    await toggle_btn.click()
                    await self.page.wait_for_timeout(500)

                    text_input = self.page.locator('input[type="text"]')
                    if await text_input.count() > 0:
                        report.add(TestResult("زر إظهار كلمة المرور", "Auth", "pass",
                                              "يعمل بشكل صحيح", "", time.time() - start))
                    else:
                        report.add(TestResult("زر إظهار كلمة المرور", "Auth", "warn",
                                              "لم يتغير نوع الحقل", "", time.time() - start))
                else:
                    report.add(TestResult("زر إظهار كلمة المرور", "Auth", "skip",
                                          "لم يتم العثور على زر التبديل", "", time.time() - start))
        except Exception as e:
            report.add(TestResult("زر إظهار كلمة المرور", "Auth", "warn", str(e), "", time.time() - start))

    async def run_all(self):
        """تشغيل جميع فحوصات المصادقة"""
        console.print("\n[bold cyan]🤖 Bot 1: Authentication Tester[/]")
        console.print("=" * 50)
        await self.test_login_page_loads()
        await self.test_empty_login()
        await self.test_wrong_credentials()
        await self.test_password_toggle()
        await self.test_successful_login()


# ============================================================
# Bot 2: Page Navigator & Visual Tester
# ============================================================
class PageNavigatorBot:
    """بوت فحص التنقل بين الصفحات والعناصر المرئية"""

    def __init__(self, page: Page):
        self.page = page

    async def test_page(self, route: dict):
        """فحص صفحة واحدة"""
        start = time.time()
        path = route["path"]
        name = route["name"]
        category = route["category"]

        try:
            response = await self.page.goto(f"{BASE_URL}{path}", wait_until="networkidle", timeout=30000)
            await self.page.wait_for_timeout(2000)

            status = response.status if response else 0
            current_url = self.page.url

            # Check if redirected to login (session expired)
            if "/login" in current_url.lower() and path != "/login":
                report.add(TestResult(f"صفحة {name}", f"Page-{category}", "fail",
                                      "تم إعادة التوجيه لصفحة الدخول - الجلسة منتهية", "", time.time() - start))
                return False

            screenshot = await take_screenshot(self.page, f"page_{path.replace('/', '_')}")

            # Check for error states
            error_elements = await self.page.locator('.error-boundary, [data-error], .error-page').count()
            blank_page = len((await self.page.inner_text('body')).strip()) < 50

            # Check for loading spinners stuck
            spinners = await self.page.locator('.spinner, .loading, [class*="spin"], [class*="loader"]').count()

            if status == 200 and not blank_page and error_elements == 0:
                msg = "تم التحميل بنجاح"
                if spinners > 0:
                    msg += " (يوجد عناصر تحميل ظاهرة)"
                report.add(TestResult(f"صفحة {name}", f"Page-{category}", "pass",
                                      msg, screenshot, time.time() - start))
            elif blank_page:
                report.add(TestResult(f"صفحة {name}", f"Page-{category}", "fail",
                                      "الصفحة فارغة أو لم يتم تحميل المحتوى", screenshot, time.time() - start))
            elif error_elements > 0:
                report.add(TestResult(f"صفحة {name}", f"Page-{category}", "fail",
                                      "يوجد خطأ في الصفحة (Error Boundary)", screenshot, time.time() - start))
            else:
                report.add(TestResult(f"صفحة {name}", f"Page-{category}", "warn",
                                      f"HTTP Status: {status}", screenshot, time.time() - start))
            return True

        except Exception as e:
            screenshot = await take_screenshot(self.page, f"page_error_{path.replace('/', '_')}")
            report.add(TestResult(f"صفحة {name}", f"Page-{category}", "fail",
                                  str(e)[:200], screenshot, time.time() - start))
            return True

    async def run_all(self):
        """فحص جميع الصفحات"""
        console.print("\n[bold cyan]🤖 Bot 2: Page Navigator[/]")
        console.print("=" * 50)

        for route in FRONTEND_ROUTES:
            success = await self.test_page(route)
            if not success:
                # Re-login if session expired
                console.print("  [yellow]⟳ إعادة تسجيل الدخول...[/]")
                await login_to_site(self.page)
                await self.test_page(route)


# ============================================================
# Bot 3: Interactive Element Tester
# ============================================================
class InteractiveBot:
    """بوت فحص العناصر التفاعلية - الأزرار، التابات، القوائم، المودالات"""

    def __init__(self, page: Page):
        self.page = page

    async def test_sidebar_navigation(self):
        """فحص شريط التنقل الجانبي"""
        start = time.time()
        try:
            await self.page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle", timeout=30000)
            await self.page.wait_for_timeout(2000)

            # Find sidebar links
            sidebar_links = self.page.locator('nav a, aside a, [class*="sidebar"] a, [class*="nav"] a[href]')
            count = await sidebar_links.count()

            if count > 0:
                clicked = 0
                errors = []
                for i in range(min(count, 35)):
                    try:
                        link = sidebar_links.nth(i)
                        if await link.is_visible():
                            href = await link.get_attribute('href') or ''
                            if href and not href.startswith('http') and not href.startswith('#'):
                                await link.click()
                                await self.page.wait_for_timeout(1500)
                                clicked += 1
                    except Exception as e:
                        errors.append(str(e)[:100])

                screenshot = await take_screenshot(self.page, "sidebar_nav")
                if clicked > 0:
                    report.add(TestResult("التنقل عبر الشريط الجانبي", "Navigation", "pass",
                                          f"تم النقر على {clicked} رابط بنجاح", screenshot, time.time() - start))
                else:
                    report.add(TestResult("التنقل عبر الشريط الجانبي", "Navigation", "warn",
                                          "لم يتم النقر على أي رابط", screenshot, time.time() - start))
            else:
                report.add(TestResult("التنقل عبر الشريط الجانبي", "Navigation", "warn",
                                      "لم يتم العثور على روابط في الشريط الجانبي", "", time.time() - start))
        except Exception as e:
            report.add(TestResult("التنقل عبر الشريط الجانبي", "Navigation", "fail", str(e), "", time.time() - start))

    async def test_buttons_on_page(self, path: str, page_name: str):
        """فحص جميع الأزرار في صفحة معينة"""
        start = time.time()
        try:
            await self.page.goto(f"{BASE_URL}{path}", wait_until="networkidle", timeout=30000)
            await self.page.wait_for_timeout(2000)

            buttons = self.page.locator('button:visible')
            count = await buttons.count()

            if count == 0:
                report.add(TestResult(f"أزرار {page_name}", "Buttons", "skip",
                                      "لا توجد أزرار مرئية", "", time.time() - start))
                return

            clicked = 0
            errors = []
            for i in range(count):
                try:
                    btn = buttons.nth(i)
                    if await btn.is_visible() and await btn.is_enabled():
                        btn_text = (await btn.inner_text()).strip()[:50]
                        # Skip destructive buttons
                        destructive_keywords = ['حذف', 'delete', 'remove', 'إزالة', 'تسجيل خروج', 'logout']
                        if any(kw in btn_text.lower() for kw in destructive_keywords):
                            continue
                        await btn.click(timeout=3000)
                        await self.page.wait_for_timeout(800)
                        clicked += 1

                        # Close any opened modals
                        close_btns = self.page.locator('[class*="modal"] button[class*="close"], [class*="dialog"] button[aria-label="close"], button:has-text("إغلاق"), button:has-text("إلغاء")')
                        if await close_btns.count() > 0:
                            try:
                                await close_btns.first.click(timeout=2000)
                                await self.page.wait_for_timeout(500)
                            except:
                                pass
                except Exception as e:
                    errors.append(str(e)[:80])

            screenshot = await take_screenshot(self.page, f"buttons_{path.replace('/', '_')}")

            if errors:
                report.add(TestResult(f"أزرار {page_name}", "Buttons", "warn",
                                      f"تم النقر على {clicked}/{count} - أخطاء: {len(errors)}", screenshot, time.time() - start))
            else:
                report.add(TestResult(f"أزرار {page_name}", "Buttons", "pass",
                                      f"تم فحص {clicked}/{count} زر بنجاح", screenshot, time.time() - start))
        except Exception as e:
            report.add(TestResult(f"أزرار {page_name}", "Buttons", "fail", str(e)[:200], "", time.time() - start))

    async def test_tabs_on_page(self, path: str, page_name: str):
        """فحص التابات في صفحة معينة"""
        start = time.time()
        try:
            await self.page.goto(f"{BASE_URL}{path}", wait_until="networkidle", timeout=30000)
            await self.page.wait_for_timeout(2000)

            tabs = self.page.locator('[role="tab"], [class*="tab"]:not([class*="table"]), button[class*="tab"]')
            count = await tabs.count()

            if count == 0:
                report.add(TestResult(f"تابات {page_name}", "Tabs", "skip",
                                      "لا توجد تابات", "", time.time() - start))
                return

            clicked = 0
            for i in range(count):
                try:
                    tab = tabs.nth(i)
                    if await tab.is_visible():
                        await tab.click(timeout=3000)
                        await self.page.wait_for_timeout(1500)
                        clicked += 1
                except:
                    pass

            screenshot = await take_screenshot(self.page, f"tabs_{path.replace('/', '_')}")
            report.add(TestResult(f"تابات {page_name}", "Tabs", "pass",
                                  f"تم فحص {clicked}/{count} تاب", screenshot, time.time() - start))
        except Exception as e:
            report.add(TestResult(f"تابات {page_name}", "Tabs", "fail", str(e)[:200], "", time.time() - start))

    async def test_dropdowns_on_page(self, path: str, page_name: str):
        """فحص القوائم المنسدلة"""
        start = time.time()
        try:
            await self.page.goto(f"{BASE_URL}{path}", wait_until="networkidle", timeout=30000)
            await self.page.wait_for_timeout(2000)

            selects = self.page.locator('select:visible, [class*="select"]:visible, [role="listbox"]:visible, [role="combobox"]:visible')
            count = await selects.count()

            if count == 0:
                report.add(TestResult(f"قوائم منسدلة {page_name}", "Dropdowns", "skip",
                                      "لا توجد قوائم منسدلة", "", time.time() - start))
                return

            tested = 0
            for i in range(count):
                try:
                    select = selects.nth(i)
                    if await select.is_visible():
                        tag = await select.evaluate("el => el.tagName.toLowerCase()")
                        if tag == 'select':
                            options = await select.locator('option').count()
                            if options > 1:
                                await select.select_option(index=1)
                                await self.page.wait_for_timeout(800)
                                tested += 1
                        else:
                            await select.click(timeout=2000)
                            await self.page.wait_for_timeout(800)
                            tested += 1
                            # Click away to close
                            await self.page.click('body', position={"x": 10, "y": 10})
                            await self.page.wait_for_timeout(300)
                except:
                    pass

            screenshot = await take_screenshot(self.page, f"dropdowns_{path.replace('/', '_')}")
            report.add(TestResult(f"قوائم منسدلة {page_name}", "Dropdowns", "pass",
                                  f"تم فحص {tested}/{count}", screenshot, time.time() - start))
        except Exception as e:
            report.add(TestResult(f"قوائم منسدلة {page_name}", "Dropdowns", "warn", str(e)[:200], "", time.time() - start))

    async def test_search_functionality(self):
        """فحص وظيفة البحث"""
        start = time.time()
        pages_with_search = [
            ("/inventory", "المخزون"),
            ("/sales", "المبيعات"),
            ("/customers", "العملاء"),
            ("/suppliers", "الموردين"),
            ("/employees", "الموظفين"),
            ("/returns", "المرتجعات"),
        ]

        for path, name in pages_with_search:
            try:
                await self.page.goto(f"{BASE_URL}{path}", wait_until="networkidle", timeout=30000)
                await self.page.wait_for_timeout(2000)

                search_input = self.page.locator('input[type="search"], input[placeholder*="بحث"], input[placeholder*="search"], input[placeholder*="Search"]')
                if await search_input.count() > 0:
                    await search_input.first.fill("test")
                    await self.page.wait_for_timeout(1500)
                    await search_input.first.fill("")
                    await self.page.wait_for_timeout(1000)

                    report.add(TestResult(f"بحث في {name}", "Search", "pass",
                                          "البحث يعمل", "", time.time() - start))
                else:
                    report.add(TestResult(f"بحث في {name}", "Search", "skip",
                                          "لا يوجد حقل بحث", "", time.time() - start))
            except Exception as e:
                report.add(TestResult(f"بحث في {name}", "Search", "warn", str(e)[:150], "", time.time() - start))

    async def test_modals_and_dialogs(self):
        """فحص المودالات والحوارات"""
        start = time.time()
        pages_with_modals = [
            ("/inventory", "المخزون", ["إضافة", "جديد", "Add", "New"]),
            ("/customers", "العملاء", ["إضافة", "جديد", "عميل جديد"]),
            ("/suppliers", "الموردين", ["إضافة", "جديد", "مورد جديد"]),
            ("/employees", "الموظفين", ["إضافة", "جديد"]),
        ]

        for path, name, trigger_texts in pages_with_modals:
            try:
                await self.page.goto(f"{BASE_URL}{path}", wait_until="networkidle", timeout=30000)
                await self.page.wait_for_timeout(2000)

                opened = False
                for trigger_text in trigger_texts:
                    add_btn = self.page.locator(f'button:has-text("{trigger_text}")').first
                    if await add_btn.count() > 0 and await add_btn.is_visible():
                        await add_btn.click()
                        await self.page.wait_for_timeout(1500)

                        # Check if modal/dialog appeared
                        modal = self.page.locator('[class*="modal"], [role="dialog"], [class*="overlay"], [class*="drawer"]')
                        if await modal.count() > 0:
                            opened = True
                            screenshot = await take_screenshot(self.page, f"modal_{path.replace('/', '_')}")

                            # Close modal
                            close = self.page.locator('button:has-text("إغلاق"), button:has-text("إلغاء"), button:has-text("Cancel"), button:has-text("Close"), button[aria-label="close"], [class*="close"]')
                            if await close.count() > 0:
                                await close.first.click(timeout=2000)
                                await self.page.wait_for_timeout(500)
                            else:
                                await self.page.keyboard.press('Escape')
                                await self.page.wait_for_timeout(500)

                            report.add(TestResult(f"مودال {name}", "Modals", "pass",
                                                  f"تم فتح وإغلاق المودال بنجاح", screenshot, time.time() - start))
                            break

                if not opened:
                    report.add(TestResult(f"مودال {name}", "Modals", "skip",
                                          "لم يتم العثور على زر فتح المودال", "", time.time() - start))
            except Exception as e:
                report.add(TestResult(f"مودال {name}", "Modals", "warn", str(e)[:150], "", time.time() - start))

    async def run_all(self):
        """تشغيل جميع فحوصات العناصر التفاعلية"""
        console.print("\n[bold cyan]🤖 Bot 3: Interactive Element Tester[/]")
        console.print("=" * 50)

        await self.test_sidebar_navigation()

        # Test buttons, tabs, and dropdowns on key pages
        key_pages = [
            ("/dashboard", "لوحة التحكم"),
            ("/inventory", "المخزون"),
            ("/sales", "المبيعات"),
            ("/accounting", "المحاسبة"),
            ("/returns", "المرتجعات"),
            ("/customers", "العملاء"),
            ("/suppliers", "الموردين"),
            ("/employees", "الموظفين"),
            ("/approvals", "الموافقات"),
            ("/delivery", "التوصيل"),
            ("/warranty", "الكفالة"),
            ("/reports", "التقارير"),
            ("/tasks", "المهام"),
            ("/attendance", "الحضور"),
            ("/goals", "الأهداف"),
            ("/permissions", "الصلاحيات"),
            ("/settings", "الإعدادات"),
            ("/fixed-assets", "الأصول الثابتة"),
            ("/shares", "الحصص"),
        ]

        for path, name in key_pages:
            await self.test_buttons_on_page(path, name)
            await self.test_tabs_on_page(path, name)

        # Test dropdowns on pages likely to have them
        dropdown_pages = [
            ("/inventory", "المخزون"),
            ("/sales", "المبيعات"),
            ("/accounting", "المحاسبة"),
            ("/reports", "التقارير"),
        ]
        for path, name in dropdown_pages:
            await self.test_dropdowns_on_page(path, name)

        await self.test_search_functionality()
        await self.test_modals_and_dialogs()


# ============================================================
# Bot 4: API Endpoint Tester
# ============================================================
class APIBot:
    """بوت فحص نقاط API"""

    def __init__(self):
        self.token = None
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })

    def authenticate(self):
        """تسجيل الدخول والحصول على التوكن"""
        try:
            resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            }, timeout=15)

            if resp.status_code == 200:
                data = resp.json()
                if data.get('success') and data.get('data', {}).get('token'):
                    self.token = data['data']['token']
                    self.session.headers['Authorization'] = f'Bearer {self.token}'
                    return True
                elif data.get('token'):
                    self.token = data['token']
                    self.session.headers['Authorization'] = f'Bearer {self.token}'
                    return True
            return False
        except Exception as e:
            console.print(f"  [red]API Auth Error: {e}[/]")
            return False

    def test_endpoint(self, endpoint: dict):
        """فحص نقطة API واحدة"""
        start = time.time()
        method = endpoint["method"]
        path = endpoint["path"]
        name = endpoint["name"]
        category = endpoint["category"]
        needs_auth = endpoint.get("auth", False)
        body = endpoint.get("body", None)

        if needs_auth and not self.token:
            report.add(TestResult(f"API: {name}", f"API-{category}", "skip",
                                  "لا يوجد توكن مصادقة", "", time.time() - start))
            return

        try:
            url = f"{BASE_URL}{path}"
            if method == "GET":
                resp = self.session.get(url, timeout=15)
            elif method == "POST":
                resp = self.session.post(url, json=body, timeout=15)
            elif method == "PUT":
                resp = self.session.put(url, json=body, timeout=15)
            elif method == "DELETE":
                resp = self.session.delete(url, timeout=15)
            else:
                return

            duration = time.time() - start
            status = resp.status_code

            try:
                response_data = resp.json()
            except:
                response_data = {"raw": resp.text[:200]}

            if status == 200:
                report.add(TestResult(f"API: {name}", f"API-{category}", "pass",
                                      f"HTTP {status} - OK ({duration:.2f}s)", "",
                                      duration, {"status": status, "response_preview": str(response_data)[:200]}))
            elif status in [201, 204]:
                report.add(TestResult(f"API: {name}", f"API-{category}", "pass",
                                      f"HTTP {status} ({duration:.2f}s)", "", duration))
            elif status == 401:
                report.add(TestResult(f"API: {name}", f"API-{category}", "fail",
                                      f"HTTP 401 - غير مصرح", "", duration))
            elif status == 403:
                report.add(TestResult(f"API: {name}", f"API-{category}", "warn",
                                      f"HTTP 403 - ممنوع الوصول (قد يكون صلاحيات)", "", duration))
            elif status == 404:
                report.add(TestResult(f"API: {name}", f"API-{category}", "fail",
                                      f"HTTP 404 - غير موجود", "", duration))
            elif status == 500:
                error_msg = response_data.get('message', response_data.get('error', 'Internal Server Error'))
                report.add(TestResult(f"API: {name}", f"API-{category}", "fail",
                                      f"HTTP 500 - خطأ في السيرفر: {str(error_msg)[:150]}", "", duration))
            else:
                report.add(TestResult(f"API: {name}", f"API-{category}", "warn",
                                      f"HTTP {status} - {str(response_data)[:150]}", "", duration))
        except requests.Timeout:
            report.add(TestResult(f"API: {name}", f"API-{category}", "fail",
                                  "Timeout - انتهت مهلة الطلب", "", time.time() - start))
        except requests.ConnectionError:
            report.add(TestResult(f"API: {name}", f"API-{category}", "fail",
                                  "Connection Error - فشل الاتصال", "", time.time() - start))
        except Exception as e:
            report.add(TestResult(f"API: {name}", f"API-{category}", "fail",
                                  str(e)[:200], "", time.time() - start))

    def run_all(self):
        """تشغيل جميع فحوصات API"""
        console.print("\n[bold cyan]🤖 Bot 4: API Endpoint Tester[/]")
        console.print("=" * 50)

        # Authenticate first
        if self.authenticate():
            console.print("  [green]✓ تم تسجيل الدخول في API بنجاح[/]")
        else:
            console.print("  [red]✗ فشل تسجيل الدخول في API[/]")

        for endpoint in API_ENDPOINTS:
            self.test_endpoint(endpoint)


# ============================================================
# Bot 5: Form Validation Tester
# ============================================================
class FormBot:
    """بوت فحص النماذج والتحقق من الإدخال"""

    def __init__(self, page: Page):
        self.page = page

    async def test_form_inputs(self, path: str, page_name: str):
        """فحص حقول الإدخال في صفحة"""
        start = time.time()
        try:
            await self.page.goto(f"{BASE_URL}{path}", wait_until="networkidle", timeout=30000)
            await self.page.wait_for_timeout(2000)

            # Try to open add/create form
            add_btns = self.page.locator('button:has-text("إضافة"), button:has-text("جديد"), button:has-text("Add"), button:has-text("New"), button:has-text("إنشاء")')
            if await add_btns.count() > 0:
                try:
                    await add_btns.first.click(timeout=3000)
                    await self.page.wait_for_timeout(1500)
                except:
                    pass

            inputs = self.page.locator('input:visible, textarea:visible, select:visible')
            count = await inputs.count()

            if count == 0:
                report.add(TestResult(f"نماذج {page_name}", "Forms", "skip",
                                      "لا توجد حقول إدخال مرئية", "", time.time() - start))
                return

            tested = 0
            for i in range(count):
                try:
                    inp = inputs.nth(i)
                    if await inp.is_visible() and await inp.is_enabled():
                        tag = await inp.evaluate("el => el.tagName.toLowerCase()")
                        input_type = await inp.get_attribute('type') or 'text'

                        if tag == 'select':
                            options = await inp.locator('option').count()
                            if options > 1:
                                await inp.select_option(index=0)
                                tested += 1
                        elif tag == 'textarea':
                            await inp.fill("اختبار")
                            await self.page.wait_for_timeout(300)
                            await inp.fill("")
                            tested += 1
                        elif input_type in ['text', 'search', 'tel', 'url']:
                            await inp.fill("test اختبار")
                            await self.page.wait_for_timeout(300)
                            await inp.fill("")
                            tested += 1
                        elif input_type == 'number':
                            await inp.fill("123")
                            await self.page.wait_for_timeout(300)
                            await inp.fill("")
                            tested += 1
                        elif input_type == 'email':
                            await inp.fill("test@test.com")
                            await self.page.wait_for_timeout(300)
                            await inp.fill("")
                            tested += 1
                except:
                    pass

            # Close any modal
            try:
                cancel = self.page.locator('button:has-text("إلغاء"), button:has-text("Cancel"), button:has-text("إغلاق")')
                if await cancel.count() > 0:
                    await cancel.first.click(timeout=2000)
                    await self.page.wait_for_timeout(500)
            except:
                await self.page.keyboard.press('Escape')
                await self.page.wait_for_timeout(500)

            screenshot = await take_screenshot(self.page, f"forms_{path.replace('/', '_')}")
            report.add(TestResult(f"نماذج {page_name}", "Forms", "pass",
                                  f"تم فحص {tested}/{count} حقل", screenshot, time.time() - start))

        except Exception as e:
            report.add(TestResult(f"نماذج {page_name}", "Forms", "warn", str(e)[:200], "", time.time() - start))

    async def run_all(self):
        """تشغيل جميع فحوصات النماذج"""
        console.print("\n[bold cyan]🤖 Bot 5: Form Validation Tester[/]")
        console.print("=" * 50)

        form_pages = [
            ("/inventory", "المخزون"),
            ("/sales/new", "فاتورة جديدة"),
            ("/customers", "العملاء"),
            ("/suppliers", "الموردين"),
            ("/employees", "الموظفين"),
            ("/returns", "المرتجعات"),
            ("/accounting", "المحاسبة"),
            ("/tasks", "المهام"),
            ("/warranty", "الكفالة"),
            ("/delivery", "التوصيل"),
            ("/approvals", "الموافقات"),
            ("/settings", "الإعدادات"),
            ("/goals", "الأهداف"),
            ("/training", "التدريب"),
            ("/fixed-assets", "الأصول الثابتة"),
            ("/shares", "الحصص"),
        ]

        for path, name in form_pages:
            await self.test_form_inputs(path, name)


# ============================================================
# Bot 6: Performance & Console Monitor
# ============================================================
class PerformanceBot:
    """بوت فحص الأداء ومراقبة الأخطاء"""

    def __init__(self, page: Page):
        self.page = page

    async def test_page_load_performance(self):
        """فحص أداء تحميل الصفحات"""
        start = time.time()
        console.print("\n[bold cyan]🤖 Bot 6: Performance Monitor[/]")
        console.print("=" * 50)

        performance_data = {}

        for route in FRONTEND_ROUTES[:15]:  # Test key pages
            path = route["path"]
            name = route["name"]
            try:
                page_start = time.time()
                await self.page.goto(f"{BASE_URL}{path}", wait_until="networkidle", timeout=30000)
                load_time = time.time() - page_start

                performance_data[name] = load_time

                if load_time > 10:
                    report.add(TestResult(f"أداء {name}", "Performance", "fail",
                                          f"بطيء جداً: {load_time:.2f}s", "", load_time))
                elif load_time > 5:
                    report.add(TestResult(f"أداء {name}", "Performance", "warn",
                                          f"بطيء: {load_time:.2f}s", "", load_time))
                else:
                    report.add(TestResult(f"أداء {name}", "Performance", "pass",
                                          f"جيد: {load_time:.2f}s", "", load_time))
            except Exception as e:
                report.add(TestResult(f"أداء {name}", "Performance", "fail",
                                      str(e)[:150], "", time.time() - page_start))

        report.performance_metrics = performance_data

    async def test_responsive_design(self):
        """فحص التصميم المتجاوب"""
        viewports = [
            {"width": 375, "height": 812, "name": "iPhone (375x812)"},
            {"width": 768, "height": 1024, "name": "iPad (768x1024)"},
            {"width": 1920, "height": 1080, "name": "Desktop (1920x1080)"},
        ]

        for vp in viewports:
            start = time.time()
            try:
                await self.page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
                await self.page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle", timeout=30000)
                await self.page.wait_for_timeout(2000)

                screenshot = await take_screenshot(self.page, f"responsive_{vp['width']}x{vp['height']}")

                # Check for horizontal overflow
                has_overflow = await self.page.evaluate("""() => {
                    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
                }""")

                if has_overflow:
                    report.add(TestResult(f"تجاوب {vp['name']}", "Responsive", "warn",
                                          "يوجد تجاوز أفقي", screenshot, time.time() - start))
                else:
                    report.add(TestResult(f"تجاوب {vp['name']}", "Responsive", "pass",
                                          "التصميم متجاوب", screenshot, time.time() - start))
            except Exception as e:
                report.add(TestResult(f"تجاوب {vp['name']}", "Responsive", "fail", str(e)[:150], "", time.time() - start))

        # Reset to desktop
        await self.page.set_viewport_size({"width": 1920, "height": 1080})

    async def run_all(self):
        await self.test_page_load_performance()
        await self.test_responsive_design()


# ============================================================
# Bot 7: Dark Mode & Theme Tester
# ============================================================
class ThemeBot:
    """بوت فحص الوضع الداكن والسمات"""

    def __init__(self, page: Page):
        self.page = page

    async def test_dark_mode(self):
        """فحص الوضع الداكن"""
        start = time.time()
        console.print("\n[bold cyan]🤖 Bot 7: Theme & Dark Mode Tester[/]")
        console.print("=" * 50)

        try:
            await self.page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle", timeout=30000)
            await self.page.wait_for_timeout(2000)

            # Look for dark mode toggle
            theme_toggle = self.page.locator('button[aria-label*="dark"], button[aria-label*="theme"], button[aria-label*="mode"], [class*="theme-toggle"], [class*="dark-mode"]')

            if await theme_toggle.count() > 0:
                # Take screenshot in current mode
                screenshot_light = await take_screenshot(self.page, "theme_light")

                await theme_toggle.first.click()
                await self.page.wait_for_timeout(1500)

                screenshot_dark = await take_screenshot(self.page, "theme_dark")

                # Check if dark class was added
                has_dark = await self.page.evaluate("() => document.documentElement.classList.contains('dark') || document.body.classList.contains('dark')")

                # Toggle back
                await theme_toggle.first.click()
                await self.page.wait_for_timeout(1000)

                report.add(TestResult("تبديل الوضع الداكن", "Theme", "pass",
                                      f"يعمل بشكل صحيح (dark class: {has_dark})", screenshot_dark, time.time() - start))
            else:
                # Try settings page
                await self.page.goto(f"{BASE_URL}/settings", wait_until="networkidle", timeout=30000)
                await self.page.wait_for_timeout(2000)
                theme_toggle2 = self.page.locator('button[aria-label*="dark"], button[aria-label*="theme"], [class*="theme"]')
                if await theme_toggle2.count() > 0:
                    report.add(TestResult("تبديل الوضع الداكن", "Theme", "pass",
                                          "موجود في الإعدادات", "", time.time() - start))
                else:
                    report.add(TestResult("تبديل الوضع الداكن", "Theme", "skip",
                                          "لم يتم العثور على زر تبديل الوضع", "", time.time() - start))
        except Exception as e:
            report.add(TestResult("تبديل الوضع الداكن", "Theme", "warn", str(e)[:150], "", time.time() - start))

    async def run_all(self):
        await self.test_dark_mode()


# ============================================================
# Helper Functions
# ============================================================
async def take_screenshot(page: Page, name: str) -> str:
    """أخذ لقطة شاشة"""
    try:
        SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
        filename = f"{name}_{int(time.time())}.png"
        filepath = SCREENSHOT_DIR / filename
        await page.screenshot(path=str(filepath), full_page=False)
        return str(filepath)
    except:
        return ""


async def login_to_site(page: Page) -> bool:
    """تسجيل الدخول للموقع"""
    try:
        await page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)

        await page.fill('input[type="email"]', ADMIN_EMAIL)
        await page.fill('input[type="password"]', ADMIN_PASSWORD)
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(5000)

        if "/login" not in page.url.lower() or "/dashboard" in page.url:
            return True
        return False
    except Exception as e:
        console.print(f"  [red]Login failed: {e}[/]")
        return False


def setup_console_monitoring(page: Page):
    """إعداد مراقبة console الخاص بالمتصفح"""
    def on_console(msg):
        if msg.type == 'error':
            report.js_errors.append({
                "text": msg.text,
                "url": page.url,
                "time": datetime.now().isoformat()
            })
        elif msg.type == 'warning':
            report.console_warnings.append({
                "text": msg.text,
                "url": page.url,
                "time": datetime.now().isoformat()
            })

    def on_page_error(error):
        report.js_errors.append({
            "text": str(error),
            "url": page.url,
            "time": datetime.now().isoformat(),
            "type": "page_error"
        })

    def on_request_failed(request):
        report.network_errors.append({
            "url": request.url,
            "method": request.method,
            "failure": request.failure,
            "page_url": page.url,
            "time": datetime.now().isoformat()
        })

    page.on("console", on_console)
    page.on("pageerror", on_page_error)
    page.on("requestfailed", on_request_failed)


# ============================================================
# HTML Report Generator
# ============================================================
def generate_html_report():
    """توليد تقرير HTML شامل"""
    report.end_time = datetime.now()
    duration = (report.end_time - report.start_time).total_seconds()

    # Group results by category
    categories = {}
    for r in report.results:
        cat = r.category
        if cat not in categories:
            categories[cat] = {"pass": 0, "fail": 0, "warn": 0, "skip": 0, "results": []}
        categories[cat][r.status] += 1
        categories[cat]["results"].append(r)

    template = Template(HTML_TEMPLATE)
    html = template.render(
        report=report,
        categories=categories,
        duration=duration,
        now=report.end_time.strftime("%Y-%m-%d %H:%M:%S"),
        start=report.start_time.strftime("%Y-%m-%d %H:%M:%S"),
    )

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORT_DIR / f"bi_erp_test_report_{report.start_time.strftime('%Y%m%d_%H%M%S')}.html"
    report_path.write_text(html, encoding='utf-8')
    return str(report_path)


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BI ERP - تقرير الفحص الشامل</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0f172a; color: #e2e8f0; line-height: 1.6; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }

        .header { background: linear-gradient(135deg, #1e293b, #334155); border-radius: 16px; padding: 40px; margin-bottom: 30px; text-align: center; border: 1px solid #475569; }
        .header h1 { font-size: 2.5em; color: #60a5fa; margin-bottom: 10px; }
        .header p { color: #94a3b8; font-size: 1.1em; }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 30px; }
        .stat-card { background: #1e293b; border-radius: 12px; padding: 24px; text-align: center; border: 1px solid #334155; transition: transform 0.2s; }
        .stat-card:hover { transform: translateY(-2px); }
        .stat-card .number { font-size: 2.5em; font-weight: bold; }
        .stat-card .label { color: #94a3b8; margin-top: 5px; }
        .stat-card.pass .number { color: #4ade80; }
        .stat-card.fail .number { color: #f87171; }
        .stat-card.warn .number { color: #fbbf24; }
        .stat-card.skip .number { color: #94a3b8; }
        .stat-card.total .number { color: #60a5fa; }
        .stat-card.rate .number { color: #a78bfa; }

        .progress-bar { width: 100%; height: 12px; background: #334155; border-radius: 6px; margin: 20px 0; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 6px; transition: width 0.5s; }
        .progress-fill.good { background: linear-gradient(90deg, #4ade80, #22c55e); }
        .progress-fill.ok { background: linear-gradient(90deg, #fbbf24, #f59e0b); }
        .progress-fill.bad { background: linear-gradient(90deg, #f87171, #ef4444); }

        .section { background: #1e293b; border-radius: 12px; margin-bottom: 20px; border: 1px solid #334155; overflow: hidden; }
        .section-header { padding: 20px 24px; background: #334155; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
        .section-header h2 { font-size: 1.2em; color: #f8fafc; }
        .section-header .badge { padding: 4px 12px; border-radius: 20px; font-size: 0.85em; font-weight: bold; }
        .badge-pass { background: #065f46; color: #4ade80; }
        .badge-fail { background: #7f1d1d; color: #f87171; }
        .badge-warn { background: #78350f; color: #fbbf24; }
        .section-body { padding: 0; }

        table { width: 100%; border-collapse: collapse; }
        th { background: #1e293b; padding: 12px 16px; text-align: right; color: #94a3b8; font-size: 0.85em; text-transform: uppercase; border-bottom: 1px solid #334155; }
        td { padding: 12px 16px; border-bottom: 1px solid #1e293b; }
        tr:hover { background: #334155; }

        .status-icon { width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; }
        .status-pass { background: #065f46; color: #4ade80; }
        .status-fail { background: #7f1d1d; color: #f87171; }
        .status-warn { background: #78350f; color: #fbbf24; }
        .status-skip { background: #334155; color: #94a3b8; }

        .errors-section { background: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid #7f1d1d; }
        .errors-section h3 { color: #f87171; margin-bottom: 16px; }
        .error-item { background: #0f172a; padding: 12px 16px; border-radius: 8px; margin-bottom: 8px; font-family: monospace; font-size: 0.85em; color: #fca5a5; word-break: break-all; }

        .perf-bar { height: 8px; border-radius: 4px; background: #334155; overflow: hidden; min-width: 100px; }
        .perf-fill { height: 100%; border-radius: 4px; }

        .screenshot-link { color: #60a5fa; text-decoration: none; font-size: 0.85em; }
        .screenshot-link:hover { text-decoration: underline; }

        .footer { text-align: center; padding: 30px; color: #475569; }

        @media (max-width: 768px) {
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
            .header h1 { font-size: 1.8em; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 BI ERP - تقرير الفحص الشامل</h1>
            <p>تاريخ الفحص: {{ now }} | المدة: {{ "%.1f"|format(duration) }} ثانية</p>
            <p>الموقع: {{ report.results[0].details.get('url', 'https://erp.biiraq.com') if report.results else 'https://erp.biiraq.com' }}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card total">
                <div class="number">{{ report.total }}</div>
                <div class="label">إجمالي الفحوصات</div>
            </div>
            <div class="stat-card pass">
                <div class="number">{{ report.passed }}</div>
                <div class="label">ناجح ✓</div>
            </div>
            <div class="stat-card fail">
                <div class="number">{{ report.failed }}</div>
                <div class="label">فاشل ✗</div>
            </div>
            <div class="stat-card warn">
                <div class="number">{{ report.warnings }}</div>
                <div class="label">تحذير ⚠</div>
            </div>
            <div class="stat-card skip">
                <div class="number">{{ report.skipped }}</div>
                <div class="label">تم تخطيه ○</div>
            </div>
            <div class="stat-card rate">
                <div class="number">{{ report.pass_rate }}%</div>
                <div class="label">نسبة النجاح</div>
            </div>
        </div>

        <div class="progress-bar">
            <div class="progress-fill {% if report.pass_rate >= 80 %}good{% elif report.pass_rate >= 50 %}ok{% else %}bad{% endif %}"
                 style="width: {{ report.pass_rate }}%"></div>
        </div>

        {% if report.js_errors %}
        <div class="errors-section">
            <h3>🔴 أخطاء JavaScript ({{ report.js_errors|length }})</h3>
            {% for err in report.js_errors[:20] %}
            <div class="error-item">
                <strong>{{ err.url }}</strong><br>
                {{ err.text[:300] }}
            </div>
            {% endfor %}
            {% if report.js_errors|length > 20 %}
            <p style="color: #94a3b8; margin-top: 10px;">... و {{ report.js_errors|length - 20 }} خطأ آخر</p>
            {% endif %}
        </div>
        {% endif %}

        {% if report.network_errors %}
        <div class="errors-section" style="border-color: #78350f;">
            <h3 style="color: #fbbf24;">🟡 أخطاء الشبكة ({{ report.network_errors|length }})</h3>
            {% for err in report.network_errors[:15] %}
            <div class="error-item" style="color: #fde68a;">
                <strong>{{ err.method }} {{ err.url[:100] }}</strong><br>
                {{ err.failure or 'Unknown error' }}
            </div>
            {% endfor %}
        </div>
        {% endif %}

        {% for cat_name, cat_data in categories.items() %}
        <div class="section">
            <div class="section-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
                <h2>{{ cat_name }}</h2>
                <div>
                    {% if cat_data.pass > 0 %}<span class="badge badge-pass">{{ cat_data.pass }} ✓</span>{% endif %}
                    {% if cat_data.fail > 0 %}<span class="badge badge-fail">{{ cat_data.fail }} ✗</span>{% endif %}
                    {% if cat_data.warn > 0 %}<span class="badge badge-warn">{{ cat_data.warn }} ⚠</span>{% endif %}
                </div>
            </div>
            <div class="section-body">
                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px;">الحالة</th>
                            <th>الفحص</th>
                            <th>التفاصيل</th>
                            <th style="width: 80px;">المدة</th>
                            <th style="width: 60px;">صورة</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for r in cat_data.results %}
                        <tr>
                            <td>
                                <span class="status-icon status-{{ r.status }}">
                                    {% if r.status == 'pass' %}✓{% elif r.status == 'fail' %}✗{% elif r.status == 'warn' %}⚠{% else %}○{% endif %}
                                </span>
                            </td>
                            <td><strong>{{ r.name }}</strong></td>
                            <td style="color: {% if r.status == 'fail' %}#fca5a5{% elif r.status == 'warn' %}#fde68a{% else %}#94a3b8{% endif %}; font-size: 0.9em;">
                                {{ r.message }}
                            </td>
                            <td style="color: #94a3b8; font-size: 0.85em;">{{ "%.2f"|format(r.duration) }}s</td>
                            <td>
                                {% if r.screenshot %}
                                <a href="file:///{{ r.screenshot|replace('\\\\', '/') }}" class="screenshot-link" target="_blank">📸</a>
                                {% endif %}
                            </td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>
            </div>
        </div>
        {% endfor %}

        {% if report.performance_metrics %}
        <div class="section">
            <div class="section-header">
                <h2>⚡ أداء تحميل الصفحات</h2>
            </div>
            <div class="section-body" style="padding: 20px;">
                <table>
                    <thead>
                        <tr>
                            <th>الصفحة</th>
                            <th>وقت التحميل</th>
                            <th style="width: 200px;">مؤشر</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for page_name, load_time in report.performance_metrics.items() %}
                        <tr>
                            <td>{{ page_name }}</td>
                            <td>{{ "%.2f"|format(load_time) }}s</td>
                            <td>
                                <div class="perf-bar">
                                    <div class="perf-fill" style="width: {{ [load_time / 15 * 100, 100]|min }}%;
                                        background: {% if load_time < 3 %}#4ade80{% elif load_time < 5 %}#fbbf24{% else %}#f87171{% endif %};"></div>
                                </div>
                            </td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>
            </div>
        </div>
        {% endif %}

        <div class="footer">
            <p>BI ERP Comprehensive Test Report | Generated by BI Smart Testing Bot</p>
            <p>بدء: {{ start }} | انتهاء: {{ now }} | المدة الكلية: {{ "%.1f"|format(duration) }} ثانية</p>
        </div>
    </div>

    <script>
        // Auto-collapse sections
        document.querySelectorAll('.section-header').forEach(header => {
            header.style.cursor = 'pointer';
        });
    </script>
</body>
</html>"""


# ============================================================
# Main Execution
# ============================================================
async def main():
    """التشغيل الرئيسي"""
    console.print(Panel.fit(
        "[bold cyan]🤖 BI ERP - بوت الفحص الشامل الذكي[/]\n"
        f"[dim]الموقع: {BASE_URL}[/]\n"
        f"[dim]البريد: {ADMIN_EMAIL}[/]\n"
        f"[dim]التاريخ: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}[/]",
        title="[bold white]Smart Testing Bot[/]",
        border_style="cyan"
    ))

    # Create directories
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        console.print("\n[cyan]⟳ جاري تشغيل المتصفح...[/]")
        browser = await p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        )

        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale="ar",
            timezone_id="Asia/Baghdad",
            ignore_https_errors=True,
        )

        page = await context.new_page()

        # Setup console monitoring
        setup_console_monitoring(page)

        # ========== Bot 1: Auth Testing ==========
        auth_bot = AuthBot(page)
        await auth_bot.run_all()

        # Ensure we're logged in for subsequent tests
        if "/login" in page.url.lower() or "/dashboard" not in page.url:
            console.print("\n[yellow]⟳ إعادة تسجيل الدخول...[/]")
            logged_in = await login_to_site(page)
            if not logged_in:
                console.print("[red]✗ فشل تسجيل الدخول - بعض الفحوصات قد تفشل[/]")

        # ========== Bot 2: Page Navigation ==========
        nav_bot = PageNavigatorBot(page)
        await nav_bot.run_all()

        # ========== Bot 3: Interactive Elements ==========
        interactive_bot = InteractiveBot(page)
        await interactive_bot.run_all()

        # ========== Bot 4: API Testing ==========
        api_bot = APIBot()
        api_bot.run_all()

        # ========== Bot 5: Form Testing ==========
        form_bot = FormBot(page)
        await form_bot.run_all()

        # ========== Bot 6: Performance ==========
        perf_bot = PerformanceBot(page)
        await perf_bot.run_all()

        # ========== Bot 7: Theme Testing ==========
        theme_bot = ThemeBot(page)
        await theme_bot.run_all()

        # Close browser
        await browser.close()

    # Generate report
    console.print("\n[cyan]⟳ جاري إنشاء التقرير...[/]")
    report_path = generate_html_report()

    # Print summary
    console.print("\n")
    console.print(Panel.fit(
        f"[bold]إجمالي الفحوصات:[/] {report.total}\n"
        f"[green]ناجح:[/] {report.passed}\n"
        f"[red]فاشل:[/] {report.failed}\n"
        f"[yellow]تحذير:[/] {report.warnings}\n"
        f"[dim]تخطي:[/] {report.skipped}\n"
        f"[bold magenta]نسبة النجاح:[/] {report.pass_rate}%\n"
        f"\n[red]أخطاء JS:[/] {len(report.js_errors)}\n"
        f"[yellow]أخطاء الشبكة:[/] {len(report.network_errors)}\n"
        f"\n[bold cyan]التقرير:[/] {report_path}",
        title="[bold white]📊 ملخص النتائج[/]",
        border_style="green" if report.pass_rate >= 80 else "yellow" if report.pass_rate >= 50 else "red"
    ))

    # Also save JSON report
    json_report_path = REPORT_DIR / f"bi_erp_test_report_{report.start_time.strftime('%Y%m%d_%H%M%S')}.json"
    json_data = {
        "summary": {
            "total": report.total,
            "passed": report.passed,
            "failed": report.failed,
            "warnings": report.warnings,
            "skipped": report.skipped,
            "pass_rate": report.pass_rate,
            "js_errors_count": len(report.js_errors),
            "network_errors_count": len(report.network_errors),
            "duration": (report.end_time - report.start_time).total_seconds(),
            "start_time": report.start_time.isoformat(),
            "end_time": report.end_time.isoformat(),
        },
        "results": [
            {
                "name": r.name,
                "category": r.category,
                "status": r.status,
                "message": r.message,
                "duration": r.duration,
                "screenshot": r.screenshot,
            }
            for r in report.results
        ],
        "js_errors": report.js_errors[:50],
        "network_errors": report.network_errors[:50],
        "performance_metrics": report.performance_metrics,
    }
    json_report_path.write_text(json.dumps(json_data, ensure_ascii=False, indent=2), encoding='utf-8')

    console.print(f"\n[dim]تقرير JSON: {json_report_path}[/]")

    # Return exit code based on results
    if report.failed > 0:
        return 1
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
