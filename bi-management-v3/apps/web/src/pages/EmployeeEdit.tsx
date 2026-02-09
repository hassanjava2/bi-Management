import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, InputNumber, DatePicker, Switch, message, Space, Alert } from "antd";
import { SaveOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import dayjs from "dayjs";

type Department = { id: string; name: string };
type Position = { id: string; name: string };
type User = { id: string; fullName: string; email: string | null };

export default function EmployeeEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "تعديل موظف | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      setError("معرف الموظف مطلوب");
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`${API_BASE}/api/employees/${id}`, { headers: getAuthHeaders() }).then((r) => {
        if (!r.ok) throw new Error("الموظف غير موجود");
        return r.json();
      }),
      fetch(`${API_BASE}/api/users?limit=500`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/departments?limit=500`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/positions?limit=500`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([data, usersRes, deptsRes, posRes]) => {
        setEmployeeName(data.user?.fullName || data.employeeCode || "موظف");
        setUsers(usersRes.items || usersRes.data || []);
        setDepartments(deptsRes.items || []);
        setPositions(posRes.items || []);
        
        form.setFieldsValue({
          employeeCode: data.employeeCode || "",
          userId: data.userId || undefined,
          departmentId: data.departmentId || undefined,
          positionId: data.positionId || undefined,
          salary: data.salary || 0,
          salaryType: data.salaryType || "monthly",
          workStartTime: data.workStartTime || "08:00",
          workEndTime: data.workEndTime || "16:00",
          hireDate: data.hireDate ? dayjs(data.hireDate) : null,
          contractType: data.contractType || "permanent",
          bankName: data.bankName || "",
          bankAccount: data.bankAccount || "",
          emergencyContact: data.emergencyContact || "",
          emergencyPhone: data.emergencyPhone || "",
          isActive: data.isActive === 1,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const hireDate = values.hireDate ? (values.hireDate as dayjs.Dayjs).format("YYYY-MM-DD") : null;

      const res = await fetch(`${API_BASE}/api/employees/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          employeeCode: (values.employeeCode as string)?.trim(),
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
          isActive: values.isActive ? 1 : 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل تحديث الموظف");
      }

      message.success("تم تحديث بيانات الموظف بنجاح");
      navigate(`/hr/employees/${id}`);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="تعديل الموظف"
          breadcrumbs={[
            { title: "الموارد البشرية" },
            { title: "الموظفين", href: "/hr/employees" },
            { title: "تعديل" },
          ]}
        />
        <LoadingSkeleton type="form" rows={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="تعديل الموظف"
          breadcrumbs={[
            { title: "الموارد البشرية" },
            { title: "الموظفين", href: "/hr/employees" },
            { title: "خطأ" },
          ]}
        />
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="link" onClick={() => navigate("/hr/employees")}>
              العودة للموظفين
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`تعديل الموظف: ${employeeName}`}
        breadcrumbs={[
          { title: "الموارد البشرية" },
          { title: "الموظفين", href: "/hr/employees" },
          { title: employeeName, href: `/hr/employees/${id}` },
          { title: "تعديل" },
        ]}
        extra={
          <Button icon={<ArrowRightOutlined />} onClick={() => navigate(`/hr/employees/${id}`)}>
            العودة للتفاصيل
          </Button>
        }
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ maxWidth: 900 }}>
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
            <Col xs={12} sm={6}>
              <Form.Item name="isActive" label="نشط" valuePropName="checked">
                <Switch checkedChildren="نعم" unCheckedChildren="لا" />
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
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="0"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                />
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
        <Space>
          <Button onClick={() => navigate(`/hr/employees/${id}`)}>إلغاء</Button>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
            حفظ التعديلات
          </Button>
        </Space>
      </Form>
    </div>
  );
}
