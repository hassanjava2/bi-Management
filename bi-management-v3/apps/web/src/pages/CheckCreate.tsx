import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Form, Input, Select, Button, InputNumber, DatePicker, message, Space, Radio } from "antd";
import { SaveOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { PageHeader } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";
import dayjs from "dayjs";

type Customer = {
  id: string;
  nameAr: string;
  code: string;
};

type Supplier = {
  id: string;
  nameAr: string;
  code: string;
};

type BankAccount = {
  id: string;
  accountName: string;
  bankName: string;
};

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string; partyLabel: string }> = {
  incoming: { label: "شيك وارد", color: "#1d4ed8", bg: "#dbeafe", icon: "📥", partyLabel: "من العميل" },
  outgoing: { label: "شيك صادر", color: "#b45309", bg: "#fef3c7", icon: "📤", partyLabel: "إلى المورد" },
};

export default function CheckCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [type, setType] = useState("incoming");
  const [submitting, setSubmitting] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // For preview
  const [previewData, setPreviewData] = useState({ amount: 0, checkNumber: "", dueDate: "" });

  useEffect(() => {
    document.title = "إضافة شيك | BI Management v3";

    // Load related data
    Promise.all([
      fetch(`${API_BASE}/api/customers?limit=200`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/suppliers?limit=200`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/bank-accounts?limit=50`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([customersRes, suppliersRes, bankRes]) => {
        setCustomers(customersRes.data || []);
        setSuppliers(suppliersRes.data || []);
        setBankAccounts(bankRes.data || []);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/checks`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          checkNumber: values.checkNumber.trim(),
          type,
          amount: values.amount,
          bankName: values.bankName?.trim() || null,
          accountNumber: values.accountNumber?.trim() || null,
          issueDate: values.issueDate ? values.issueDate.format("YYYY-MM-DD") : null,
          dueDate: values.dueDate.format("YYYY-MM-DD"),
          payee: values.payee?.trim() || null,
          drawer: values.drawer?.trim() || null,
          customerId: values.customerId || null,
          supplierId: values.supplierId || null,
          bankAccountId: values.bankAccountId || null,
          description: values.description?.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل إنشاء الشيك");
      }

      const created = await res.json();
      message.success("تم إنشاء الشيك بنجاح");
      navigate(`/checks/${created.id}`);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleValuesChange = (_: any, allValues: any) => {
    setPreviewData({
      amount: allValues.amount || 0,
      checkNumber: allValues.checkNumber || "",
      dueDate: allValues.dueDate ? allValues.dueDate.format("YYYY-MM-DD") : "",
    });
  };

  const typeConfig = TYPE_CONFIG[type];

  const breadcrumbs = [
    { title: "الشيكات", path: "/checks" },
    { title: "إضافة شيك جديد" },
  ];

  return (
    <div>
      <PageHeader
        title="إضافة شيك جديد"
        breadcrumbs={breadcrumbs}
        extra={
          <span
            style={{
              padding: "0.5rem 1rem",
              background: typeConfig.bg,
              color: typeConfig.color,
              borderRadius: "8px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>{typeConfig.icon}</span>
            {typeConfig.label}
          </span>
        }
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={handleValuesChange}
        initialValues={{ type: "incoming" }}
      >
        <Row gutter={[24, 24]}>
          {/* Check Info Card */}
          <Col xs={24} lg={12}>
            <Card title="معلومات الشيك">
              <Form.Item label="نوع الشيك" required>
                <Radio.Group
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  buttonStyle="solid"
                  style={{ width: "100%" }}
                >
                  {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                    <Radio.Button
                      key={key}
                      value={key}
                      style={{ width: "50%", textAlign: "center" }}
                    >
                      <span>{config.icon}</span> {config.label}
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="checkNumber"
                    label="رقم الشيك"
                    rules={[{ required: true, message: "يرجى إدخال رقم الشيك" }]}
                  >
                    <Input placeholder="أدخل رقم الشيك" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="amount"
                    label="المبلغ"
                    rules={[
                      { required: true, message: "يرجى إدخال المبلغ" },
                      { type: "number", min: 0.01, message: "يرجى إدخال مبلغ صحيح" },
                    ]}
                  >
                    <InputNumber
                      placeholder="أدخل المبلغ"
                      style={{ width: "100%" }}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                      parser={(value) => value!.replace(/\$\s?|(,*)/g, "") as any}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="bankName" label="اسم البنك">
                    <Input placeholder="اسم البنك" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="accountNumber" label="رقم الحساب">
                    <Input placeholder="رقم حساب البنك" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Dates & Party Card */}
          <Col xs={24} lg={12}>
            <Card title="التواريخ والأطراف">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="issueDate" label="تاريخ الإصدار">
                    <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="dueDate"
                    label="تاريخ الاستحقاق"
                    rules={[{ required: true, message: "يرجى إدخال تاريخ الاستحقاق" }]}
                  >
                    <DatePicker style={{ width: "100%" }} placeholder="اختر التاريخ" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="payee" label="المستفيد">
                    <Input placeholder="اسم المستفيد" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="drawer" label="الساحب">
                    <Input placeholder="اسم الساحب" />
                  </Form.Item>
                </Col>
              </Row>

              {type === "incoming" && customers.length > 0 && (
                <Form.Item name="customerId" label={typeConfig.partyLabel}>
                  <Select
                    placeholder="-- اختر العميل --"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                  >
                    {customers.map((c) => (
                      <Select.Option key={c.id} value={c.id}>
                        {c.nameAr} ({c.code})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}

              {type === "outgoing" && suppliers.length > 0 && (
                <Form.Item name="supplierId" label={typeConfig.partyLabel}>
                  <Select
                    placeholder="-- اختر المورد --"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                  >
                    {suppliers.map((s) => (
                      <Select.Option key={s.id} value={s.id}>
                        {s.nameAr} ({s.code})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}

              {bankAccounts.length > 0 && (
                <Form.Item name="bankAccountId" label="الحساب البنكي المرتبط">
                  <Select
                    placeholder="-- اختر الحساب --"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                  >
                    {bankAccounts.map((ba) => (
                      <Select.Option key={ba.id} value={ba.id}>
                        {ba.accountName} - {ba.bankName}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}

              <Form.Item name="description" label="الوصف / ملاحظات">
                <Input.TextArea rows={3} placeholder="أضف وصفاً أو ملاحظات..." />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        {/* Preview Card */}
        {previewData.amount > 0 && previewData.checkNumber && (
          <Card
            style={{
              marginTop: 24,
              background: typeConfig.bg,
              border: `2px solid ${typeConfig.color}30`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>{typeConfig.icon}</span>
                  <span style={{ fontSize: "0.9rem", color: typeConfig.color, fontWeight: 600 }}>{typeConfig.label}</span>
                </div>
                <div style={{ fontSize: "1rem", color: "#64748b" }}>شيك رقم: {previewData.checkNumber}</div>
                {previewData.dueDate && (
                  <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                    يستحق: {new Date(previewData.dueDate).toLocaleDateString("ar-IQ")}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: typeConfig.color }}>
                  {previewData.amount.toLocaleString()} IQD
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div style={{ marginTop: 24, display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <Button onClick={() => navigate("/checks")} icon={<ArrowRightOutlined />}>
            إلغاء
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            icon={<SaveOutlined />}
            style={{
              background: typeConfig.color,
            }}
          >
            حفظ الشيك
          </Button>
        </div>
      </Form>
    </div>
  );
}
