/**
 * صفحة قائمة طلبات الترقية
 */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  message,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  AppstoreOutlined,
  SearchOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd";
import { PageHeader, DateDisplay, LoadingSkeleton, MoneyDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface UpgradeOrder {
  id: string;
  orderNumber: string;
  serialNumber?: string;
  productName?: string;
  upgradeType: string;
  status: string;
  partsCost?: number;
  installationFee?: number;
  totalCost?: number;
  requestedAt: string;
  completedAt?: string;
  notes?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "معلق", color: "gold" },
  in_progress: { label: "قيد التنفيذ", color: "processing" },
  completed: { label: "مكتمل", color: "success" },
  cancelled: { label: "ملغي", color: "default" },
};

export default function UpgradesList() {
  const navigate = useNavigate();
  const [upgrades, setUpgrades] = useState<UpgradeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchSerial, setSearchSerial] = useState("");

  useEffect(() => {
    fetchUpgrades();
  }, [statusFilter]);

  const fetchUpgrades = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (searchSerial) params.append("serialNumber", searchSerial);

      const res = await fetch(`${API_BASE}/api/parts/upgrades?${params}`, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setUpgrades(data.upgrades || []);
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    fetchUpgrades();
  };

  const handleComplete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/parts/upgrades/${id}/complete`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });

      if (res.ok) {
        message.success("تم تنفيذ الترقية بنجاح");
        fetchUpgrades();
      } else {
        const data = await res.json();
        message.error(data.error || "فشل في تنفيذ الترقية");
      }
    } catch (error) {
      message.error("حدث خطأ");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/parts/upgrades/${id}/cancel`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });

      if (res.ok) {
        message.success("تم إلغاء الطلب");
        fetchUpgrades();
      } else {
        const data = await res.json();
        message.error(data.error || "فشل في الإلغاء");
      }
    } catch (error) {
      message.error("حدث خطأ");
    }
  };

  const columns: ColumnsType<UpgradeOrder> = [
    {
      title: "رقم الطلب",
      dataIndex: "orderNumber",
      key: "orderNumber",
      render: (text) => (
        <span style={{ fontWeight: 500, color: "#1677ff" }}>{text}</span>
      ),
    },
    {
      title: "الجهاز",
      key: "device",
      render: (_, record) => (
        <div>
          <div style={{ fontFamily: "monospace", fontSize: 13 }}>
            {record.serialNumber}
          </div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>
            {record.productName}
          </div>
        </div>
      ),
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "التكلفة",
      key: "cost",
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500, color: "#52c41a" }}>
            <MoneyDisplay amount={record.totalCost || 0} />
          </div>
          <div style={{ fontSize: 11, color: "#8c8c8c" }}>
            قطع: <MoneyDisplay amount={record.partsCost || 0} /> | تركيب:{" "}
            <MoneyDisplay amount={record.installationFee || 0} />
          </div>
        </div>
      ),
    },
    {
      title: "التاريخ",
      dataIndex: "requestedAt",
      key: "requestedAt",
      render: (date) => <DateDisplay date={date} format="datetime" />,
    },
    {
      title: "إجراءات",
      key: "actions",
      align: "center",
      render: (_, record) => (
        <Space>
          {record.status === "pending" && (
            <>
              <Popconfirm
                title="تأكيد التنفيذ"
                description="هل تريد تنفيذ هذه الترقية؟"
                onConfirm={() => handleComplete(record.id)}
                okText="تنفيذ"
                cancelText="إلغاء"
              >
                <Button
                  type="link"
                  size="small"
                  icon={<CheckOutlined />}
                  style={{ color: "#52c41a" }}
                >
                  تنفيذ
                </Button>
              </Popconfirm>
              <Popconfirm
                title="تأكيد الإلغاء"
                description="هل تريد إلغاء هذا الطلب؟"
                onConfirm={() => handleCancel(record.id)}
                okText="إلغاء"
                cancelText="تراجع"
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                >
                  إلغاء
                </Button>
              </Popconfirm>
            </>
          )}
          {record.status === "completed" && (
            <span style={{ color: "#8c8c8c", fontSize: 13 }}>مكتمل</span>
          )}
        </Space>
      ),
    },
  ];

  if (loading && upgrades.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingSkeleton type="table" rows={6} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="طلبات الترقية"
        subtitle="إدارة طلبات ترقية الأجهزة"
        breadcrumbs={[{ title: "القطع", href: "/parts" }, { title: "طلبات الترقية" }]}
        extra={
          <>
            <Link to="/parts">
              <Button icon={<AppstoreOutlined />}>مخزون القطع</Button>
            </Link>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/upgrades/new")}
            >
              ترقية جديدة
            </Button>
          </>
        }
      />

      {/* الفلاتر */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="1">
            <Input
              placeholder="بحث بالسيريال..."
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              value={searchSerial}
              onChange={(e) => setSearchSerial(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
            />
          </Col>
          <Col>
            <Space>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 150 }}
                placeholder="الحالة"
                allowClear
                options={[
                  { value: "", label: "الكل" },
                  { value: "pending", label: "معلق" },
                  { value: "in_progress", label: "قيد التنفيذ" },
                  { value: "completed", label: "مكتمل" },
                ]}
              />
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                بحث
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* الجدول */}
      <Card styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={upgrades}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} من ${total}`,
            pageSize: 20,
          }}
          locale={{
            emptyText: "لا توجد طلبات ترقية",
          }}
        />
      </Card>
    </div>
  );
}
