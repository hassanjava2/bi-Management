/**
 * صفحة الشحنات
 */
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Row, Col, Card, Table, Button, Select, Tag, Space, Empty } from "antd";
import { PlusOutlined, CarOutlined, EyeOutlined, SettingOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { PageHeader, MoneyDisplay, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Shipment {
  id: string;
  shipmentNumber: string;
  invoiceId: string;
  invoice?: { invoiceNumber: string };
  customer?: { fullName: string; phone: string; address: string };
  companyId: string;
  company?: { name: string; nameAr: string; type: string };
  status: string;
  totalAmount: number;
  collectedAmount: number;
  deliveryFee: number;
  customerPays: number;
  customerAddress: string;
  customerPhone: string;
  recipientName: string;
  packagingVideoUrl: string;
  notes: string;
  preparedBy: string;
  preparedAt: string;
  handedOverAt: string;
  deliveredAt: string;
  createdAt: string;
}

interface DeliveryCompany {
  id: string;
  name: string;
  nameAr: string;
  type: string;
}

const STATUS_COLORS: Record<string, { color: string; label: string }> = {
  pending: { color: "default", label: "بانتظار التجهيز" },
  preparing: { color: "gold", label: "قيد التجهيز" },
  ready: { color: "blue", label: "جاهز للتسليم" },
  handed_over: { color: "purple", label: "تم التسليم للمندوب" },
  in_transit: { color: "orange", label: "في الطريق" },
  delivered: { color: "green", label: "تم التوصيل" },
  returned: { color: "red", label: "مرتجع" },
  partial_return: { color: "magenta", label: "راجع جزئي" },
};

export default function Shipments() {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: "",
    companyId: "",
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  async function fetchData() {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append("status", filter.status);
      if (filter.companyId) params.append("companyId", filter.companyId);

      const [shipmentsRes, companiesRes] = await Promise.all([
        fetch(`${API_BASE}/api/delivery/shipments?${params}`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/api/delivery/companies`, {
          headers: getAuthHeaders(),
        }),
      ]);

      const shipmentsData = await shipmentsRes.json();
      const companiesData = await companiesRes.json();

      setShipments(shipmentsData.shipments || []);
      setCompanies(companiesData.companies || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const columns: ColumnsType<Shipment> = [
    {
      title: "رقم الشحنة",
      key: "shipmentNumber",
      render: (_: any, record: Shipment) => (
        <div>
          <div style={{ fontFamily: "monospace", fontWeight: 500 }}>{record.shipmentNumber}</div>
          {record.invoice?.invoiceNumber && (
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              فاتورة: {record.invoice.invoiceNumber}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "العميل",
      key: "customer",
      render: (_: any, record: Shipment) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.recipientName || record.customer?.fullName}</div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>
            {record.customerPhone || record.customer?.phone}
          </div>
        </div>
      ),
    },
    {
      title: "شركة التوصيل",
      key: "company",
      render: (_: any, record: Shipment) => 
        record.company?.nameAr || record.company?.name || "-",
    },
    {
      title: "المبلغ",
      key: "amount",
      render: (_: any, record: Shipment) => (
        <div>
          <MoneyDisplay amount={record.totalAmount} />
          {record.deliveryFee > 0 && (
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              توصيل: <MoneyDisplay amount={record.deliveryFee} />
            </div>
          )}
        </div>
      ),
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const config = STATUS_COLORS[status] || STATUS_COLORS.pending;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "التاريخ",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => <DateDisplay date={date} format="DD MMM, HH:mm" />,
    },
    {
      title: "إجراءات",
      key: "actions",
      render: (_: any, record: Shipment) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/delivery/shipments/${record.id}`);
            }}
          >
            تفاصيل
          </Button>
          {record.status === "pending" && (
            <Button
              type="link"
              size="small"
              icon={<SettingOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/delivery/prepare/${record.id}`);
              }}
            >
              تجهيز
            </Button>
          )}
        </Space>
      ),
    },
  ];

  if (loading && !shipments.length) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="الشحنات"
        subtitle="تتبع وإدارة جميع الشحنات"
        breadcrumbs={[
          { label: "الرئيسية", path: "/" },
          { label: "الشحنات" },
        ]}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/delivery/new")}
          >
            شحنة جديدة
          </Button>
        }
      />

      {/* الفلاتر */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <div>
            <span style={{ marginInlineEnd: 8 }}>الحالة:</span>
            <Select
              placeholder="جميع الحالات"
              value={filter.status || undefined}
              onChange={(value) => setFilter({ ...filter, status: value || "" })}
              style={{ width: 180 }}
              allowClear
            >
              {Object.entries(STATUS_COLORS).map(([key, val]) => (
                <Select.Option key={key} value={key}>{val.label}</Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <span style={{ marginInlineEnd: 8 }}>شركة التوصيل:</span>
            <Select
              placeholder="جميع الشركات"
              value={filter.companyId || undefined}
              onChange={(value) => setFilter({ ...filter, companyId: value || "" })}
              style={{ width: 180 }}
              allowClear
            >
              {companies.map((company) => (
                <Select.Option key={company.id} value={company.id}>
                  {company.nameAr || company.name}
                </Select.Option>
              ))}
            </Select>
          </div>
        </Space>
      </Card>

      {/* ملخص الحالات */}
      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        {Object.entries(STATUS_COLORS).map(([status, config]) => {
          const count = shipments.filter((s) => s.status === status).length;
          const isActive = filter.status === status;
          return (
            <Col key={status}>
              <Button
                type={isActive ? "primary" : "default"}
                onClick={() => setFilter({ ...filter, status: isActive ? "" : status })}
                style={{ 
                  height: "auto", 
                  padding: "8px 16px",
                  borderRadius: 8,
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 12 }}>
                    <Tag color={config.color} style={{ margin: 0 }}>{config.label}</Tag>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{count}</div>
                </div>
              </Button>
            </Col>
          );
        })}
      </Row>

      {/* جدول الشحنات */}
      <Card>
        <Table
          columns={columns}
          dataSource={shipments}
          rowKey="id"
          loading={loading}
          onRow={(record) => ({
            onClick: () => navigate(`/delivery/shipments/${record.id}`),
            style: { cursor: "pointer" },
          })}
          pagination={{
            pageSize: 20,
            showSizeChanger: false,
            showTotal: (total) => `إجمالي ${total} شحنة`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="لا توجد شحنات"
              />
            ),
          }}
        />
      </Card>
    </div>
  );
}
