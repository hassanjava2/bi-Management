import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, InputNumber, DatePicker, message, Space } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { PageHeader } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import dayjs from "dayjs";

type Department = { id: string; name: string };
type Position = { id: string; name: string };
type User = { id: string; fullName: string; email: string | null };

export default function EmployeeCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "إضافة موظف | BI Management v3";

    Promise.all([
      fetch(`${API_BASE}/api/users?limit=500`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/departments?limit=500`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/positions?limit=500`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([usersRes, deptsRes, posRes]) => {
        setUsers(usersRes.items || usersRes.data || []);
        setDepartments(deptsRes.items || []);
        setPositions(posRes.items || []);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (values: Record<string, unknown>) => {
    const employeeCode = (values.employeeCode as string)?.trim();
    if (!employeeCode) {
      message.error("يرجى إدخال كود الموظف");
      return;
    }

    setSubmitting(true);
    try {
      const hireDate = values.hireDate ? (values.hireDate as dayjs.Dayjs).format("YYYY-MM-DD") : null;

      const res = await fetch(`${API_BASE}/api/employees`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          employeeCode,
          userId: values.userId || null,
          departmentId: values.departmentId || null,
          positionId: values.positionId || null,
          salary: values.salary ? Number(values.salary) : null,
          salaryType: values.salaryType,
          workStartTime: values.workStartTime,
          workEndTime: values.workEndTime,
          hireDate,
          contractType: values.contractType,
          bankName: (values.bankName as string)?.trim() || null,
          bankAccount: (values.bankAccount as string)?.trim() || null,
          emergencyContact: (values.emergencyContact as string)?.trim() || null,
          emergencyPhone: (values.emergencyPhone as string)?.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل إنشاء الموظف");
      }

      message.success("تم إضافة الموظف بنجاح");
      navigate("/hr/employees");
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: "الرئيسية", href: "/" },
    { label: "الموارد البشرية", href: "/hr" },
    { label: "الموظفين", href: "/hr/employees" },
    { label: "إضافة موظف" },
  ];

  return (
    <div>
      <PageHeader
        title="إضافة موظف جديد"
        subtitle="إنشاء ملف موظف جديد في النظام"
        breadcrumbs={breadcrumbs}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          salaryType: "monthly",
          workStartTime: "08:00",
          workEndTime: "16:00",
          hireDate: dayjs(),
          contractType: "permanent",
        }}
        style={{ maxWidth: 900 }}
      >
        {/* Basic Info */}
        <Card title="المعلومات الأساسية" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="employeeCode"
                label="كود الموظف"
                rules={[{ required: true, message: "يرجى إدخال كود الموظف" }]}
              >
                <Input placeholder="EMP-001" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="userId" label="ربط بمستخدم">
                <Select
                  placeholder="اختر مستخدم (اختياري)"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={users.map((u) => ({
                    label: `${u.fullName}${u.email ? ` (${u.email})` : ""}`,
                    value: u.id,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="departmentId" label="القسم">
                <Select
                  placeholder="اختر القسم"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={departments.map((d) => ({
                    label: d.name,
                    value: d.id,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="positionId" label="المنصب">
                <Select
                  placeholder="اختر المنصب"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={positions.map((p) => ({
                    label: p.name,
                    value: p.id,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Employment Info */}
        <Card title="معلومات التوظيف" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="hireDate" label="تاريخ التعيين">
                <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="contractType" label="نوع العقد">
                <Select
                  options={[
                    { label: "دائم", value: "permanent" },
                    { label: "عقد محدد", value: "contract" },
                    { label: "دوام جزئي", value: "part_time" },
                    { label: "مؤقت", value: "temporary" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="workStartTime" label="بداية الدوام">
                <Input type="time" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="workEndTime" label="نهاية الدوام">
                <Input type="time" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Salary Info */}
        <Card title="معلومات الراتب" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="salary" label="الراتب الأساسي">
                <InputNumber min={0} style={{ width: "100%" }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="salaryType" label="نوع الراتب">
                <Select
                  options={[
                    { label: "شهري", value: "monthly" },
                    { label: "أسبوعي", value: "weekly" },
                    { label: "يومي", value: "daily" },
                    { label: "بالساعة", value: "hourly" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="bankName" label="اسم البنك">
                <Input placeholder="اسم البنك" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="bankAccount" label="رقم الحساب البنكي">
                <Input placeholder="رقم الحساب" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Emergency Contact */}
        <Card title="جهة الاتصال في الطوارئ" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="emergencyContact" label="الاسم">
                <Input placeholder="اسم الشخص" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="emergencyPhone" label="رقم الهاتف">
                <Input placeholder="07xxxxxxxxx" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Actions */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
          <Space>
            <Button onClick={() => navigate("/hr/employees")}>إلغاء</Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
              إضافة الموظف
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
}
