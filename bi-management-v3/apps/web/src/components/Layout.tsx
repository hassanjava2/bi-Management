import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { Layout as AntLayout, Menu, Button, Avatar, Dropdown, Input, Badge, Drawer, theme } from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  ShoppingOutlined,
  UserOutlined,
  FileTextOutlined,
  DollarOutlined,
  TeamOutlined,
  CustomerServiceOutlined,
  SettingOutlined,
  BellOutlined,
  SearchOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  ShopOutlined,
  CarOutlined,
  BankOutlined,
  ProjectOutlined,
  ToolOutlined,
  SafetyOutlined,
  BarChartOutlined,
  AppstoreOutlined,
  GlobalOutlined,
  ApartmentOutlined,
  ContainerOutlined,
  SolutionOutlined,
  CalendarOutlined,
  AuditOutlined,
  HomeOutlined,
} from "@ant-design/icons";

const { Header, Sider, Content } = AntLayout;

type MenuItem = Required<MenuProps>["items"][number];

function getItem(
  label: React.ReactNode,
  key: string,
  icon?: React.ReactNode,
  children?: MenuItem[]
): MenuItem {
  return { key, icon, children, label } as MenuItem;
}

const menuItems: MenuItem[] = [
  getItem("الرئيسية", "home", <HomeOutlined />, [
    getItem(<Link to="/">لوحة التحكم</Link>, "/"),
    getItem(<Link to="/goals">الأهداف والمؤشرات</Link>, "/goals"),
    getItem(<Link to="/alerts">التنبيهات</Link>, "/alerts"),
    getItem(<Link to="/analytics">التحليلات</Link>, "/analytics"),
    getItem(<Link to="/reports">مركز التقارير</Link>, "/reports"),
  ]),
  getItem("المخزون", "inventory", <ContainerOutlined />, [
    getItem(<Link to="/products">المنتجات</Link>, "/products"),
    getItem(<Link to="/categories">التصنيفات</Link>, "/categories"),
    getItem(<Link to="/warehouses">المخازن</Link>, "/warehouses"),
    getItem(<Link to="/devices">سجل الأجهزة</Link>, "/devices"),
    getItem(<Link to="/maintenance">الصيانة</Link>, "/maintenance"),
    getItem(<Link to="/parts">قطع الترقية</Link>, "/parts"),
  ]),
  getItem("المشتريات", "purchases", <ShoppingOutlined />, [
    getItem(<Link to="/purchases">وجبات الشراء</Link>, "/purchases"),
    getItem(<Link to="/suppliers">الموردين</Link>, "/suppliers"),
    getItem(<Link to="/returns">المرتجعات</Link>, "/returns"),
  ]),
  getItem("المبيعات", "sales", <ShopOutlined />, [
    getItem(<Link to="/customers">العملاء</Link>, "/customers"),
    getItem(<Link to="/quotations">عروض الأسعار</Link>, "/quotations"),
    getItem(<Link to="/invoices">الفواتير</Link>, "/invoices"),
    getItem(<Link to="/reservations">الحجوزات</Link>, "/reservations"),
    getItem(<Link to="/warranties">الضمانات</Link>, "/warranties"),
    getItem(<Link to="/promotions">العروض والخصومات</Link>, "/promotions"),
    getItem(<Link to="/contracts">العقود</Link>, "/contracts"),
  ]),
  getItem("التوصيل", "delivery", <CarOutlined />, [
    getItem(<Link to="/delivery/shipments">الشحنات</Link>, "/delivery/shipments"),
    getItem(<Link to="/delivery/companies">شركات التوصيل</Link>, "/delivery/companies"),
  ]),
  getItem("المالية", "finance", <DollarOutlined />, [
    getItem(<Link to="/accounts">الحسابات</Link>, "/accounts"),
    getItem(<Link to="/journal-entries">القيود اليومية</Link>, "/journal-entries"),
    getItem(<Link to="/vouchers">السندات</Link>, "/vouchers"),
    getItem(<Link to="/cash-registers">القاصات</Link>, "/cash-registers"),
    getItem(<Link to="/bank-accounts">الحسابات البنكية</Link>, "/bank-accounts"),
    getItem(<Link to="/checks">الشيكات</Link>, "/checks"),
    getItem(<Link to="/budgets">الميزانية</Link>, "/budgets"),
    getItem(<Link to="/expenses">المصروفات</Link>, "/expenses"),
  ]),
  getItem("الموارد البشرية", "hr", <TeamOutlined />, [
    getItem(<Link to="/hr/employees">الموظفون</Link>, "/hr/employees"),
    getItem(<Link to="/hr/departments">الأقسام</Link>, "/hr/departments"),
    getItem(<Link to="/hr/attendance">الحضور</Link>, "/hr/attendance"),
    getItem(<Link to="/hr/leaves">الإجازات</Link>, "/hr/leaves"),
    getItem(<Link to="/hr/salaries">الرواتب</Link>, "/hr/salaries"),
    getItem(<Link to="/training">التدريب</Link>, "/training"),
    getItem(<Link to="/performance">تقييم الأداء</Link>, "/performance"),
  ]),
  getItem("إدارة العلاقات", "crm", <SolutionOutlined />, [
    getItem(<Link to="/crm/leads">العملاء المحتملين</Link>, "/crm/leads"),
    getItem(<Link to="/crm/opportunities">الفرص البيعية</Link>, "/crm/opportunities"),
    getItem(<Link to="/crm/campaigns">الحملات التسويقية</Link>, "/crm/campaigns"),
    getItem(<Link to="/loyalty">برنامج الولاء</Link>, "/loyalty"),
    getItem(<Link to="/calls">سجل المكالمات</Link>, "/calls"),
  ]),
  getItem("الدعم الفني", "support", <CustomerServiceOutlined />, [
    getItem(<Link to="/tickets">التذاكر</Link>, "/tickets"),
    getItem(<Link to="/appointments">المواعيد</Link>, "/appointments"),
    getItem(<Link to="/complaints">الشكاوى</Link>, "/complaints"),
  ]),
  getItem("سير العمل", "workflow", <ApartmentOutlined />, [
    getItem(<Link to="/tasks">المهام</Link>, "/tasks"),
    getItem(<Link to="/workflows">الموافقات</Link>, "/workflows"),
    getItem(<Link to="/notifications">الإشعارات</Link>, "/notifications"),
    getItem(<Link to="/messages">المراسلات</Link>, "/messages"),
    getItem(<Link to="/meetings">الاجتماعات</Link>, "/meetings"),
  ]),
  getItem("الأصول", "assets", <BankOutlined />, [
    getItem(<Link to="/assets">الأصول الثابتة</Link>, "/assets"),
    getItem(<Link to="/fleet">إدارة الأسطول</Link>, "/fleet"),
    getItem(<Link to="/realestate">العقارات</Link>, "/realestate"),
  ]),
  getItem("العمليات", "operations", <ProjectOutlined />, [
    getItem(<Link to="/projects">المشاريع</Link>, "/projects"),
    getItem(<Link to="/manufacturing">التصنيع</Link>, "/manufacturing"),
    getItem(<Link to="/supply-chain">سلسلة التوريد</Link>, "/supply-chain"),
    getItem(<Link to="/quality">إدارة الجودة</Link>, "/quality"),
    getItem(<Link to="/risks">إدارة المخاطر</Link>, "/risks"),
    getItem(<Link to="/tenders">المناقصات</Link>, "/tenders"),
  ]),
  getItem("نقطة البيع", "/pos", <AppstoreOutlined />),
  getItem("التجارة الإلكترونية", "/ecommerce", <GlobalOutlined />),
  getItem("الإعدادات", "settings", <SettingOutlined />, [
    getItem(<Link to="/branches">الفروع</Link>, "/branches"),
    getItem(<Link to="/users">المستخدمون</Link>, "/users"),
    getItem(<Link to="/roles">الأدوار</Link>, "/roles"),
    getItem(<Link to="/permissions">الصلاحيات</Link>, "/permissions"),
    getItem(<Link to="/settings">الإعدادات</Link>, "/settings"),
    getItem(<Link to="/audit-log">سجل التدقيق</Link>, "/audit-log"),
  ]),
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  useEffect(() => {
    document.title = "BI Management v3";
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  const userMenuItems: MenuProps["items"] = [
    { key: "profile", label: <Link to="/profile">الملف الشخصي</Link>, icon: <UserOutlined /> },
    { type: "divider" },
    { key: "logout", label: "تسجيل الخروج", icon: <LogoutOutlined />, danger: true, onClick: handleLogout },
  ];

  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path === "/") return ["/"];
    return [path];
  };

  const getOpenKeys = () => {
    const path = location.pathname;
    if (path.startsWith("/hr/")) return ["hr"];
    if (path.startsWith("/crm/")) return ["crm"];
    if (path.startsWith("/delivery/")) return ["delivery"];
    if (path.startsWith("/products") || path.startsWith("/categories") || path.startsWith("/warehouses")) return ["inventory"];
    if (path.startsWith("/purchases") || path.startsWith("/suppliers")) return ["purchases"];
    if (path.startsWith("/customers") || path.startsWith("/invoices") || path.startsWith("/quotations")) return ["sales"];
    if (path.startsWith("/accounts") || path.startsWith("/journal") || path.startsWith("/vouchers") || path.startsWith("/checks")) return ["finance"];
    if (path.startsWith("/tickets") || path.startsWith("/appointments")) return ["support"];
    if (path.startsWith("/tasks") || path.startsWith("/workflows") || path.startsWith("/notifications")) return ["workflow"];
    if (path.startsWith("/assets") || path.startsWith("/fleet")) return ["assets"];
    if (path.startsWith("/projects") || path.startsWith("/manufacturing") || path.startsWith("/quality")) return ["operations"];
    if (path.startsWith("/users") || path.startsWith("/roles") || path.startsWith("/settings") || path.startsWith("/branches")) return ["settings"];
    if (path === "/" || path.startsWith("/goals") || path.startsWith("/alerts") || path.startsWith("/analytics") || path.startsWith("/reports")) return ["home"];
    return [];
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div
        style={{
          padding: collapsed ? "16px 8px" : "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <img
          src="/assets/logo.svg"
          alt="BI"
          style={{ width: 40, height: 40, borderRadius: 8 }}
        />
        {!collapsed && (
          <div>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 16 }}>BI Management</div>
            <div style={{ color: "#64748b", fontSize: 11 }}>v3.0</div>
          </div>
        )}
      </div>

      {/* Menu */}
      <Menu
        mode="inline"
        theme="dark"
        selectedKeys={getSelectedKeys()}
        defaultOpenKeys={collapsed ? [] : getOpenKeys()}
        items={menuItems}
        style={{ 
          flex: 1, 
          borderRight: 0,
          background: "transparent",
          overflowY: "auto",
          overflowX: "hidden",
        }}
        onClick={() => isMobile && setMobileOpen(false)}
      />

      {/* User Section */}
      {!collapsed && (
        <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <Dropdown menu={{ items: userMenuItems }} trigger={["click"]} placement="topRight">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
                padding: "8px",
                borderRadius: "8px",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Avatar style={{ background: token.colorPrimary }} icon={<UserOutlined />} />
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>حسابي</div>
                <div style={{ color: "#64748b", fontSize: 12 }}>الملف الشخصي</div>
              </div>
            </div>
          </Dropdown>
        </div>
      )}
    </>
  );

  return (
    <AntLayout style={{ minHeight: "100vh" }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={260}
          collapsedWidth={80}
          style={{
            position: "fixed",
            right: 0,
            top: 0,
            bottom: 0,
            background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
          }}
          trigger={null}
        >
          {sidebarContent}
        </Sider>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          placement="right"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          width={280}
          styles={{ body: { padding: 0, background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)" } }}
        >
          {sidebarContent}
        </Drawer>
      )}

      <AntLayout style={{ marginRight: isMobile ? 0 : collapsed ? 80 : 260, transition: "margin 0.2s" }}>
        {/* Header */}
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            position: "sticky",
            top: 0,
            zIndex: 10,
            height: 64,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Button
              type="text"
              icon={isMobile ? <MenuUnfoldOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => (isMobile ? setMobileOpen(true) : setCollapsed(!collapsed))}
              style={{ fontSize: 18 }}
            />
            <Input
              placeholder="بحث... (Ctrl+K)"
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              style={{ width: 300, borderRadius: 8 }}
              onFocus={() => navigate("/search")}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Badge count={5} size="small">
              <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} onClick={() => navigate("/notifications")} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} trigger={["click"]}>
              <Avatar style={{ cursor: "pointer", background: token.colorPrimary }} icon={<UserOutlined />} />
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content style={{ padding: 24, minHeight: "calc(100vh - 64px)" }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
