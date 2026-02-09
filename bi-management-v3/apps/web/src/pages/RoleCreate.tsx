import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Form, Input, Button, message, Space, Checkbox } from "antd";
import { SaveOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { PageHeader } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type Permission = {
  id: string;
  code: string;
  nameAr: string;
  module: string;
  feature: string;
  action: string;
};

const COLORS = [
  { value: "#3B82F6", label: "أزرق", bg: "#dbeafe" },
  { value: "#22C55E", label: "أخضر", bg: "#dcfce7" },
  { value: "#EF4444", label: "أحمر", bg: "#fee2e2" },
  { value: "#F97316", label: "برتقالي", bg: "#ffedd5" },
  { value: "#8B5CF6", label: "بنفسجي", bg: "#f3e8ff" },
  { value: "#EC4899", label: "وردي", bg: "#fce7f3" },
  { value: "#14B8A6", label: "فيروزي", bg: "#ccfbf1" },
  { value: "#64748B", label: "رمادي", bg: "#f1f5f9" },
];

const SECURITY_LEVELS = [
  { value: 1, label: "عادي", desc: "صلاحيات محدودة للعرض فقط", color: "#22c55e" },
  { value: 2, label: "متوسط", desc: "صلاحيات إضافة وتعديل", color: "#3b82f6" },
  { value: 3, label: "عالي", desc: "صلاحيات كاملة ما عدا الإعدادات", color: "#f59e0b" },
  { value: 4, label: "حرج", desc: "صلاحيات إدارية متقدمة", color: "#ef4444" },
  { value: 5, label: "مدير عام", desc: "كافة الصلاحيات بدون قيود", color: "#8b5cf6" },
];

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

export default function RoleCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [color, setColor] = useState("#3B82F6");
  const [securityLevel, setSecurityLevel] = useState(1);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "إضافة دور | BI Management v3";

    // Load permissions
    fetch(`${API_BASE}/api/permissions?limit=200`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((res) => setPermissions(res.data || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/roles`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: values.name.trim(),
          nameAr: values.nameAr?.trim() || null,
          description: values.description?.trim() || null,
          color,
          securityLevel,
          permissions: selectedPermissions,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل إنشاء الدور");
      }

      message.success("تم إنشاء الدور بنجاح");
      navigate("/roles");
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePermission = (permId: string) => {
    setSelectedPermissions((prev) => (prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]));
  };

  const toggleModulePermissions = (module: string) => {
    const modulePerms = permissions.filter((p) => p.module === module).map((p) => p.id);
    const allSelected = modulePerms.every((p) => selectedPermissions.includes(p));

    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((p) => !modulePerms.includes(p)));
    } else {
      setSelectedPermissions((prev) => [...new Set([...prev, ...modulePerms])]);
    }
  };

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const selectedColor = COLORS.find((c) => c.value === color);
  const selectedLevel = SECURITY_LEVELS.find((l) => l.value === securityLevel);

  const name = Form.useWatch("name", form);
  const nameAr = Form.useWatch("nameAr", form);

  return (
    <div>
      <PageHeader
        title="إضافة دور جديد"
        subtitle="تعريف دور جديد مع صلاحياته"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "الأدوار", path: "/roles" },
          { label: "إضافة دور جديد" },
        ]}
        extra={
          <span
            style={{
              padding: "0.5rem 1rem",
              background: selectedColor?.bg || "#dbeafe",
              color: color,
              borderRadius: "8px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            🛡️ دور جديد
          </span>
        }
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={[24, 24]}>
          {/* Basic Info */}
          <Col xs={24} lg={12}>
            <Card title="معلومات الدور">
              <Form.Item
                label="اسم الدور (بالإنجليزية)"
                name="name"
                rules={[{ required: true, message: "يرجى إدخال اسم الدور بالإنجليزية" }]}
              >
                <Input placeholder="مثال: sales_manager" style={{ fontFamily: "monospace" }} />
              </Form.Item>

              <Form.Item label="اسم الدور (بالعربية)" name="nameAr">
                <Input placeholder="مثال: مدير المبيعات" />
              </Form.Item>

              <Form.Item label="الوصف" name="description">
                <Input.TextArea
                  placeholder="وصف مختصر لمهام ومسؤوليات هذا الدور..."
                  rows={3}
                />
              </Form.Item>
            </Card>
          </Col>

          {/* Color & Security */}
          <Col xs={24} lg={12}>
            <Card title="المظهر والأمان">
              <Form.Item label="اللون المميز">
                <Space wrap>
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "10px",
                        background: c.value,
                        border: color === c.value ? "3px solid #0f172a" : "2px solid transparent",
                        cursor: "pointer",
                        boxShadow: color === c.value ? "0 4px 12px rgba(0,0,0,0.2)" : "none",
                        transform: color === c.value ? "scale(1.1)" : "scale(1)",
                        transition: "all 0.15s",
                      }}
                      title={c.label}
                    />
                  ))}
                </Space>
              </Form.Item>

              <Form.Item label="مستوى الأمان">
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {SECURITY_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setSecurityLevel(level.value)}
                      style={{
                        padding: "0.75rem 1rem",
                        background: securityLevel === level.value ? `${level.color}15` : "#f8fafc",
                        border: `2px solid ${securityLevel === level.value ? level.color : "#e2e8f0"}`,
                        borderRadius: "8px",
                        cursor: "pointer",
                        textAlign: "right",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: securityLevel === level.value ? level.color : "#334155" }}>
                          {level.label} ({level.value})
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{level.desc}</div>
                      </div>
                      {securityLevel === level.value && (
                        <span style={{ color: level.color, fontSize: "1.25rem" }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </Form.Item>
            </Card>
          </Col>
        </Row>

        {/* Permissions */}
        {permissions.length > 0 && (
          <Card title="الصلاحيات" style={{ marginTop: 24 }} extra={
            <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
              تم اختيار {selectedPermissions.length} من {permissions.length}
            </span>
          }>
            <div style={{ display: "grid", gap: "1rem" }}>
              {Object.entries(groupedPermissions).map(([module, perms]) => {
                const moduleSelected = perms.filter((p) => selectedPermissions.includes(p.id)).length;
                const allSelected = moduleSelected === perms.length;

                return (
                  <div key={module} style={{ background: "#f8fafc", borderRadius: "10px", overflow: "hidden" }}>
                    <div
                      style={{
                        padding: "0.85rem 1rem",
                        background: "#e2e8f0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                      onClick={() => toggleModulePermissions(module)}
                    >
                      <span style={{ fontWeight: 600 }}>{MODULE_LABELS[module] || module}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          {moduleSelected}/{perms.length}
                        </span>
                        <Checkbox
                          checked={allSelected}
                          indeterminate={moduleSelected > 0 && !allSelected}
                          onChange={() => toggleModulePermissions(module)}
                        />
                      </div>
                    </div>
                    <div style={{ padding: "0.75rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.5rem" }}>
                      {perms.map((perm) => (
                        <div
                          key={perm.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.5rem",
                            background: selectedPermissions.includes(perm.id) ? "#dbeafe" : "#fff",
                            borderRadius: "6px",
                            cursor: "pointer",
                            border: `1px solid ${selectedPermissions.includes(perm.id) ? "#3b82f6" : "#e2e8f0"}`,
                          }}
                          onClick={() => togglePermission(perm.id)}
                        >
                          <Checkbox checked={selectedPermissions.includes(perm.id)} />
                          <span style={{ fontSize: "0.875rem" }}>{perm.nameAr}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Preview */}
        {(name || nameAr) && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1.25rem",
              background: selectedColor?.bg || "#f8fafc",
              borderRadius: "12px",
              borderRight: `4px solid ${color}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "1.1rem", color: "#1e293b" }}>{nameAr || name}</div>
                {nameAr && <div style={{ fontSize: "0.875rem", color: "#64748b" }}>{name}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span
                  style={{
                    padding: "0.25rem 0.6rem",
                    background: selectedLevel?.color || "#64748b",
                    color: "#fff",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                  }}
                >
                  L{securityLevel}
                </span>
                <span style={{ fontSize: "0.875rem", color: "#64748b" }}>{selectedPermissions.length} صلاحية</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <Button size="large" onClick={() => navigate("/roles")} icon={<ArrowRightOutlined />}>
            إلغاء
          </Button>
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            loading={submitting}
            icon={<SaveOutlined />}
            style={{
              background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
              boxShadow: `0 4px 12px ${color}40`,
            }}
          >
            إضافة الدور
          </Button>
        </div>
      </Form>
    </div>
  );
}
