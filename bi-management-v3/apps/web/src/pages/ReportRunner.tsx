/**
 * صفحة تشغيل التقرير
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Card, Table, Button, Input, Select, Tag, Space, message, Statistic, Empty, DatePicker } from "antd";
import {
  ArrowRightOutlined,
  DownloadOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface ReportData {
  data: any[];
  meta: {
    rowCount: number;
    executionTimeMs: number;
    executionId: string;
  };
}

const REPORT_CONFIGS: Record<string, {
  name: string;
  icon: string;
  filters: { field: string; label: string; type: string; options?: { value: string; label: string }[] }[];
  columns: { field: string; label: string; type: string }[];
}> = {
  inventory_summary: {
    name: "ملخص المخزون",
    icon: "📦",
    filters: [],
    columns: [
      { field: "productName", label: "المنتج", type: "text" },
      { field: "sku", label: "SKU", type: "text" },
      { field: "totalQuantity", label: "الإجمالي", type: "number" },
      { field: "availableQuantity", label: "المتاح", type: "number" },
      { field: "soldQuantity", label: "المباع", type: "number" },
      { field: "inCustody", label: "عهدة", type: "number" },
      { field: "defective", label: "معطل", type: "number" },
    ],
  },
  purchases_report: {
    name: "تقرير المشتريات",
    icon: "🛒",
    filters: [
      { field: "dateFrom", label: "من تاريخ", type: "date" },
      { field: "dateTo", label: "إلى تاريخ", type: "date" },
      { field: "status", label: "الحالة", type: "select", options: [
        { value: "", label: "الكل" },
        { value: "draft", label: "مسودة" },
        { value: "pending", label: "قيد الانتظار" },
        { value: "approved", label: "معتمد" },
        { value: "received", label: "مستلم" },
        { value: "completed", label: "مكتمل" },
        { value: "cancelled", label: "ملغي" },
      ]},
    ],
    columns: [
      { field: "orderNumber", label: "رقم الطلب", type: "text" },
      { field: "orderDate", label: "التاريخ", type: "date" },
      { field: "supplierName", label: "المورد", type: "text" },
      { field: "status", label: "الحالة", type: "status" },
      { field: "itemsCount", label: "عدد الأصناف", type: "number" },
      { field: "totalAmount", label: "المبلغ", type: "currency" },
    ],
  },
  sales_report: {
    name: "تقرير المبيعات",
    icon: "💰",
    filters: [
      { field: "dateFrom", label: "من تاريخ", type: "date" },
      { field: "dateTo", label: "إلى تاريخ", type: "date" },
    ],
    columns: [
      { field: "invoiceNumber", label: "رقم الفاتورة", type: "text" },
      { field: "invoiceDate", label: "التاريخ", type: "date" },
      { field: "customerName", label: "العميل", type: "text" },
      { field: "totalAmount", label: "المبلغ", type: "currency" },
      { field: "paidAmount", label: "المدفوع", type: "currency" },
      { field: "status", label: "الحالة", type: "status" },
    ],
  },
  serial_movements_report: {
    name: "تقرير حركة السيريالات",
    icon: "🔄",
    filters: [
      { field: "dateFrom", label: "من تاريخ", type: "date" },
      { field: "dateTo", label: "إلى تاريخ", type: "date" },
      { field: "movementType", label: "نوع الحركة", type: "select", options: [
        { value: "", label: "الكل" },
        { value: "purchase", label: "شراء" },
        { value: "sale", label: "بيع" },
        { value: "transfer", label: "نقل" },
        { value: "custody_assign", label: "تسليم عهدة" },
        { value: "custody_return", label: "استرجاع عهدة" },
        { value: "defective", label: "تلف" },
        { value: "return", label: "مرتجع" },
      ]},
    ],
    columns: [
      { field: "serialNumber", label: "السيريال", type: "text" },
      { field: "productName", label: "المنتج", type: "text" },
      { field: "movementType", label: "نوع الحركة", type: "text" },
      { field: "fromStatus", label: "من حالة", type: "text" },
      { field: "toStatus", label: "إلى حالة", type: "text" },
      { field: "performedAt", label: "التاريخ", type: "datetime" },
      { field: "performedByName", label: "بواسطة", type: "text" },
    ],
  },
  maintenance_report: {
    name: "تقرير الصيانة",
    icon: "🔧",
    filters: [
      { field: "dateFrom", label: "من تاريخ", type: "date" },
      { field: "dateTo", label: "إلى تاريخ", type: "date" },
      { field: "status", label: "الحالة", type: "select", options: [
        { value: "", label: "الكل" },
        { value: "received", label: "مستلم" },
        { value: "diagnosing", label: "قيد الفحص" },
        { value: "waiting_approval", label: "بانتظار الموافقة" },
        { value: "in_progress", label: "قيد العمل" },
        { value: "completed", label: "مكتمل" },
        { value: "delivered", label: "تم التسليم" },
        { value: "cancelled", label: "ملغي" },
      ]},
    ],
    columns: [
      { field: "orderNumber", label: "رقم الأمر", type: "text" },
      { field: "customerName", label: "العميل", type: "text" },
      { field: "deviceType", label: "نوع الجهاز", type: "text" },
      { field: "brand", label: "الماركة", type: "text" },
      { field: "issue", label: "المشكلة", type: "text" },
      { field: "status", label: "الحالة", type: "status" },
      { field: "receivedAt", label: "تاريخ الاستلام", type: "date" },
      { field: "technicianName", label: "الفني", type: "text" },
      { field: "actualCost", label: "التكلفة", type: "currency" },
    ],
  },
  employees_report: {
    name: "تقرير الموظفين",
    icon: "👥",
    filters: [
      { field: "status", label: "الحالة", type: "select", options: [
        { value: "", label: "الكل" },
        { value: "active", label: "نشط" },
        { value: "inactive", label: "غير نشط" },
        { value: "on_leave", label: "إجازة" },
      ]},
    ],
    columns: [
      { field: "fullName", label: "الاسم", type: "text" },
      { field: "email", label: "البريد", type: "text" },
      { field: "phone", label: "الهاتف", type: "text" },
      { field: "department", label: "القسم", type: "text" },
      { field: "jobTitle", label: "المسمى", type: "text" },
      { field: "status", label: "الحالة", type: "status" },
      { field: "hireDate", label: "تاريخ التعيين", type: "date" },
      { field: "salary", label: "الراتب", type: "currency" },
    ],
  },
  products_list: {
    name: "قائمة المنتجات",
    icon: "📋",
    filters: [
      { field: "search", label: "بحث", type: "text" },
    ],
    columns: [
      { field: "nameAr", label: "الاسم", type: "text" },
      { field: "sku", label: "SKU", type: "text" },
      { field: "categoryName", label: "الفئة", type: "text" },
      { field: "price", label: "السعر", type: "currency" },
      { field: "costPrice", label: "التكلفة", type: "currency" },
    ],
  },
};

const STATUS_COLORS: Record<string, string> = {
  draft: "default",
  pending: "warning",
  approved: "processing",
  received: "cyan",
  completed: "success",
  cancelled: "error",
  active: "success",
  inactive: "default",
  delivered: "purple",
  in_progress: "orange",
  diagnosing: "processing",
  waiting_approval: "warning",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  pending: "قيد الانتظار",
  approved: "معتمد",
  received: "مستلم",
  completed: "مكتمل",
  cancelled: "ملغي",
  active: "نشط",
  inactive: "غير نشط",
  delivered: "تم التسليم",
  in_progress: "قيد العمل",
  diagnosing: "قيد الفحص",
  waiting_approval: "بانتظار الموافقة",
  on_leave: "إجازة",
};

export default function ReportRunner() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const config = reportId ? REPORT_CONFIGS[reportId] : null;

  useEffect(() => {
    if (reportId && config) {
      runReport();
    }
  }, [reportId]);

  const runReport = async () => {
    if (!reportId) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/quick/${reportId}?${new URLSearchParams(
        Object.entries(filters).filter(([_, v]) => v)
      ).toString()}`, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setReportData({
          data: data.data,
          meta: { rowCount: data.count, executionTimeMs: 0, executionId: "" },
        });
      }
    } catch (error) {
      console.error("Report error:", error);
      message.error("فشل تنفيذ التقرير");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    if (!reportData?.data?.length || !config) return;

    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/export/csv`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          data: reportData.data,
          columns: config.columns.map((c) => c.field),
          filename: `${config.name}_${new Date().toISOString().split("T")[0]}`,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        const blob = new Blob([atob(result.data)], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename;
        link.click();
        URL.revokeObjectURL(url);
        message.success("تم التصدير بنجاح");
      }
    } catch (error) {
      console.error("Export error:", error);
      message.error("فشل تصدير التقرير");
    } finally {
      setExporting(false);
    }
  };

  const formatValue = (value: any, type: string) => {
    if (value === null || value === undefined) return "-";

    switch (type) {
      case "date":
        return new Date(value).toLocaleDateString("ar-IQ");
      case "datetime":
        return new Date(value).toLocaleString("ar-IQ");
      case "currency":
        return new Intl.NumberFormat("ar-IQ", { style: "currency", currency: "IQD" }).format(value);
      case "number":
        return new Intl.NumberFormat("ar-IQ").format(value);
      case "status":
        return (
          <Tag color={STATUS_COLORS[value] || "default"}>
            {STATUS_LABELS[value] || value}
          </Tag>
        );
      default:
        return value;
    }
  };

  if (!config) {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <Empty
            description="التقرير غير موجود"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => navigate("/reports")}>
              العودة للتقارير
            </Button>
          </Empty>
        </Card>
      </div>
    );
  }

  const tableColumns = config.columns.map((col) => ({
    title: col.label,
    dataIndex: col.field,
    key: col.field,
    render: (value: any) => formatValue(value, col.type),
  }));

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title={
          <Space>
            <span style={{ fontSize: 28 }}>{config.icon}</span>
            {config.name}
          </Space>
        }
        breadcrumbs={[
          { title: "التقارير", path: "/reports" },
          { title: config.name },
        ]}
        extra={
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={exportCSV}
              disabled={!reportData?.data?.length}
              loading={exporting}
            >
              تصدير CSV
            </Button>
            <Button icon={<ArrowRightOutlined />} onClick={() => navigate("/reports")}>
              العودة للتقارير
            </Button>
          </Space>
        }
      />

      {reportData && (
        <Tag color="blue" style={{ marginBottom: 16 }}>
          {reportData.meta.rowCount} سجل
        </Tag>
      )}

      {/* Filters */}
      {config.filters.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="bottom">
            {config.filters.map((filter) => (
              <Col key={filter.field} xs={24} sm={12} md={6}>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontWeight: 500 }}>{filter.label}</label>
                </div>
                {filter.type === "select" ? (
                  <Select
                    value={filters[filter.field] || ""}
                    onChange={(value) => setFilters((prev) => ({ ...prev, [filter.field]: value }))}
                    style={{ width: "100%" }}
                    options={filter.options}
                  />
                ) : filter.type === "date" ? (
                  <DatePicker
                    onChange={(_, dateString) => setFilters((prev) => ({ ...prev, [filter.field]: dateString }))}
                    style={{ width: "100%" }}
                    placeholder={filter.label}
                  />
                ) : (
                  <Input
                    value={filters[filter.field] || ""}
                    onChange={(e) => setFilters((prev) => ({ ...prev, [filter.field]: e.target.value }))}
                    placeholder={filter.label}
                  />
                )}
              </Col>
            ))}
            <Col>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={runReport}
                loading={loading}
              >
                تشغيل
              </Button>
            </Col>
          </Row>
        </Card>
      )}

      {/* Results Table */}
      <Card>
        {loading ? (
          <LoadingSkeleton />
        ) : !reportData ? (
          <Empty description="اضغط 'تشغيل' لعرض التقرير" />
        ) : (
          <Table
            columns={tableColumns}
            dataSource={reportData.data}
            rowKey={(_, index) => index?.toString() || "0"}
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `إجمالي ${total} سجل` }}
            scroll={{ x: true }}
            locale={{ emptyText: <Empty description="لا توجد بيانات تطابق الفلاتر المحددة" /> }}
          />
        )}
      </Card>

      {/* Summary */}
      {reportData && reportData.data.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <Row gutter={24}>
            <Col>
              <Statistic title="إجمالي السجلات" value={reportData.meta.rowCount} />
            </Col>
            {config.columns.filter((c) => c.type === "currency").map((col) => {
              const total = reportData.data.reduce((sum, row) => sum + (Number(row[col.field]) || 0), 0);
              return (
                <Col key={col.field}>
                  <Statistic
                    title={`إجمالي ${col.label}`}
                    value={total}
                    formatter={(value) => new Intl.NumberFormat("ar-IQ").format(value as number)}
                  />
                </Col>
              );
            })}
          </Row>
        </Card>
      )}
    </div>
  );
}
