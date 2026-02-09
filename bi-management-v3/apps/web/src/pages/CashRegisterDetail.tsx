import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Row, Col, Card, Descriptions, Tag, Space, Button, Statistic, Table, Empty, message } from "antd";
import {
  WalletOutlined,
  EditOutlined,
  PrinterOutlined,
  PlusOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SwapOutlined,
  BranchesOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton, StatusTag, MoneyDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type CashRegister = {
  id: string;
  code: string;
  name: string;
  branchId: string | null;
  balance: number | string | null;
  openingBalance: number | string | null;
  currency: string | null;
  isActive: number | null;
  createdAt: string;
  branch?: { id: string; name: string; nameAr: string | null };
};

type Voucher = {
  id: string;
  voucherNumber: string;
  type: string;
  amount: number | string;
  description: string | null;
  createdAt: string;
};

export default function CashRegisterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "تفاصيل القاصة | BI Management v3";

    const fetchData = async () => {
      try {
        const crRes = await fetch(`${API_BASE}/api/cash-registers/${id}`, { headers: getAuthHeaders() });
        if (!crRes.ok) throw new Error("فشل تحميل بيانات القاصة");
        const crData = await crRes.json();
        setCashRegister(crData);

        const vRes = await fetch(`${API_BASE}/api/vouchers?cashRegisterId=${id}&limit=20`, { headers: getAuthHeaders() });
        if (vRes.ok) {
          const vData = await vRes.json();
          setVouchers(vData.data || []);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "حدث خطأ";
        setError(errorMsg);
        message.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return <LoadingSkeleton type="detail" />;
  }

  if (error || !cashRegister) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={error || "القاصة غير موجودة"}
        >
          <Button type="primary" onClick={() => navigate("/cash-registers")}>
            العودة للقاصات
          </Button>
        </Empty>
      </div>
    );
  }

  const balance = Number(cashRegister.balance || 0);
  const openingBalance = Number(cashRegister.openingBalance || 0);
  const netChange = balance - openingBalance;

  const receipts = vouchers.filter((v) => v.type === "receipt");
  const payments = vouchers.filter((v) => v.type === "payment");
  const totalReceipts = receipts.reduce((sum, v) => sum + Number(v.amount), 0);
  const totalPayments = payments.reduce((sum, v) => sum + Number(v.amount), 0);

  const voucherColumns = [
    {
      title: "التاريخ",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => <DateDisplay date={date} />,
    },
    {
      title: "رقم السند",
      dataIndex: "voucherNumber",
      key: "voucherNumber",
      render: (num: string, record: Voucher) => (
        <Link to={`/vouchers/${record.id}`} style={{ color: "#1890ff" }}>
          {num}
        </Link>
      ),
    },
    {
      title: "النوع",
      dataIndex: "type",
      key: "type",
      render: (type: string) => (
        <Tag color={type === "receipt" ? "success" : "error"}>
          {type === "receipt" ? "قبض" : "صرف"}
        </Tag>
      ),
    },
    {
      title: "البيان",
      dataIndex: "description",
      key: "description",
      render: (desc: string | null) => desc || "-",
    },
    {
      title: "المبلغ",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number | string, record: Voucher) => (
        <MoneyDisplay
          amount={Number(amount)}
          colored
          showSign
          positive={record.type === "receipt"}
        />
      ),
    },
  ];

  const breadcrumbs = [
    { title: "القاصات", href: "/cash-registers" },
    { title: cashRegister.name },
  ];

  return (
    <div>
      <PageHeader
        title={cashRegister.name}
        subtitle={
          <Space>
            <code style={{ background: "#f5f5f5", padding: "2px 8px", borderRadius: 4 }}>
              {cashRegister.code}
            </code>
            <Tag>{cashRegister.currency || "IQD"}</Tag>
          </Space>
        }
        icon={<WalletOutlined />}
        breadcrumbs={breadcrumbs}
        tags={[
          <StatusTag key="status" status={cashRegister.isActive === 1 ? "active" : "inactive"} />,
        ]}
        extra={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              طباعة
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/cash-registers/${id}/edit`)}
              style={{ background: "#52c41a", borderColor: "#52c41a" }}
            >
              تعديل
            </Button>
          </Space>
        }
      />

      {/* Balance Card */}
      <Card
        style={{
          marginBottom: 24,
          background: "linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)",
          borderColor: "#b7eb8f",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#595959", marginBottom: 8 }}>الرصيد الحالي</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: balance >= 0 ? "#389e0d" : "#cf1322" }}>
            <MoneyDisplay amount={balance} currency={cashRegister.currency || "IQD"} />
          </div>
        </div>
      </Card>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="الرصيد الافتتاحي"
              value={openingBalance}
              precision={0}
              suffix={cashRegister.currency || "IQD"}
              valueStyle={{ color: "#8c8c8c" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="المقبوضات"
              value={totalReceipts}
              precision={0}
              prefix={<ArrowUpOutlined />}
              suffix={cashRegister.currency || "IQD"}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="المدفوعات"
              value={totalPayments}
              precision={0}
              prefix={<ArrowDownOutlined />}
              suffix={cashRegister.currency || "IQD"}
              valueStyle={{ color: "#f5222d" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="صافي التغيير"
              value={netChange}
              precision={0}
              prefix={netChange >= 0 ? "+" : ""}
              suffix={cashRegister.currency || "IQD"}
              valueStyle={{ color: netChange >= 0 ? "#1890ff" : "#faad14" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Details Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="معلومات القاصة" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="الكود">
                <code style={{ background: "#f5f5f5", padding: "2px 8px", borderRadius: 4 }}>
                  {cashRegister.code}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="العملة">{cashRegister.currency || "IQD"}</Descriptions.Item>
              <Descriptions.Item label="الحالة">
                <StatusTag status={cashRegister.isActive === 1 ? "active" : "inactive"} />
              </Descriptions.Item>
              <Descriptions.Item label="تاريخ الإنشاء">
                <DateDisplay date={cashRegister.createdAt} />
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="الفرع" size="small">
            {cashRegister.branch ? (
              <Link to={`/branches/${cashRegister.branch.id}`}>
                <Card
                  size="small"
                  style={{ background: "#fafafa", marginBottom: 16 }}
                  hoverable
                >
                  <Space>
                    <BranchesOutlined style={{ fontSize: 20, color: "#1890ff" }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {cashRegister.branch.nameAr || cashRegister.branch.name}
                      </div>
                    </div>
                  </Space>
                </Card>
              </Link>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="لم يتم ربط القاصة بفرع"
              />
            )}

            <Space style={{ width: "100%", marginTop: 16 }}>
              <Button
                type="primary"
                ghost
                icon={<PlusOutlined />}
                onClick={() => navigate("/vouchers/new")}
                style={{ flex: 1, color: "#52c41a", borderColor: "#52c41a" }}
              >
                سند قبض
              </Button>
              <Button
                type="primary"
                ghost
                icon={<PlusOutlined />}
                onClick={() => navigate("/vouchers/new")}
                style={{ flex: 1, color: "#f5222d", borderColor: "#f5222d" }}
              >
                سند صرف
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Recent Vouchers */}
      <Card title="آخر السندات">
        {vouchers.length === 0 ? (
          <Empty description="لا توجد سندات مسجلة على هذه القاصة" />
        ) : (
          <Table
            dataSource={vouchers}
            columns={voucherColumns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        )}
      </Card>
    </div>
  );
}
