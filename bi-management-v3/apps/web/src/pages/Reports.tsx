import { useEffect, useState } from "react";
import { API_BASE, getAuthHeaders } from "../utils/api";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  DatePicker,
  Select,
  Space,
  Statistic,
  Tag,
  Empty,
  Spin,
  Segmented,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  PrinterOutlined,
  DownloadOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, MoneyDisplay, DateDisplay } from "../components/shared";
import dayjs, { Dayjs } from "dayjs";

type ReportType = "sales" | "purchases" | "vouchers" | "checks";

type SalesSummary = {
  count: number;
  total: number;
  paid: number;
  remaining: number;
};

type VouchersSummary = {
  count: number;
  total: number;
};

type ChecksSummary = {
  count: number;
  total: number;
};

const REPORT_TABS = [
  { value: "sales", label: "المبيعات", icon: <DollarOutlined /> },
  { value: "purchases", label: "المشتريات", icon: <ShoppingCartOutlined /> },
  { value: "vouchers", label: "السندات", icon: <FileTextOutlined /> },
  { value: "checks", label: "الشيكات", icon: <CheckCircleOutlined /> },
];

export default function Reports() {
  const [activeReport, setActiveReport] = useState<ReportType>("sales");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    summary: SalesSummary | VouchersSummary | ChecksSummary;
    items: any[];
  } | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState<Dayjs | null>(null);
  const [dateTo, setDateTo] = useState<Dayjs | null>(null);
  const [voucherType, setVoucherType] = useState<string | undefined>(undefined);
  const [checkStatus, setCheckStatus] = useState<string | undefined>(undefined);
  const [checkType, setCheckType] = useState<string | undefined>(undefined);

  useEffect(() => {
    document.title = "التقارير | BI Management v3";
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    setData(null);

    try {
      let url = `${API_BASE}/api/reports/${activeReport}?`;
      const params = new URLSearchParams();

      if (dateFrom) params.append("from", dateFrom.format("YYYY-MM-DD"));
      if (dateTo) params.append("to", dateTo.format("YYYY-MM-DD"));
      if (activeReport === "vouchers" && voucherType)
        params.append("type", voucherType);
      if (activeReport === "checks") {
        if (checkStatus) params.append("status", checkStatus);
        if (checkType) params.append("type", checkType);
      }

      url += params.toString();

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("فشل تحميل التقرير");
      const result = await res.json();

      setData({
        summary: result.summary,
        items: result.invoices || result.vouchers || result.checks || [],
      });
    } catch (err) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data || data.items.length === 0) return;

    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeReport === "sales" || activeReport === "purchases") {
      headers = ["رقم الفاتورة", "الإجمالي", "المدفوع", "المتبقي", "حالة الدفع", "التاريخ"];
      rows = data.items.map((item: any) => [
        String(item.invoiceNumber),
        String(Number(item.total) || 0),
        String(Number(item.paidAmount) || 0),
        String(Number(item.remainingAmount) || 0),
        item.paymentStatus === "paid" ? "مدفوع" : "معلق",
        item.createdAt ? dayjs(item.createdAt).format("YYYY-MM-DD") : "",
      ]);
    } else if (activeReport === "vouchers") {
      headers = ["رقم السند", "النوع", "المبلغ", "الوصف", "التاريخ"];
      rows = data.items.map((item: any) => [
        String(item.voucherNumber),
        item.type === "receipt" ? "قبض" : "صرف",
        String(Number(item.amount) || 0),
        String(item.description || ""),
        item.createdAt ? dayjs(item.createdAt).format("YYYY-MM-DD") : "",
      ]);
    } else if (activeReport === "checks") {
      headers = ["رقم الشيك", "النوع", "المبلغ", "الحالة", "تاريخ الاستحقاق"];
      rows = data.items.map((item: any) => [
        String(item.checkNumber),
        item.type === "incoming" ? "وارد" : "صادر",
        String(Number(item.amount) || 0),
        { pending: "معلق", deposited: "مودع", cleared: "صُرف", bounced: "مرتجع" }[
          item.status
        ] || item.status,
        item.dueDate ? dayjs(item.dueDate).format("YYYY-MM-DD") : "",
      ]);
    }

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `report-${activeReport}-${dayjs().format("YYYY-MM-DD")}.csv`;
    link.click();
  };

  // Table columns for different report types
  const invoiceColumns: TableColumnsType<any> = [
    {
      title: "#",
      key: "index",
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: "رقم الفاتورة",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: "الإجمالي",
      dataIndex: "total",
      key: "total",
      render: (total) => <MoneyDisplay amount={total || 0} />,
    },
    {
      title: "المدفوع",
      dataIndex: "paidAmount",
      key: "paidAmount",
      render: (paid) => (
        <span style={{ color: "#22c55e" }}>
          <MoneyDisplay amount={paid || 0} />
        </span>
      ),
    },
    {
      title: "المتبقي",
      dataIndex: "remainingAmount",
      key: "remainingAmount",
      render: (remaining) => (
        <span
          style={{
            color: (remaining || 0) > 0 ? "#ef4444" : "#22c55e",
            fontWeight: 600,
          }}
        >
          <MoneyDisplay amount={remaining || 0} />
        </span>
      ),
    },
    {
      title: "حالة الدفع",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      render: (status) => (
        <Tag color={status === "paid" ? "green" : "gold"}>
          {status === "paid" ? "مدفوع" : "معلق"}
        </Tag>
      ),
    },
    {
      title: "التاريخ",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => <DateDisplay date={date} />,
    },
  ];

  const voucherColumns: TableColumnsType<any> = [
    {
      title: "#",
      key: "index",
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: "رقم السند",
      dataIndex: "voucherNumber",
      key: "voucherNumber",
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: "النوع",
      dataIndex: "type",
      key: "type",
      render: (type) => (
        <Tag color={type === "receipt" ? "green" : "red"}>
          {type === "receipt" ? "قبض" : "صرف"}
        </Tag>
      ),
    },
    {
      title: "المبلغ",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => (
        <span style={{ fontWeight: 600 }}>
          <MoneyDisplay amount={amount || 0} />
        </span>
      ),
    },
    {
      title: "الوصف",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "التاريخ",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => <DateDisplay date={date} />,
    },
  ];

  const checkColumns: TableColumnsType<any> = [
    {
      title: "#",
      key: "index",
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: "رقم الشيك",
      dataIndex: "checkNumber",
      key: "checkNumber",
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: "النوع",
      dataIndex: "type",
      key: "type",
      render: (type) => (
        <Tag color={type === "incoming" ? "blue" : "gold"}>
          {type === "incoming" ? "وارد" : "صادر"}
        </Tag>
      ),
    },
    {
      title: "المبلغ",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => (
        <span style={{ fontWeight: 600 }}>
          <MoneyDisplay amount={amount || 0} />
        </span>
      ),
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const statusMap: Record<string, { label: string; color: string }> = {
          pending: { label: "معلق", color: "default" },
          deposited: { label: "مودع", color: "blue" },
          cleared: { label: "صُرف", color: "green" },
          bounced: { label: "مرتجع", color: "red" },
        };
        const info = statusMap[status] || { label: status, color: "default" };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: "تاريخ الاستحقاق",
      dataIndex: "dueDate",
      key: "dueDate",
      render: (date) => <DateDisplay date={date} />,
    },
  ];

  const getColumns = () => {
    if (activeReport === "sales" || activeReport === "purchases")
      return invoiceColumns;
    if (activeReport === "vouchers") return voucherColumns;
    return checkColumns;
  };

  return (
    <div>
      <PageHeader
        title="التقارير المالية"
        subtitle="عرض وتحليل البيانات المالية"
        breadcrumbs={[{ title: "التقارير" }, { title: "التقارير المالية" }]}
        extra={
          data && (
            <Space>
              <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                طباعة
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExportCSV}
              >
                تصدير Excel
              </Button>
            </Space>
          )
        }
      />

      {/* Report Type Selector */}
      <Card style={{ marginBottom: 24 }}>
        <Segmented
          block
          size="large"
          options={REPORT_TABS.map((tab) => ({
            value: tab.value,
            label: (
              <Space>
                {tab.icon}
                {tab.label}
              </Space>
            ),
          }))}
          value={activeReport}
          onChange={(value) => {
            setActiveReport(value as ReportType);
            setData(null);
          }}
        />
      </Card>

      {/* Filters */}
      <Card title="فلاتر البحث" style={{ marginBottom: 24 }}>
        <Space wrap size="middle">
          {(activeReport === "sales" ||
            activeReport === "purchases" ||
            activeReport === "vouchers") && (
            <>
              <DatePicker
                placeholder="من تاريخ"
                value={dateFrom}
                onChange={setDateFrom}
                style={{ width: 150 }}
              />
              <DatePicker
                placeholder="إلى تاريخ"
                value={dateTo}
                onChange={setDateTo}
                style={{ width: 150 }}
              />
            </>
          )}

          {activeReport === "vouchers" && (
            <Select
              placeholder="نوع السند"
              value={voucherType}
              onChange={setVoucherType}
              allowClear
              style={{ width: 150 }}
              options={[
                { value: "receipt", label: "سند قبض" },
                { value: "payment", label: "سند صرف" },
              ]}
            />
          )}

          {activeReport === "checks" && (
            <>
              <Select
                placeholder="الحالة"
                value={checkStatus}
                onChange={setCheckStatus}
                allowClear
                style={{ width: 150 }}
                options={[
                  { value: "pending", label: "معلق" },
                  { value: "deposited", label: "مودع" },
                  { value: "cleared", label: "صُرف" },
                  { value: "bounced", label: "مرتجع" },
                ]}
              />
              <Select
                placeholder="النوع"
                value={checkType}
                onChange={setCheckType}
                allowClear
                style={{ width: 150 }}
                options={[
                  { value: "incoming", label: "وارد" },
                  { value: "outgoing", label: "صادر" },
                ]}
              />
            </>
          )}

          <Button type="primary" onClick={fetchReport} loading={loading}>
            عرض التقرير
          </Button>
        </Space>
      </Card>

      {/* Results */}
      {loading ? (
        <Card>
          <div style={{ textAlign: "center", padding: 60 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: "#64748b" }}>جاري تحميل التقرير...</div>
          </div>
        </Card>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="عدد السجلات"
                  value={data.summary.count}
                  valueStyle={{ color: "#3b82f6" }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="الإجمالي"
                  value={data.summary.total}
                  suffix="د.ع"
                  valueStyle={{ color: "#8b5cf6" }}
                  formatter={(value) =>
                    new Intl.NumberFormat("ar-IQ").format(value as number)
                  }
                />
              </Card>
            </Col>
            {"paid" in data.summary && (
              <>
                <Col xs={12} sm={6}>
                  <Card>
                    <Statistic
                      title="المدفوع"
                      value={data.summary.paid}
                      suffix="د.ع"
                      valueStyle={{ color: "#22c55e" }}
                      formatter={(value) =>
                        new Intl.NumberFormat("ar-IQ").format(value as number)
                      }
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card>
                    <Statistic
                      title="المتبقي"
                      value={data.summary.remaining}
                      suffix="د.ع"
                      valueStyle={{
                        color: data.summary.remaining > 0 ? "#ef4444" : "#22c55e",
                      }}
                      formatter={(value) =>
                        new Intl.NumberFormat("ar-IQ").format(value as number)
                      }
                    />
                  </Card>
                </Col>
              </>
            )}
          </Row>

          {/* Data Table */}
          <Card title="البيانات" styles={{ body: { padding: 0 } }}>
            {data.items.length > 0 ? (
              <Table
                columns={getColumns()}
                dataSource={data.items}
                rowKey={(_, index) => String(index)}
                pagination={{
                  pageSize: 20,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} من ${total}`,
                }}
                scroll={{ x: 800 }}
              />
            ) : (
              <Empty
                description="لا توجد بيانات للعرض"
                style={{ padding: 60 }}
              />
            )}
          </Card>
        </>
      ) : (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" size="small">
                <span>اختر نوع التقرير والفلاتر المطلوبة</span>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>
                  ثم اضغط "عرض التقرير" لعرض البيانات
                </span>
              </Space>
            }
            style={{ padding: 60 }}
          />
        </Card>
      )}
    </div>
  );
}
