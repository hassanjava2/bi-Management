import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Card, Descriptions, Button, Tag, Space, message } from "antd";
import { EditOutlined, ArrowRightOutlined, EnvironmentOutlined, PhoneOutlined, MailOutlined } from "@ant-design/icons";
import { PageHeader, StatusTag, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders, onAuthFailure } from "../utils/api";

type BranchDetailType = {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  isMain: number | null;
  isActive: number | null;
};

export default function BranchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<BranchDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "تفاصيل الفرع | BI Management v3";
  }, []);

  useEffect(() => {
    if (!id) {
      message.error("معرف الفرع مطلوب");
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${API_BASE}/api/branches/${id}`, { headers: getAuthHeaders() })
      .then((res) => {
        if (res.status === 401) {
          onAuthFailure();
          throw new Error("انتهت الجلسة");
        }
        if (!res.ok) throw new Error("الفرع غير موجود");
        return res.json();
      })
      .then(setData)
      .catch((e) => {
        message.error(e.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <LoadingSkeleton type="form" rows={6} />;
  }

  if (!data) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ color: "#94a3b8", marginBottom: 16 }}>الفرع غير موجود</p>
          <Button type="primary" onClick={() => navigate("/branches")}>
            العودة للفروع
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title={data.nameAr || data.name}
        subtitle={data.nameAr ? data.name : undefined}
        breadcrumbs={[
          { title: "الفروع", href: "/branches" },
          { title: data.nameAr || data.name },
        ]}
        extra={
          <Space>
            <Button icon={<ArrowRightOutlined />} onClick={() => navigate("/branches")}>
              العودة للفروع
            </Button>
            <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/branches/${id}/edit`)}>
              تعديل الفرع
            </Button>
          </Space>
        }
      />

      <Row gutter={[24, 24]}>
        {/* معلومات الفرع الأساسية */}
        <Col xs={24} lg={16}>
          <Card
            title="معلومات الفرع"
            extra={
              <Space>
                {data.isMain === 1 && <Tag color="green">فرع رئيسي</Tag>}
                <StatusTag status={data.isActive ? "active" : "inactive"} />
              </Space>
            }
          >
            <Descriptions column={{ xs: 1, sm: 2 }} bordered>
              <Descriptions.Item label="الكود">
                <code style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>
                  {data.code}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="الاسم بالعربي">
                {data.nameAr || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="الاسم بالإنجليزي">
                {data.name}
              </Descriptions.Item>
              <Descriptions.Item label="المدينة">
                {data.city ? (
                  <Space>
                    <EnvironmentOutlined style={{ color: "#6366f1" }} />
                    {data.city}
                  </Space>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="العنوان" span={2}>
                {data.address || "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* معلومات الاتصال */}
        <Col xs={24} lg={8}>
          <Card title="معلومات الاتصال">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item
                label={
                  <Space>
                    <PhoneOutlined />
                    الهاتف
                  </Space>
                }
              >
                {data.phone ? (
                  <a href={`tel:${data.phone}`} style={{ direction: "ltr", display: "inline-block" }}>
                    {data.phone}
                  </a>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space>
                    <MailOutlined />
                    البريد الإلكتروني
                  </Space>
                }
              >
                {data.email ? (
                  <a href={`mailto:${data.email}`}>{data.email}</a>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
