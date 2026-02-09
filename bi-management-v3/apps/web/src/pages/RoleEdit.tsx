import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Row, Col, Card, Form, Input, Button, Checkbox, message, Space, Tag, Alert, Tooltip } from "antd";
import { SaveOutlined, ArrowRightOutlined, LockOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type Permission = {
  id: string;
  code: string;
  nameAr: string;
  module: string;
  feature: string;
  action: string;
};

type RolePermission = {
  permission: { id: string };
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

export default function RoleEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [color, setColor] = useState("#3B82F6");
  const [securityLevel, setSecurityLevel] = useState(1);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isSystem, setIsSystem] = useState(false);
  const [usersCount, setUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "تعديل دور | BI Management v3";

    Promise.all([
      fetch(`${API_BASE}/api/roles/${id}`, { headers: getAuthHeaders() }),
      fetch(`${API_BASE}/api/permissions?limit=200`, { headers: getAuthHeaders() }),
    ])
      .then(async ([roleRes, permRes]) => {
        const roleData = await roleRes.json();
        const permData = await permRes.json();

        form.setFieldsValue({
          name: roleData.name || "",
          nameAr: roleData.nameAr || "",
          description: roleData.description || "",
        });
        setColor(roleData.color || "#3B82F6");
        setSecurityLevel(roleData.securityLevel || 1);
        setIsSystem(roleData.isSystem === 1);
        setUsersCount(roleData._count?.userRoles || 0);

        if (roleData.rolePermissions) {
          setSelectedPermissions(roleData.rolePermissions.map((rp: RolePermission) => rp.permission.id));
        }

        setPermissions(permData.data || []);
      })
      .catch((err) => message.error(err.message))
      .finally(() => setLoading(false));
  }, [id, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/roles/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: (values.name as string).trim(),
          nameAr: (values.nameAr as string)?.trim() || null,
          description: (values.description as string)?.trim() || null,
          color,
          securityLevel,
          permissions: selectedPermissions,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث الدور");
      }

      message.success("تم تحديث الدور بنجاح");
      navigate("/roles");
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePermission = (permId: string) => {
    if (isSystem) return;
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const toggleModulePermissions = (module: string) => {
    if (isSystem) return;
    const modulePerms = permissions.filter((p) => p.module === module).map((p) => p.id);
    const allSelected = modulePerms.every((p) => selectedPermissions.includes(p));

    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((p) => !modulePerms.includes(p)));
    } else {
      setSelectedPermissions((prev) => [...new Set([...prev, ...modulePerms])]);
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const selectedColor = COLORS.find((c) => c.value === color);
  const selectedLevel = SECURITY_LEVELS.find((l) => l.value === securityLevel);
  const nameAr = Form.useWatch("nameAr", form);
  const name = Form.useWatch("name", form);

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="تعديل الدور"
        subtitle={
          <Space>
            <span>{nameAr || name}</span>
            {usersCount > 0 && <Tag>{usersCount} مستخدم</Tag>}
            {isSystem && (
              <Tag icon={<LockOutlined />} color="warning">
                دور نظام
              </Tag>
            )}
          </Space>
        }
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "الأدوار", path: "/roles" },
          { label: "تعديل الدور" },
        ]}
        extra={
          <Space>
            <Tag
              style={{
                padding: "4px 12px",
                background: selectedColor?.bg || "#dbeafe",
                color: color,
                fontWeight: 600,
                border: "none",
              }}
            >
              {nameAr || name}
            </Tag>
            <Button icon={<ArrowRightOutlined />} onClick={() => navigate("/roles")}>
              العودة للأدوار
            </Button>
          </Space>
        }
      />

      {isSystem && (
        <Alert
          message="هذا دور مضمن في النظام ولا يمكن تعديله"
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={24}>
          <Col xs={24} lg={12}>
            <Card
              title="معلومات الدور"
              style={{ marginBottom: 24, opacity: isSystem ? 0.7 : 1 }}
            >
              <Form.Item
                name="name"
                label="اسم الدور (بالإنجليزية)"
                rules={[{ required: true, message: "يرجى إدخال اسم الدور" }]}
              >
                <Input
                  placeholder="مثال: accountant"
                  disabled={isSystem}
                  style={{ fontFamily: "monospace" }}
                />
              </Form.Item>

              <Form.Item name="nameAr" label="اسم الدور (بالعربية)">
                <Input placeholder="مثال: محاسب" disabled={isSystem} />
              </Form.Item>

              <Form.Item name="description" label="الوصف">
                <Input.TextArea
                  placeholder="وصف مختصر للدور..."
                  rows={3}
                  disabled={isSystem}
                />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title="المظهر والأمان"
              style={{ marginBottom: 24, opacity: isSystem ? 0.7 : 1 }}
            >
              <Form.Item label="اللون المميز">
                <Space wrap>
                  {COLORS.map((c) => (
                    <Tooltip key={c.value} title={c.label}>
                      <div
                        onClick={() => !isSystem && setColor(c.value)}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: c.value,
                          border: color === c.value ? "3px solid #0f172a" : "2px solid transparent",
                          cursor: isSystem ? "not-allowed" : "pointer",
                          boxShadow: color === c.value ? "0 4px 12px rgba(0,0,0,0.2)" : "none",
                          transform: color === c.value ? "scale(1.1)" : "scale(1)",
                          transition: "all 0.15s",
                          opacity: isSystem ? 0.5 : 1,
                        }}
                      />
                    </Tooltip>
                  ))}
                </Space>
              </Form.Item>

              <Form.Item label="مستوى الأمان">
                <div style={{ display: "grid", gap: 8 }}>
                  {SECURITY_LEVELS.map((level) => (
                    <div
                      key={level.value}
                      onClick={() => !isSystem && setSecurityLevel(level.value)}
                      style={{
                        padding: "12px 16px",
                        background: securityLevel === level.value ? `${level.color}15` : "#f8fafc",
                        border: `2px solid ${securityLevel === level.value ? level.color : "#e2e8f0"}`,
                        borderRadius: 8,
                        cursor: isSystem ? "not-allowed" : "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        opacity: isSystem ? 0.6 : 1,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: securityLevel === level.value ? level.color : "#334155",
                          }}
                        >
                          {level.label} ({level.value})
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{level.desc}</div>
                      </div>
                      {securityLevel === level.value && (
                        <span style={{ color: level.color, fontSize: "1.25rem" }}>✓</span>
                      )}
                    </div>
                  ))}
                </div>
              </Form.Item>
            </Card>
          </Col>
        </Row>

        {permissions.length > 0 && (
          <Card
            title="الصلاحيات"
            extra={
              <span style={{ color: "#64748b" }}>
                تم اختيار {selectedPermissions.length} من {permissions.length}
              </span>
            }
            style={{ marginBottom: 24, opacity: isSystem ? 0.7 : 1 }}
          >
            <div style={{ display: "grid", gap: 16 }}>
              {Object.entries(groupedPermissions).map(([module, perms]) => {
                const moduleSelected = perms.filter((p) => selectedPermissions.includes(p.id)).length;
                const allSelected = moduleSelected === perms.length;

                return (
                  <div
                    key={module}
                    style={{ background: "#f8fafc", borderRadius: 10, overflow: "hidden" }}
                  >
                    <div
                      style={{
                        padding: "12px 16px",
                        background: "#e2e8f0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: isSystem ? "not-allowed" : "pointer",
                      }}
                      onClick={() => toggleModulePermissions(module)}
                    >
                      <span style={{ fontWeight: 600 }}>{MODULE_LABELS[module] || module}</span>
                      <Space>
                        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          {moduleSelected}/{perms.length}
                        </span>
                        <Checkbox
                          checked={allSelected}
                          indeterminate={moduleSelected > 0 && !allSelected}
                          disabled={isSystem}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleModulePermissions(module)}
                        />
                      </Space>
                    </div>
                    <div
                      style={{
                        padding: 12,
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: 8,
                      }}
                    >
                      {perms.map((perm) => (
                        <div
                          key={perm.id}
                          onClick={() => togglePermission(perm.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: 8,
                            background: selectedPermissions.includes(perm.id) ? "#dbeafe" : "#fff",
                            borderRadius: 6,
                            cursor: isSystem ? "not-allowed" : "pointer",
                            border: `1px solid ${selectedPermissions.includes(perm.id) ? "#3b82f6" : "#e2e8f0"}`,
                            opacity: isSystem ? 0.7 : 1,
                          }}
                        >
                          <Checkbox
                            checked={selectedPermissions.includes(perm.id)}
                            disabled={isSystem}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => togglePermission(perm.id)}
                          />
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

        {/* Preview Card */}
        <Card
          style={{
            marginBottom: 24,
            background: selectedColor?.bg || "#f8fafc",
            borderRight: `4px solid ${color}`,
          }}
          bodyStyle={{ padding: "16px 20px" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "1.1rem", color: "#1e293b" }}>
                {nameAr || name}
              </div>
              {nameAr && <div style={{ fontSize: "0.875rem", color: "#64748b" }}>{name}</div>}
            </div>
            <Space>
              {usersCount > 0 && (
                <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
                  {usersCount} مستخدم
                </span>
              )}
              <Tag
                style={{
                  background: selectedLevel?.color || "#64748b",
                  color: "#fff",
                  border: "none",
                }}
              >
                L{securityLevel}
              </Tag>
              <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
                {selectedPermissions.length} صلاحية
              </span>
            </Space>
          </div>
        </Card>

        {!isSystem && (
          <Space>
            <Button onClick={() => navigate("/roles")}>إلغاء</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              icon={<SaveOutlined />}
              style={{
                background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
                borderColor: color,
              }}
            >
              حفظ التعديلات
            </Button>
          </Space>
        )}
      </Form>
    </div>
  );
}
