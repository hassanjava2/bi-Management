import { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Input,
  Select,
  Tag,
  Space,
  Statistic,
  Badge,
  Collapse,
} from "antd";
import {
  LockOutlined,
  SearchOutlined,
  AppstoreOutlined,
  EyeOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type Permission = {
  id: string;
  code: string;
  nameAr: string;
  module: string;
  feature: string;
  action: string;
  securityLevel: number | null;
};

const MODULE_LABELS: Record<string, string> = {
  products: "المنتجات",
  customers: "العملاء",
  suppliers: "الموردين",
  invoices: "الفواتير",
  finance: "المالية",
  users: "المستخدمين",
  settings: "الإعدادات",
  reports: "التقارير",
};

const MODULE_ICONS: Record<string, React.ReactNode> = {
  products: <AppstoreOutlined />,
  customers: <AppstoreOutlined />,
  suppliers: <AppstoreOutlined />,
  invoices: <AppstoreOutlined />,
  finance: <AppstoreOutlined />,
  users: <AppstoreOutlined />,
  settings: <AppstoreOutlined />,
  reports: <AppstoreOutlined />,
};

const ACTION_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  view: { color: "blue", icon: <EyeOutlined /> },
  create: { color: "green", icon: <PlusOutlined /> },
  edit: { color: "gold", icon: <EditOutlined /> },
  delete: { color: "red", icon: <DeleteOutlined /> },
  export: { color: "purple", icon: <ExportOutlined /> },
};

export default function Permissions() {
  const [data, setData] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("");

  useEffect(() => {
    document.title = "الصلاحيات | BI Management v3";
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/api/permissions?limit=200`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((res) => setData(res.data || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Group by module
  const groupedData = data.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const filteredModules = Object.keys(groupedData).filter((mod) => {
    if (moduleFilter && mod !== moduleFilter) return false;
    return true;
  });

  const filteredPermissions = (perms: Permission[]) => {
    if (!filter) return perms;
    const lowerFilter = filter.toLowerCase();
    return perms.filter(
      (p) =>
        p.nameAr.toLowerCase().includes(lowerFilter) ||
        p.code.toLowerCase().includes(lowerFilter) ||
        p.feature.toLowerCase().includes(lowerFilter)
    );
  };

  const modules = [...new Set(data.map((p) => p.module))];

  const moduleOptions = modules.map((mod) => ({
    value: mod,
    label: MODULE_LABELS[mod] || mod,
  }));

  if (loading) {
    return (
      <div>
        <PageHeader
          title="الصلاحيات"
          subtitle="قائمة صلاحيات النظام المتاحة للأدوار المختلفة"
          breadcrumbs={[{ title: "الإعدادات", href: "/settings" }, { title: "الصلاحيات" }]}
        />
        <LoadingSkeleton type="list" rows={5} />
      </div>
    );
  }

  const collapseItems = filteredModules
    .map((module) => {
      const perms = filteredPermissions(groupedData[module]);
      if (perms.length === 0) return null;

      return {
        key: module,
        label: (
          <Space>
            {MODULE_ICONS[module] || <AppstoreOutlined />}
            <span style={{ fontWeight: 500 }}>{MODULE_LABELS[module] || module}</span>
            <Badge count={perms.length} style={{ backgroundColor: "#8c8c8c" }} />
          </Space>
        ),
        children: (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {perms.map((perm) => {
              const actionConfig = ACTION_CONFIG[perm.action] || { color: "default", icon: null };
              return (
                <Card
                  key={perm.id}
                  size="small"
                  styles={{ body: { padding: "12px 16px" } }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>{perm.nameAr}</div>
                      <div style={{ fontSize: 12, color: "#8c8c8c" }}>{perm.code}</div>
                    </div>
                    <Space>
                      <Tag icon={actionConfig.icon} color={actionConfig.color}>
                        {perm.action}
                      </Tag>
                      {perm.securityLevel && perm.securityLevel > 1 && (
                        <Tag color="warning" title="مستوى الأمان">
                          L{perm.securityLevel}
                        </Tag>
                      )}
                    </Space>
                  </div>
                </Card>
              );
            })}
          </div>
        ),
      };
    })
    .filter(Boolean) as { key: string; label: React.ReactNode; children: React.ReactNode }[];

  return (
    <div>
      <PageHeader
        title="الصلاحيات"
        subtitle="قائمة صلاحيات النظام المتاحة للأدوار المختلفة"
        breadcrumbs={[{ title: "الإعدادات", href: "/settings" }, { title: "الصلاحيات" }]}
        extra={
          <Space>
            <LockOutlined style={{ fontSize: 20, color: "#8c8c8c" }} />
          </Space>
        }
      />

      {error && (
        <Card style={{ marginBottom: 16, borderColor: "#ff4d4f" }}>
          <div style={{ color: "#ff4d4f" }}>{error}</div>
        </Card>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Input
              placeholder="بحث في الصلاحيات..."
              prefix={<SearchOutlined />}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={12}>
            <Select
              placeholder="جميع الموديولات"
              value={moduleFilter || undefined}
              onChange={(value) => setModuleFilter(value || "")}
              options={[{ value: "", label: "جميع الموديولات" }, ...moduleOptions]}
              style={{ width: "100%" }}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      {/* Permissions List */}
      <Collapse
        items={collapseItems}
        defaultActiveKey={filteredModules.slice(0, 2)}
        style={{ background: "transparent", border: "none" }}
      />

      {/* Stats */}
      {data.length > 0 && (
        <Card style={{ marginTop: 24 }}>
          <Row gutter={24}>
            <Col xs={12} md={6}>
              <Statistic
                title="إجمالي الصلاحيات"
                value={data.length}
                prefix={<LockOutlined />}
              />
            </Col>
            <Col xs={12} md={6}>
              <Statistic
                title="الموديولات"
                value={modules.length}
                prefix={<AppstoreOutlined />}
              />
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
}
