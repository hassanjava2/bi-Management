/**
 * منشئ التقارير المتقدم
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Table, Button, Input, Select, Tag, Space, message, Form, Checkbox, Steps, Empty } from "antd";
import {
  ArrowRightOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  PlayCircleOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { PageHeader } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Column {
  field: string;
  label: string;
  type: string;
  selected: boolean;
}

interface Filter {
  field: string;
  operator: string;
  value: any;
}

const DATA_SOURCES = [
  { id: "inventory_summary", name: "ملخص المخزون", icon: "📦" },
  { id: "purchases_report", name: "المشتريات", icon: "🛒" },
  { id: "sales_report", name: "المبيعات", icon: "💰" },
  { id: "serial_movements_report", name: "حركة السيريالات", icon: "🔄" },
  { id: "maintenance_report", name: "الصيانة", icon: "🔧" },
  { id: "employees_report", name: "الموظفين", icon: "👥" },
  { id: "products_list", name: "المنتجات", icon: "📋" },
];

const COLUMNS_BY_SOURCE: Record<string, Column[]> = {
  inventory_summary: [
    { field: "productName", label: "المنتج", type: "text", selected: true },
    { field: "sku", label: "SKU", type: "text", selected: true },
    { field: "totalQuantity", label: "الإجمالي", type: "number", selected: true },
    { field: "availableQuantity", label: "المتاح", type: "number", selected: true },
    { field: "soldQuantity", label: "المباع", type: "number", selected: true },
    { field: "inCustody", label: "عهدة", type: "number", selected: false },
    { field: "defective", label: "معطل", type: "number", selected: false },
  ],
  purchases_report: [
    { field: "orderNumber", label: "رقم الطلب", type: "text", selected: true },
    { field: "orderDate", label: "التاريخ", type: "date", selected: true },
    { field: "supplierName", label: "المورد", type: "text", selected: true },
    { field: "status", label: "الحالة", type: "text", selected: true },
    { field: "itemsCount", label: "عدد الأصناف", type: "number", selected: true },
    { field: "totalAmount", label: "المبلغ", type: "currency", selected: true },
  ],
  sales_report: [
    { field: "invoiceNumber", label: "رقم الفاتورة", type: "text", selected: true },
    { field: "invoiceDate", label: "التاريخ", type: "date", selected: true },
    { field: "customerName", label: "العميل", type: "text", selected: true },
    { field: "totalAmount", label: "المبلغ", type: "currency", selected: true },
    { field: "paidAmount", label: "المدفوع", type: "currency", selected: true },
    { field: "status", label: "الحالة", type: "text", selected: true },
  ],
  serial_movements_report: [
    { field: "serialNumber", label: "السيريال", type: "text", selected: true },
    { field: "productName", label: "المنتج", type: "text", selected: true },
    { field: "movementType", label: "نوع الحركة", type: "text", selected: true },
    { field: "fromStatus", label: "من حالة", type: "text", selected: false },
    { field: "toStatus", label: "إلى حالة", type: "text", selected: false },
    { field: "performedAt", label: "التاريخ", type: "datetime", selected: true },
    { field: "performedByName", label: "بواسطة", type: "text", selected: true },
  ],
  maintenance_report: [
    { field: "orderNumber", label: "رقم الأمر", type: "text", selected: true },
    { field: "customerName", label: "العميل", type: "text", selected: true },
    { field: "deviceType", label: "نوع الجهاز", type: "text", selected: true },
    { field: "brand", label: "الماركة", type: "text", selected: false },
    { field: "issue", label: "المشكلة", type: "text", selected: true },
    { field: "status", label: "الحالة", type: "text", selected: true },
    { field: "receivedAt", label: "تاريخ الاستلام", type: "date", selected: true },
    { field: "technicianName", label: "الفني", type: "text", selected: false },
    { field: "actualCost", label: "التكلفة", type: "currency", selected: true },
  ],
  employees_report: [
    { field: "fullName", label: "الاسم", type: "text", selected: true },
    { field: "email", label: "البريد", type: "text", selected: true },
    { field: "phone", label: "الهاتف", type: "text", selected: true },
    { field: "department", label: "القسم", type: "text", selected: true },
    { field: "jobTitle", label: "المسمى", type: "text", selected: true },
    { field: "status", label: "الحالة", type: "text", selected: true },
    { field: "hireDate", label: "تاريخ التعيين", type: "date", selected: false },
    { field: "salary", label: "الراتب", type: "currency", selected: false },
  ],
  products_list: [
    { field: "nameAr", label: "الاسم", type: "text", selected: true },
    { field: "sku", label: "SKU", type: "text", selected: true },
    { field: "categoryName", label: "الفئة", type: "text", selected: true },
    { field: "price", label: "السعر", type: "currency", selected: true },
    { field: "costPrice", label: "التكلفة", type: "currency", selected: false },
  ],
};

const OPERATOR_OPTIONS = [
  { value: "eq", label: "يساوي" },
  { value: "contains", label: "يحتوي" },
  { value: "gte", label: "أكبر من أو يساوي" },
  { value: "lte", label: "أصغر من أو يساوي" },
];

export default function ReportBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [columns, setColumns] = useState<Column[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [reportName, setReportName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (selectedSource && COLUMNS_BY_SOURCE[selectedSource]) {
      setColumns(COLUMNS_BY_SOURCE[selectedSource].map((c) => ({ ...c })));
    }
  }, [selectedSource]);

  const toggleColumn = (field: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.field === field ? { ...c, selected: !c.selected } : c))
    );
  };

  const addFilter = () => {
    const availableFields = columns.filter((c) => c.selected);
    if (availableFields.length === 0) return;

    setFilters((prev) => [
      ...prev,
      { field: availableFields[0].field, operator: "eq", value: "" },
    ]);
  };

  const updateFilter = (index: number, updates: Partial<Filter>) => {
    setFilters((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  };

  const removeFilter = (index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  };

  const runPreview = async () => {
    if (!selectedSource) return;

    setPreviewLoading(true);
    try {
      const params = new URLSearchParams();
      filters.forEach((f) => {
        if (f.value) params.set(f.field, f.value);
      });
      params.set("limit", "10");

      const res = await fetch(`${API_BASE}/api/reports/quick/${selectedSource}?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data.data);
      }
    } catch (error) {
      console.error("Preview error:", error);
      message.error("فشل تحميل المعاينة");
    } finally {
      setPreviewLoading(false);
    }
  };

  const saveReport = async () => {
    if (!reportName.trim() || !selectedSource) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/saved`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: reportName,
          templateId: null,
          isPublic,
          configuration: {
            dataSource: selectedSource,
            columns: columns.filter((c) => c.selected).map((c) => c.field),
            filters: filters.reduce((acc, f) => {
              if (f.value) acc[f.field] = f.value;
              return acc;
            }, {} as Record<string, any>),
          },
        }),
      });

      if (res.ok) {
        message.success("تم حفظ التقرير بنجاح");
        navigate("/reports");
      } else {
        message.error("فشل حفظ التقرير");
      }
    } catch (error) {
      console.error("Save error:", error);
      message.error("حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const selectedColumns = columns.filter((c) => c.selected);
  const sourceInfo = DATA_SOURCES.find((s) => s.id === selectedSource);

  const stepItems = [
    { title: "اختيار المصدر" },
    { title: "تحديد الأعمدة" },
    { title: "الفلاتر" },
    { title: "معاينة وحفظ" },
  ];

  const previewColumns = selectedColumns.map((col) => ({
    title: col.label,
    dataIndex: col.field,
    key: col.field,
    render: (value: any) => value ?? "-",
  }));

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="منشئ التقارير"
        breadcrumbs={[
          { title: "التقارير", path: "/reports" },
          { title: "منشئ التقارير" },
        ]}
        extra={
          <Button icon={<ArrowRightOutlined />} onClick={() => navigate("/reports")}>
            العودة للتقارير
          </Button>
        }
      />

      <Card style={{ marginBottom: 24 }}>
        <Steps current={step} items={stepItems} onChange={(s) => s <= step && setStep(s)} />
      </Card>

      <Card>
        {/* Step 0: Select Source */}
        {step === 0 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>اختر مصدر البيانات</h3>
            <Row gutter={[16, 16]}>
              {DATA_SOURCES.map((source) => (
                <Col xs={12} sm={8} md={6} key={source.id}>
                  <Card
                    hoverable
                    onClick={() => setSelectedSource(source.id)}
                    style={{
                      textAlign: "center",
                      borderColor: selectedSource === source.id ? "#1890ff" : undefined,
                      backgroundColor: selectedSource === source.id ? "#e6f7ff" : undefined,
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>{source.icon}</div>
                    <div style={{ fontWeight: 500 }}>{source.name}</div>
                  </Card>
                </Col>
              ))}
            </Row>

            <div style={{ marginTop: 24, textAlign: "left" }}>
              <Button
                type="primary"
                icon={<ArrowLeftOutlined />}
                onClick={() => setStep(1)}
                disabled={!selectedSource}
              >
                التالي
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Select Columns */}
        {step === 1 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>
              حدد الأعمدة المطلوبة
              <Tag color="blue" style={{ marginRight: 8 }}>
                {selectedColumns.length} أعمدة محددة
              </Tag>
            </h3>

            <Row gutter={[12, 12]}>
              {columns.map((col) => (
                <Col xs={12} sm={8} md={6} key={col.field}>
                  <Card
                    size="small"
                    hoverable
                    onClick={() => toggleColumn(col.field)}
                    style={{
                      borderColor: col.selected ? "#1890ff" : undefined,
                      backgroundColor: col.selected ? "#e6f7ff" : undefined,
                    }}
                  >
                    <Space>
                      <Checkbox checked={col.selected} />
                      <div>
                        <div style={{ fontWeight: 500 }}>{col.label}</div>
                        <div style={{ fontSize: 12, color: "#999" }}>{col.type}</div>
                      </div>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>

            <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
              <Button icon={<ArrowRightOutlined />} onClick={() => setStep(0)}>
                السابق
              </Button>
              <Button
                type="primary"
                icon={<ArrowLeftOutlined />}
                onClick={() => setStep(2)}
                disabled={selectedColumns.length === 0}
              >
                التالي
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Filters */}
        {step === 2 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>إضافة فلاتر (اختياري)</h3>
              <Button type="primary" ghost icon={<PlusOutlined />} onClick={addFilter}>
                إضافة فلتر
              </Button>
            </div>

            {filters.length === 0 ? (
              <Empty description="لا توجد فلاتر. اضغط 'إضافة فلتر' لتحديد شروط البحث." />
            ) : (
              <Space direction="vertical" style={{ width: "100%" }}>
                {filters.map((filter, index) => (
                  <Card key={index} size="small" style={{ backgroundColor: "#fafafa" }}>
                    <Row gutter={12} align="middle">
                      <Col flex="1">
                        <Select
                          value={filter.field}
                          onChange={(value) => updateFilter(index, { field: value })}
                          style={{ width: "100%" }}
                          options={selectedColumns.map((col) => ({ value: col.field, label: col.label }))}
                        />
                      </Col>
                      <Col flex="1">
                        <Select
                          value={filter.operator}
                          onChange={(value) => updateFilter(index, { operator: value })}
                          style={{ width: "100%" }}
                          options={OPERATOR_OPTIONS}
                        />
                      </Col>
                      <Col flex="2">
                        <Input
                          value={filter.value}
                          onChange={(e) => updateFilter(index, { value: e.target.value })}
                          placeholder="القيمة"
                        />
                      </Col>
                      <Col>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeFilter(index)}
                        />
                      </Col>
                    </Row>
                  </Card>
                ))}
              </Space>
            )}

            <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
              <Button icon={<ArrowRightOutlined />} onClick={() => setStep(1)}>
                السابق
              </Button>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => {
                  setStep(3);
                  runPreview();
                }}
              >
                معاينة
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Save */}
        {step === 3 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>معاينة وحفظ</h3>
              <Button loading={previewLoading} onClick={runPreview}>
                تحديث المعاينة
              </Button>
            </div>

            <Table
              columns={previewColumns}
              dataSource={previewData?.slice(0, 5) || []}
              loading={previewLoading}
              pagination={false}
              rowKey={(_, index) => index?.toString() || "0"}
              locale={{ emptyText: <Empty description="لا توجد بيانات للمعاينة" /> }}
              style={{ marginBottom: 24 }}
              scroll={{ x: true }}
            />

            <Card title="حفظ التقرير" size="small">
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="اسم التقرير" required>
                    <Input
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder="مثال: تقرير المخزون الشهري"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item>
                    <Checkbox checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)}>
                      جعل التقرير عاماً (مرئي للجميع)
                    </Checkbox>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
              <Button icon={<ArrowRightOutlined />} onClick={() => setStep(2)}>
                السابق
              </Button>
              <Space>
                <Button
                  icon={<PlayCircleOutlined />}
                  onClick={() => navigate(`/reports/run/${selectedSource}`)}
                >
                  تشغيل بدون حفظ
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={saveReport}
                  disabled={!reportName.trim()}
                  loading={saving}
                >
                  حفظ التقرير
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Card>

      {/* Summary Sidebar */}
      {selectedSource && step > 0 && (
        <Card title="ملخص التقرير" size="small" style={{ marginTop: 16 }}>
          <Space direction="vertical">
            <div>
              <span style={{ color: "#999" }}>المصدر: </span>
              <span style={{ fontWeight: 500 }}>{sourceInfo?.icon} {sourceInfo?.name}</span>
            </div>
            <div>
              <span style={{ color: "#999" }}>الأعمدة: </span>
              <Tag color="blue">{selectedColumns.length} أعمدة</Tag>
            </div>
            <div>
              <span style={{ color: "#999" }}>الفلاتر: </span>
              <Tag color="green">{filters.filter((f) => f.value).length} فلاتر نشطة</Tag>
            </div>
          </Space>
        </Card>
      )}
    </div>
  );
}
