import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Row, Col, Card, Descriptions, Tag, Space, Button, Statistic, Table, Empty, message } from "antd";
import {
  BankOutlined,
  EditOutlined,
  PrinterOutlined,
  PlusOutlined,
  ArrowRightOutlined,
  SwapOutlined,
  GlobalOutlined,
  BranchesOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton, StatusTag, MoneyDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

type BankAccount = {
  id: string;
  accountNumber: string;
  bankName: string;
  accountName: string | null;
  branchName: string | null;
  balance: number | string | null;
  openingBalance: number | string | null;
  currency: string | null;
  accountType: string | null;
  iban: string | null;
  swiftCode: string | null;
  isActive: number | null;
  createdAt: string;
  branch?: { id: string; name: string; nameAr: string | null };
};

type Transaction = {
  id: string;
  type: string;
  amount: number | string;
  description: string | null;
  createdAt: string;
  voucher?: { id: string; voucherNumber: string };
  check?: { id: string; checkNumber: string };
};

const ACCOUNT_TYPES: Record<string, { label: string; color: string }> = {
  current: { label: "جاري", color: "blue" },
  savings: { label: "توفير", color: "green" },
  deposit: { label: "وديعة", color: "purple" },
};

export default function BankAccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "تفاصيل الحساب البنكي | BI Management v3";

    const fetchData = async () => {
      try {
        // Fetch bank account details
        const baRes = await fetch(`${API_BASE}/api/bank-accounts/${id}`, { headers: getAuthHeaders() });
        if (!baRes.ok) throw new Error("فشل تحميل بيانات الحساب البنكي");
        const baData = await baRes.json();
        setBankAccount(baData);

        // Fetch transactions (vouchers & checks)
        const [vRes, cRes] = await Promise.all([
          fetch(`${API_BASE}/api/vouchers?bankAccountId=${id}&limit=15`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/checks?bankAccountId=${id}&limit=15`, { headers: getAuthHeaders() }),
        ]);

        const allTx: Transaction[] = [];

        if (vRes.ok) {
          const vData = await vRes.json();
          (vData.data || []).forEach((v: Transaction) => allTx.push({ ...v, voucher: { id: v.id, voucherNumber: v.description || "سند" } }));
        }

        if (cRes.ok) {
          const cData = await cRes.json();
          (cData.data || []).forEach((c: Transaction) => allTx.push({ ...c, check: { id: c.id, checkNumber: c.description || "شيك" } }));
        }

        // Sort by date
        allTx.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTransactions(allTx.slice(0, 20));
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

  if (error || !bankAccount) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={error || "الحساب البنكي غير موجود"}
        >
          <Button type="primary" onClick={() => navigate("/bank-accounts")}>
            العودة للحسابات البنكية
          </Button>
        </Empty>
      </div>
    );
  }

  const balance = Number(bankAccount.balance || 0);
  const openingBalance = Number(bankAccount.openingBalance || 0);
  const netChange = balance - openingBalance;
  const accountType = ACCOUNT_TYPES[bankAccount.accountType || "current"] || ACCOUNT_TYPES.current;

  const transactionColumns = [
    {
      title: "التاريخ",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => <DateDisplay date={date} />,
    },
    {
      title: "المرجع",
      key: "reference",
      render: (_: unknown, record: Transaction) => {
        if (record.voucher) {
          return (
            <Link to={`/vouchers/${record.voucher.id}`} style={{ color: "#1890ff" }}>
              {record.voucher.voucherNumber}
            </Link>
          );
        }
        if (record.check) {
          return (
            <Link to={`/checks/${record.check.id}`} style={{ color: "#faad14" }}>
              {record.check.checkNumber}
            </Link>
          );
        }
        return "-";
      },
    },
    {
      title: "النوع",
      dataIndex: "type",
      key: "type",
      render: (type: string) => (
        <Tag color={type === "receipt" || type === "incoming" ? "success" : "error"}>
          {type === "receipt" || type === "incoming" ? "إيداع" : "سحب"}
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
      render: (amount: number | string, record: Transaction) => {
        const isIncoming = record.type === "receipt" || record.type === "incoming";
        return (
          <MoneyDisplay
            amount={Number(amount)}
            colored
            showSign
            positive={isIncoming}
          />
        );
      },
    },
  ];

  const breadcrumbs = [
    { title: "الحسابات البنكية", href: "/bank-accounts" },
    { title: bankAccount.accountName || bankAccount.accountNumber },
  ];

  return (
    <div>
      <PageHeader
        title={bankAccount.accountName || bankAccount.accountNumber}
        subtitle={bankAccount.bankName}
        icon={<BankOutlined />}
        breadcrumbs={breadcrumbs}
        tags={[
          <Tag key="type" color={accountType.color}>{accountType.label}</Tag>,
          <StatusTag key="status" status={bankAccount.isActive === 1 ? "active" : "inactive"} />,
        ]}
        extra={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              طباعة
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/bank-accounts/${id}/edit`)}
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
          background: "linear-gradient(135deg, #e6fffb 0%, #b5f5ec 100%)",
          borderColor: "#87e8de",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#595959", marginBottom: 8 }}>الرصيد الحالي</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: balance >= 0 ? "#006d75" : "#cf1322" }}>
            <MoneyDisplay amount={balance} currency={bankAccount.currency || "IQD"} />
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
              suffix={bankAccount.currency || "IQD"}
              valueStyle={{ color: "#8c8c8c" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="الرصيد الحالي"
              value={balance}
              precision={0}
              suffix={bankAccount.currency || "IQD"}
              valueStyle={{ color: balance >= 0 ? "#006d75" : "#cf1322" }}
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
              suffix={bankAccount.currency || "IQD"}
              valueStyle={{ color: netChange >= 0 ? "#52c41a" : "#f5222d" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="عدد الحركات"
              value={transactions.length}
              valueStyle={{ color: "#722ed1" }}
              prefix={<SwapOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Details Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="معلومات الحساب" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="البنك">{bankAccount.bankName}</Descriptions.Item>
              <Descriptions.Item label="رقم الحساب">
                <code style={{ background: "#f5f5f5", padding: "2px 8px", borderRadius: 4 }}>
                  {bankAccount.accountNumber}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="نوع الحساب">
                <Tag color={accountType.color}>{accountType.label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="العملة">{bankAccount.currency || "IQD"}</Descriptions.Item>
              {bankAccount.branchName && (
                <Descriptions.Item label="فرع البنك">{bankAccount.branchName}</Descriptions.Item>
              )}
              <Descriptions.Item label="تاريخ الإنشاء">
                <DateDisplay date={bankAccount.createdAt} />
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="معلومات التحويل" size="small">
            {bankAccount.iban && (
              <div style={{ marginBottom: 16, padding: 12, background: "#fafafa", borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>
                  <GlobalOutlined /> IBAN
                </div>
                <code style={{ fontSize: 13, wordBreak: "break-all" }}>{bankAccount.iban}</code>
              </div>
            )}

            {bankAccount.swiftCode && (
              <div style={{ marginBottom: 16, padding: 12, background: "#fafafa", borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>
                  <GlobalOutlined /> SWIFT Code
                </div>
                <code style={{ fontSize: 13 }}>{bankAccount.swiftCode}</code>
              </div>
            )}

            {!bankAccount.iban && !bankAccount.swiftCode && (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="لم يتم إدخال معلومات التحويل الدولي"
              />
            )}

            {bankAccount.branch && (
              <Link to={`/branches/${bankAccount.branch.id}`}>
                <Card
                  size="small"
                  style={{ marginTop: 16, background: "#f0f5ff", borderColor: "#adc6ff" }}
                  hoverable
                >
                  <Space>
                    <BranchesOutlined style={{ fontSize: 20, color: "#2f54eb" }} />
                    <div>
                      <div style={{ fontSize: 12, color: "#8c8c8c" }}>الفرع المرتبط</div>
                      <div style={{ fontWeight: 600 }}>
                        {bankAccount.branch.nameAr || bankAccount.branch.name}
                      </div>
                    </div>
                  </Space>
                </Card>
              </Link>
            )}
          </Card>
        </Col>
      </Row>

      {/* Recent Transactions */}
      <Card
        title="آخر الحركات"
        extra={
          <Space>
            <Button
              type="primary"
              ghost
              size="small"
              icon={<PlusOutlined />}
              onClick={() => navigate("/vouchers/new")}
              style={{ color: "#52c41a", borderColor: "#52c41a" }}
            >
              سند
            </Button>
            <Button
              type="primary"
              ghost
              size="small"
              icon={<PlusOutlined />}
              onClick={() => navigate("/checks/new")}
              style={{ color: "#f5222d", borderColor: "#f5222d" }}
            >
              شيك
            </Button>
          </Space>
        }
      >
        {transactions.length === 0 ? (
          <Empty description="لا توجد حركات مسجلة على هذا الحساب" />
        ) : (
          <Table
            dataSource={transactions}
            columns={transactionColumns}
            rowKey={(record, index) => `${record.id}-${index}`}
            pagination={false}
            size="small"
          />
        )}
      </Card>
    </div>
  );
}
