import { Link, useLocation, useNavigate } from "react-router-dom";

type NavItem = {
  to: string;
  label: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: "الرئيسية",
    items: [
      { to: "/", label: "لوحة التحكم" },
      { to: "/executive-dashboard", label: "اللوحة التنفيذية" },
      { to: "/rep-dashboard", label: "لوحة المندوب" },
      { to: "/goals", label: "الأهداف والمؤشرات" },
      { to: "/alerts", label: "التنبيهات" },
      { to: "/analytics", label: "التحليلات" },
      { to: "/reports", label: "مركز التقارير" },
      { to: "/reports/builder", label: "منشئ التقارير" },
      { to: "/analytics-dashboard", label: "لوحات التحليلات" },
      { to: "/competitors", label: "تحليل المنافسين" },
      { to: "/live-sales", label: "المبيعات اللحظية" },
      { to: "/profitability", label: "تحليل الربحية" },
      { to: "/smart-pricing", label: "التسعير الذكي" },
      { to: "/ai-chat", label: "المساعد الذكي" },
      { to: "/calculator", label: "الحاسبة والمحادثة" },
      { to: "/bot", label: "البوت الذكي" },
      { to: "/cameras", label: "الكاميرات" },
    ],
  },
  {
    title: "المخزون",
    items: [
      { to: "/products", label: "المنتجات" },
      { to: "/categories", label: "التصنيفات" },
      { to: "/warehouses", label: "المخازن" },
      { to: "/devices", label: "سجل الأجهزة" },
      { to: "/maintenance", label: "الصيانة" },
      { to: "/parts", label: "قطع الترقية" },
      { to: "/upgrades", label: "طلبات الترقية" },
      { to: "/barcode/print", label: "طباعة الباركود" },
      { to: "/barcode/scan", label: "ماسح الباركود" },
    ],
  },
  {
    title: "المشتريات",
    items: [
      { to: "/purchases", label: "وجبات الشراء" },
      { to: "/purchases/new", label: "إضافة وجبة جديدة" },
      { to: "/suppliers", label: "الموردين" },
      { to: "/returns", label: "مرتجعات الموردين" },
      { to: "/vendor-scorecard", label: "تقييم الموردين" },
    ],
  },
  {
    title: "المبيعات",
    items: [
      { to: "/customers", label: "العملاء" },
      { to: "/quotations", label: "عروض الأسعار" },
      { to: "/reservations", label: "الحجوزات" },
      { to: "/invoices", label: "الفواتير" },
      { to: "/subscriptions", label: "الاشتراكات" },
      { to: "/warranties", label: "الضمانات" },
      { to: "/warranty-dashboard", label: "لوحة الضمانات" },
      { to: "/promotions", label: "العروض والخصومات" },
      { to: "/bundles", label: "الباقات والعروض" },
      { to: "/contracts", label: "العقود" },
      { to: "/agents", label: "الوكلاء والموزعين" },
    ],
  },
  {
    title: "التوصيل",
    items: [
      { to: "/delivery/shipments", label: "الشحنات" },
      { to: "/delivery/companies", label: "شركات التوصيل" },
    ],
  },
  {
    title: "المالية",
    items: [
      { to: "/accounts", label: "الحسابات" },
      { to: "/journal-entries", label: "القيود اليومية" },
      { to: "/vouchers", label: "السندات" },
      { to: "/cash-registers", label: "القاصات" },
      { to: "/bank-accounts", label: "الحسابات البنكية" },
      { to: "/checks", label: "الشيكات" },
      { to: "/budgets", label: "الميزانية" },
      { to: "/expenses", label: "المصروفات والسلف" },
      { to: "/advanced-budgeting", label: "الموازنات المتقدمة" },
      { to: "/investments", label: "المحافظ والاستثمارات" },
      { to: "/shares", label: "الأسهم والشراكة" },
    ],
  },
  {
    title: "الموارد البشرية",
    items: [
      { to: "/hr/employees", label: "الموظفون" },
      { to: "/hr/departments", label: "الأقسام" },
      { to: "/hr/attendance", label: "الحضور" },
      { to: "/hr/leaves", label: "الإجازات" },
      { to: "/hr/salaries", label: "الرواتب" },
      { to: "/custody", label: "العهد" },
      { to: "/training", label: "التدريب والتطوير" },
      { to: "/performance", label: "تقييم الأداء" },
    ],
  },
  {
    title: "إدارة العلاقات (CRM)",
    items: [
      { to: "/crm/leads", label: "العملاء المحتملين" },
      { to: "/crm/opportunities", label: "الفرص البيعية" },
      { to: "/crm/campaigns", label: "الحملات التسويقية" },
      { to: "/partners", label: "الشركاء" },
      { to: "/loyalty", label: "برنامج الولاء" },
      { to: "/customer-portal", label: "بوابة العميل" },
      { to: "/notes", label: "الملاحظات" },
      { to: "/reviews", label: "التقييمات" },
      { to: "/calls", label: "سجل المكالمات" },
    ],
  },
  {
    title: "الدعم الفني",
    items: [
      { to: "/tickets", label: "التذاكر" },
      { to: "/tickets/new", label: "تذكرة جديدة" },
      { to: "/appointments", label: "المواعيد" },
      { to: "/complaints", label: "الشكاوى والاقتراحات" },
    ],
  },
  {
    title: "سير العمل",
    items: [
      { to: "/tasks", label: "المهام" },
      { to: "/workflows", label: "الموافقات" },
      { to: "/notifications", label: "الإشعارات" },
      { to: "/messages", label: "المراسلات الداخلية" },
      { to: "/correspondence", label: "الصادر والوارد" },
      { to: "/meetings", label: "الاجتماعات والقرارات" },
    ],
  },
  {
    title: "الأصول",
    items: [
      { to: "/assets", label: "الأصول الثابتة" },
      { to: "/fleet", label: "إدارة الأسطول" },
      { to: "/realestate", label: "العقارات والإيجارات" },
    ],
  },
  {
    title: "المبيعات السريعة",
    items: [
      { to: "/pos", label: "نقطة البيع" },
    ],
  },
  {
    title: "العمليات",
    items: [
      { to: "/supply-chain", label: "سلسلة التوريد" },
      { to: "/projects", label: "المشاريع" },
      { to: "/manufacturing", label: "التصنيع" },
      { to: "/risks", label: "إدارة المخاطر" },
      { to: "/quality", label: "إدارة الجودة" },
      { to: "/events", label: "الفعاليات والأحداث" },
      { to: "/visits", label: "الزيارات والوفود" },
      { to: "/tenders", label: "المناقصات والعطاءات" },
    ],
  },
  {
    title: "التجارة والتكامل",
    items: [
      { to: "/ecommerce", label: "المتجر الإلكتروني" },
      { to: "/integrations", label: "التكاملات" },
    ],
  },
  {
    title: "الإعدادات",
    items: [
      { to: "/branches", label: "الفروع" },
      { to: "/users", label: "المستخدمون" },
      { to: "/roles", label: "الأدوار" },
      { to: "/permissions", label: "الصلاحيات" },
      { to: "/settings", label: "الإعدادات" },
      { to: "/system-settings", label: "إعدادات النظام" },
      { to: "/companies", label: "الشركات" },
      { to: "/policies", label: "اللوائح والسياسات" },
      { to: "/licenses", label: "الرخص والتصاريح" },
      { to: "/files", label: "مدير الملفات" },
      { to: "/audit-log", label: "سجل التدقيق" },
      { to: "/archive", label: "الأرشيف" },
      { to: "/documents", label: "المستندات والتوقيعات" },
      { to: "/data-tools", label: "استيراد/تصدير" },
      { to: "/knowledge", label: "قاعدة المعرفة" },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  }

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  return (
    <aside
      style={{
        width: "260px",
        position: "fixed",
        right: 0,
        top: 0,
        bottom: 0,
        background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
        color: "#f1f5f9",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        boxShadow: "-5px 0 25px rgba(0, 0, 0, 0.15)",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "1rem", borderBottom: "1px solid rgba(71, 85, 105, 0.5)" }}>
        <Link to="/" style={{ color: "inherit", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <img
            src="/assets/logo.svg"
            alt="BI"
            style={{
              width: "45px",
              height: "45px",
              borderRadius: "10px",
            }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>BI Management</div>
            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>v3.0</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflow: "auto", padding: "0.75rem 0" }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} style={{ marginBottom: "0.5rem" }}>
            <div
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#64748b",
                fontWeight: 600,
              }}
            >
              {section.title}
            </div>
            {section.items.map(({ to, label }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0.6rem 1rem",
                    margin: "0.1rem 0.5rem",
                    color: active ? "#fff" : "#94a3b8",
                    textDecoration: "none",
                    borderRadius: "8px",
                    background: active ? "rgba(55, 48, 163, 0.3)" : "transparent",
                    borderRight: active ? "3px solid #3730a3" : "3px solid transparent",
                    transition: "all 0.15s ease",
                    fontSize: "0.9rem",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "rgba(148, 163, 184, 0.1)";
                      e.currentTarget.style.color = "#e2e8f0";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#94a3b8";
                    }
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div style={{ padding: "1rem", borderTop: "1px solid rgba(71, 85, 105, 0.5)" }}>
        <Link
          to="/profile"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.5rem",
            borderRadius: "8px",
            textDecoration: "none",
            color: "#e2e8f0",
            marginBottom: "0.75rem",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(148, 163, 184, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              background: "#475569",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.9rem",
            }}
          >
            U
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>حسابي</div>
            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>الملف الشخصي</div>
          </div>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            width: "100%",
            padding: "0.6rem 1rem",
            background: "rgba(239, 68, 68, 0.1)",
            color: "#f87171",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 500,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
          }}
        >
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
