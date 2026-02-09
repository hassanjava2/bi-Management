import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchList, API_BASE, getAuthHeaders } from "../utils/api";
import {
  Row,
  Col,
  Card,
  Button,
  Tag,
  Space,
  message,
  Statistic,
  Typography,
  Empty,
  Divider,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  BankOutlined,
  CheckCircleOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { PageHeader, MoneyDisplay, ConfirmDelete, LoadingSkeleton } from "../components/shared";

const { Text } = Typography;

type BankAccount = {
  id: string;
  accountNumber: string;
  bankName: string;
  accountName: string | null;
  branchName: string | null;
  balance: number | null;
  currency: string | null;
  iban: string | null;
  isActive: number | null;
  createdAt: string | null;
};

export default function BankAccounts() {
  const [data, setData] = useState<BankAccount[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "الحسابات البنكية | BI Management v3";
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await fetchList<BankAccount>("/api/bank-accounts", page);
      setData(result.data);
      setTotal(result.total || result.data.length);
    } catch (e) {
      message.error("فشل في تحميل الحسابات البنكية");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const handleDelete = async (id: string, name: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/bank-accounts/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("فشل التعطيل");
      message.success("تم تعطيل الحساب");
      fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "فشل التعطيل");
    }
  };

  // Stats
  const totalBalance = data.reduce((acc, ba) => acc + (ba.balance || 0), 0);
  const activeCount = data.filter((ba) => ba.isActive).length;

  // Group by bank
  const groupedData = data.reduce((acc, ba) => {
    if (!acc[ba.bankName]) acc[ba.bankName] = [];
    acc[ba.bankName].push(ba);
    return acc;
  }, {} as Record<string, BankAccount[]>);

  if (loading && data.length === 0) {
    return (
      <div>
        <PageHeader
          title="الحسابات البنكية"
          breadcrumbs={[{ title: "المالية" }, { title: "الحسابات البنكية" }]}
        />
        <LoadingSkeleton type="card" rows={6} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="الحسابات البنكية"
        subtitle={`إدارة الحسابات البنكية - ${total} حساب`}
        breadcrumbs={[{ title: "المالية" }, { title: "الحسابات البنكية" }]}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/bank-accounts/new")}
            style={{ background: "#06b6d4" }}
          >
            إضافة حساب
          </Button>
        }
      />

      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="إجمالي الحسابات"
              value={data.length}
              prefix={<BankOutlined style={{ color: "#0891b2" }} />}
              valueStyle={{ color: "#0891b2" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="نشط"
              value={activeCount}
              prefix={<CheckCircleOutlined style={{ color: "#3b82f6" }} />}
              valueStyle={{ color: "#3b82f6" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="إجمالي الرصيد"
              value={totalBalance}
              suffix="د.ع"
              prefix={<WalletOutlined style={{ color: totalBalance >= 0 ? "#22c55e" : "#ef4444" }} />}
              valueStyle={{ color: totalBalance >= 0 ? "#22c55e" : "#ef4444" }}
              formatter={(value) => new Intl.NumberFormat("ar-IQ").format(value as number)}
            />
          </Card>
        </Col>
      </Row>

      {/* Bank Accounts by Bank */}
      {data.length === 0 ? (
        <Card>
          <Empty description="لا توجد حسابات بنكية مسجلة" />
        </Card>
      ) : (
        Object.entries(groupedData).map(([bankName, accounts]) => {
          const bankTotal = accounts.reduce((acc, a) => acc + (a.balance || 0), 0);
          return (
            <Card
              key={bankName}
              style={{ marginBottom: 16 }}
              title={
                <Space>
                  <BankOutlined style={{ color: "#0c4a6e" }} />
                  <span style={{ fontWeight: 600, color: "#0c4a6e" }}>{bankName}</span>
                  <Tag color="blue">{accounts.length}</Tag>
                </Space>
              }
              extra={
                <Text strong style={{ color: bankTotal >= 0 ? "#15803d" : "#b91c1c" }}>
                  {bankTotal.toLocaleString()} د.ع
                </Text>
              }
            >
              <Row gutter={[16, 16]}>
                {accounts.map((account) => (
                  <Col xs={24} sm={12} lg={8} key={account.id}>
                    <Card
                      size="small"
                      style={{
                        borderRight: account.isActive
                          ? "4px solid #06b6d4"
                          : "4px solid #e2e8f0",
                      }}
                      actions={[
                        <Button
                          key="edit"
                          type="link"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => navigate(`/bank-accounts/${account.id}/edit`)}
                        >
                          تعديل
                        </Button>,
                        <ConfirmDelete
                          key="disable"
                          title="تعطيل الحساب"
                          description={`هل أنت متأكد من تعطيل الحساب "${account.accountName || account.accountNumber}"؟`}
                          onConfirm={() => handleDelete(account.id, account.accountName || account.accountNumber)}
                        >
                          <Button type="link" danger size="small" icon={<StopOutlined />}>
                            تعطيل
                          </Button>
                        </ConfirmDelete>,
                      ]}
                    >
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <Link
                              to={`/bank-accounts/${account.id}`}
                              style={{ fontWeight: 600, fontSize: 15, color: "#1e293b" }}
                            >
                              {account.accountName || account.accountNumber}
                            </Link>
                            <div style={{ fontSize: 13, color: "#64748b", fontFamily: "monospace" }}>
                              {account.accountNumber}
                            </div>
                          </div>
                          <Tag color={account.isActive ? "success" : "error"}>
                            {account.isActive ? "نشط" : "معطل"}
                          </Tag>
                        </div>
                      </div>

                      {account.branchName && (
                        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
                          فرع: {account.branchName}
                        </div>
                      )}

                      {account.iban && (
                        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12, fontFamily: "monospace" }}>
                          IBAN: {account.iban}
                        </div>
                      )}

                      <Divider style={{ margin: "12px 0" }} />

                      <div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>الرصيد</div>
                        <MoneyDisplay
                          amount={account.balance || 0}
                          currency={account.currency || "IQD"}
                          colored
                          size="large"
                        />
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          );
        })
      )}

      {/* Pagination */}
      {data.length >= 20 && (
        <div style={{ marginTop: 24, display: "flex", gap: 8, justifyContent: "center" }}>
          <Button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            السابق
          </Button>
          <span style={{ padding: "8px 16px", color: "#64748b" }}>صفحة {page}</span>
          <Button
            onClick={() => setPage((p) => p + 1)}
            disabled={data.length < 20}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  );
}
