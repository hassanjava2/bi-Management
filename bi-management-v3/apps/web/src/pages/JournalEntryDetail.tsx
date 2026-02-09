import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Row, Col, Card, Descriptions, Tag, Space, Button, Statistic, Table, Empty, message, Alert } from "antd";
import {
  ArrowLeftOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton, MoneyDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders, onAuthFailure } from "../utils/api";

type JournalEntryLine = {
  id: string;
  journalEntryId: string;
  accountId: string;
  accountName?: string;
  accountCode?: string;
  debit: number | null;
  credit: number | null;
  description: string | null;
};

type JournalEntryDetailType = {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string | null;
  status: string | null;
  totalDebit: number | null;
  totalCredit: number | null;
  createdAt: string | null;
  lines?: JournalEntryLine[];
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "default" },
  posted: { label: "مرحّل", color: "green" },
  reversed: { label: "معكوس", color: "red" },
};

export default function JournalEntryDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<JournalEntryDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "تفاصيل القيد | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      setError("معرف القيد مطلوب");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/api/journal-entries/${id}`, { headers: getAuthHeaders() })
      .then((res) => {
        if (res.status === 401) {
          onAuthFailure();
          throw new Error("انتهت الجلسة");
        }
        if (!res.ok) throw new Error("القيد غير موجود");
        return res.json();
      })
      .then(setData)
      .catch((e) => {
        setError(e.message);
        message.error(e.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <LoadingSkeleton type="form" rows={6} />;
  }

  if (error) {
    return (
      <Card>
        <Empty description={error}>
          <Link to="/journal-entries">
            <Button type="primary">العودة للقيود اليومية</Button>
          </Link>
        </Empty>
      </Card>
    );
  }

  if (!data) return null;

  const statusInfo = STATUS_LABELS[data.status || "draft"] || STATUS_LABELS.draft;
  const isBalanced = data.totalDebit === data.totalCredit;
  const difference = Math.abs((data.totalDebit || 0) - (data.totalCredit || 0));

  const lineColumns = [
    {
      title: "#",
      key: "index",
      width: 50,
      render: (_: unknown, __: unknown, index: number) => (
        <span style={{ color: "#94a3b8" }}>{index + 1}</span>
      ),
    },
    {
      title: "الحساب",
      dataIndex: "accountName",
      key: "accountName",
      render: (name: string, record: JournalEntryLine) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name || record.accountId}</div>
          {record.accountCode && (
            <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace" }}>
              {record.accountCode}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "البيان",
      dataIndex: "description",
      key: "description",
      render: (desc: string | null) => desc || "—",
    },
    {
      title: "مدين",
      dataIndex: "debit",
      key: "debit",
      render: (debit: number | null) =>
        (debit || 0) > 0 ? (
          <MoneyDisplay amount={debit || 0} colored />
        ) : (
          <span style={{ color: "#94a3b8" }}>—</span>
        ),
    },
    {
      title: "دائن",
      dataIndex: "credit",
      key: "credit",
      render: (credit: number | null) =>
        (credit || 0) > 0 ? (
          <span style={{ color: "#b45309", fontWeight: 600 }}>
            {(credit || 0).toLocaleString("ar-IQ")}
          </span>
        ) : (
          <span style={{ color: "#94a3b8" }}>—</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={`قيد #${data.entryNumber}`}
        subtitle={<DateDisplay date={data.entryDate} />}
        breadcrumbs={[
          { title: "القيود اليومية", href: "/journal-entries" },
          { title: "تفاصيل القيد" },
        ]}
        extra={
          <Space>
            <Link to="/journal-entries">
              <Button icon={<ArrowLeftOutlined />}>العودة</Button>
            </Link>
            {data.status === "draft" && (
              <Button type="primary" icon={<CheckCircleOutlined />}>
                ترحيل القيد
              </Button>
            )}
            {data?.status === "draft" && (
              <Link to={`/journal-entries/${id}/edit`}>
                <Button icon={<EditOutlined />}>تعديل</Button>
              </Link>
            )}
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              طباعة
            </Button>
          </Space>
        }
      />

      {/* Status and Balance Alert */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card>
            <Row gutter={[24, 16]} align="middle">
              <Col>
                <Tag color={statusInfo.color} style={{ fontSize: 14, padding: "4px 12px" }}>
                  {statusInfo.label}
                </Tag>
              </Col>
              {!isBalanced && (
                <Col>
                  <Tag color="red" style={{ fontSize: 14, padding: "4px 12px" }}>
                    غير متوازن
                  </Tag>
                </Col>
              )}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Financial Summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ background: "#dbeafe" }}>
            <Statistic
              title="إجمالي المدين"
              value={data.totalDebit || 0}
              valueStyle={{ color: "#1d4ed8" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ background: "#fef3c7" }}>
            <Statistic
              title="إجمالي الدائن"
              value={data.totalCredit || 0}
              valueStyle={{ color: "#b45309" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ background: isBalanced ? "#dcfce7" : "#fee2e2" }}>
            <Statistic
              title="الفرق"
              value={difference}
              suffix={isBalanced ? "متوازن ✓" : ""}
              valueStyle={{ color: isBalanced ? "#15803d" : "#b91c1c" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Description */}
      {data.description && (
        <Alert
          message="الوصف"
          description={data.description}
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Entry Lines */}
      <Card title="بنود القيد">
        {data.lines && data.lines.length > 0 ? (
          <Table
            columns={lineColumns}
            dataSource={data.lines}
            rowKey="id"
            pagination={false}
            summary={() => (
              <Table.Summary.Row style={{ background: "#f8fafc", fontWeight: 600 }}>
                <Table.Summary.Cell index={0} colSpan={3}>
                  الإجمالي
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <span style={{ color: "#1d4ed8" }}>
                    {(data.totalDebit || 0).toLocaleString("ar-IQ")}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}>
                  <span style={{ color: "#b45309" }}>
                    {(data.totalCredit || 0).toLocaleString("ar-IQ")}
                  </span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد بنود في هذا القيد" />
        )}
      </Card>
    </div>
  );
}
