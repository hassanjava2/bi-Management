import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Button,
  Space,
  message,
  Statistic,
  Pagination,
  Modal,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  DollarOutlined,
  WalletOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, LoadingSkeleton, MoneyDisplay } from "../components/shared";
import { fetchList, API_BASE, getAuthHeaders } from "../utils/api";

type CashRegister = {
  id: string;
  code: string;
  name: string;
  branchId: string | null;
  balance: number | null;
  currency: string | null;
  isActive: number | null;
  createdAt: string | null;
};

export default function CashRegisters() {
  const navigate = useNavigate();
  const [data, setData] = useState<CashRegister[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "القاصات | BI Management v3";
  }, []);

  const refetch = () => {
    setLoading(true);
    setError("");
    fetchList<CashRegister>("/api/cash-registers", page)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refetch();
  }, [page]);

  const handleDelete = async (id: string, name: string) => {
    Modal.confirm({
      title: "تعطيل القاصة",
      content: `هل تريد تعطيل القاصة "${name}"؟`,
      okText: "تعطيل",
      cancelText: "إلغاء",
      okButtonProps: { danger: true },
      onOk: async () => {
        setError("");
        try {
          const res = await fetch(`${API_BASE}/api/cash-registers/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
          });
          if (!res.ok) throw new Error("فشل التعطيل");
          message.success("تم تعطيل القاصة");
          refetch();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "فشل التعطيل";
          setError(errorMsg);
          message.error(errorMsg);
        }
      },
    });
  };

  // Stats
  const totalBalance = data.reduce((acc, cr) => acc + (cr.balance || 0), 0);
  const activeCount = data.filter((cr) => cr.isActive).length;

  if (loading) {
    return (
      <div>
        <PageHeader
          title="القاصات"
          subtitle="إدارة صناديق النقد"
          breadcrumbs={[{ title: "المالية", href: "/finance" }, { title: "القاصات" }]}
        />
        <LoadingSkeleton type="card" rows={4} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="القاصات"
        subtitle="إدارة صناديق النقد"
        breadcrumbs={[{ title: "المالية", href: "/finance" }, { title: "القاصات" }]}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/cash-registers/new")}
          >
            إنشاء قاصة
          </Button>
        }
      />

      {/* Quick Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="إجمالي القاصات"
              value={data.length}
              prefix={<WalletOutlined style={{ color: "#52c41a" }} />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="نشط"
              value={activeCount}
              prefix={<CheckCircleOutlined style={{ color: "#1890ff" }} />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="إجمالي الرصيد"
              value={totalBalance}
              prefix={<DollarOutlined style={{ color: "#722ed1" }} />}
              valueStyle={{ color: "#722ed1" }}
              formatter={(value) => `${Number(value).toLocaleString()} د.ع`}
            />
          </Card>
        </Col>
      </Row>

      {error && (
        <Card style={{ marginBottom: 16, borderColor: "#ff4d4f" }}>
          <div style={{ color: "#ff4d4f" }}>{error}</div>
        </Card>
      )}

      {data.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: 40, color: "#8c8c8c" }}>
            لا توجد قاصات مسجلة
          </div>
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {data.map((row) => (
              <Col xs={24} sm={12} lg={8} key={row.id}>
                <Card
                  hoverable
                  style={{
                    borderRight: row.isActive ? "4px solid #52c41a" : "4px solid #d9d9d9",
                  }}
                  styles={{ body: { padding: 20 } }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                      <Link
                        to={`/cash-registers/${row.id}`}
                        style={{ fontWeight: 600, fontSize: 18, color: "#1f1f1f" }}
                      >
                        {row.name}
                      </Link>
                      <div style={{ fontSize: 14, color: "#8c8c8c" }}>{row.code}</div>
                    </div>
                    <StatusTag status={row.isActive ? "active" : "inactive"} />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>الرصيد الحالي</div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>
                      <MoneyDisplay
                        amount={row.balance || 0}
                        currency={row.currency || "د.ع"}
                        colored
                        size="large"
                      />
                    </div>
                  </div>

                  <Space>
                    <Button
                      type="primary"
                      ghost
                      icon={<EditOutlined />}
                      size="small"
                      onClick={() => navigate(`/cash-registers/${row.id}/edit`)}
                    >
                      تعديل
                    </Button>
                    <Button
                      danger
                      ghost
                      icon={<StopOutlined />}
                      size="small"
                      onClick={() => handleDelete(row.id, row.name)}
                    >
                      تعطيل
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Pagination */}
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <Pagination
              current={page}
              pageSize={20}
              total={data.length >= 20 ? (page + 1) * 20 : page * 20}
              onChange={(newPage) => setPage(newPage)}
              showSizeChanger={false}
              showTotal={(total, range) => `صفحة ${page}`}
            />
          </div>
        </>
      )}
    </div>
  );
}
