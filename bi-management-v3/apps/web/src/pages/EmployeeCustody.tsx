/**
 * صفحة عهدة موظف معين
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  Statistic,
  Empty,
  Modal,
  Form,
  Avatar,
  Tabs,
  Typography,
  Descriptions,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowRightOutlined,
  PlusOutlined,
  MailOutlined,
  PhoneOutlined,
  BankOutlined,
  SwapOutlined,
  RollbackOutlined,
} from "@ant-design/icons";
import { PageHeader, LoadingSkeleton, DateDisplay } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

const { TextArea } = Input;
const { Text, Title } = Typography;

interface CustodyItem {
  id: string;
  serialNumber: string;
  productId: string;
  productName: string;
  productModel?: string;
  custodySince: string;
  custodyReason?: string;
  warehouseName?: string;
  condition?: string;
  notes?: string;
}

interface EmployeeInfo {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
}

interface CustodyHistory {
  id: string;
  serialNumber: string;
  productName: string;
  movementType: string;
  performedAt: string;
  performedByName?: string;
  notes?: string;
}

export default function EmployeeCustody() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [items, setItems] = useState<CustodyItem[]>([]);
  const [history, setHistory] = useState<CustodyHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Return modal
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CustodyItem | null>(null);
  const [returnForm] = Form.useForm();
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Transfer modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm] = Form.useForm();
  const [employees, setEmployees] = useState<{ id: string; fullName: string }[]>([]);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const res = await fetch(`${API_BASE}/api/custody/employee/${userId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setEmployee(data.employee || null);
        setItems(data.items || []);
        setHistory(data.history || []);
      }

      // Fetch warehouses
      const whRes = await fetch(`${API_BASE}/api/warehouses`, { headers });
      if (whRes.ok) {
        const whData = await whRes.json();
        setWarehouses(whData.warehouses || whData || []);
      }

      // Fetch employees for transfer
      const empRes = await fetch(`${API_BASE}/api/custody/employees`, { headers });
      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(
          (empData.employees || []).filter((e: any) => e.id !== userId)
        );
      }
    } catch (error) {
      console.error("Error:", error);
      message.error("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const getDaysInCustody = (since: string) => {
    const days = Math.floor(
      (Date.now() - new Date(since).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const getDaysColor = (days: number): "success" | "warning" | "error" => {
    if (days > 90) return "error";
    if (days > 30) return "warning";
    return "success";
  };

  const handleReturn = async () => {
    if (!selectedItem) return;

    setSubmitting(true);
    try {
      const values = returnForm.getFieldsValue();
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/custody/return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serialNumber: selectedItem.serialNumber,
          toWarehouseId: values.warehouseId || undefined,
          notes: values.notes,
        }),
      });

      if (res.ok) {
        message.success("تم استرداد العهدة بنجاح");
        setShowReturnModal(false);
        setSelectedItem(null);
        returnForm.resetFields();
        fetchData();
      } else {
        const data = await res.json();
        message.error(data.error || "فشل في استرداد العهدة");
      }
    } catch (error) {
      message.error("حدث خطأ في الاتصال");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedItem) return;

    try {
      const values = await transferForm.validateFields();
      setSubmitting(true);
      
      const res = await fetch(`${API_BASE}/api/custody/transfer`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          serialNumber: selectedItem.serialNumber,
          toUserId: values.toUserId,
          reason: values.reason,
        }),
      });

      if (res.ok) {
        message.success("تم تحويل العهدة بنجاح");
        setShowTransferModal(false);
        setSelectedItem(null);
        transferForm.resetFields();
        fetchData();
      } else {
        const data = await res.json();
        message.error(data.error || "فشل في تحويل العهدة");
      }
    } catch (error) {
      message.error("حدث خطأ في الاتصال");
    } finally {
      setSubmitting(false);
    }
  };

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      custody_assign: "تسليم عهدة",
      custody_return: "استرداد عهدة",
      transfer: "نقل",
      receipt: "استلام",
    };
    return labels[type] || type;
  };

  const getMovementTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      custody_assign: "green",
      custody_return: "orange",
      transfer: "blue",
      receipt: "purple",
    };
    return colors[type] || "default";
  };

  const historyColumns: ColumnsType<CustodyHistory> = [
    {
      title: "التاريخ",
      dataIndex: "performedAt",
      key: "performedAt",
      render: (date: string) => <DateDisplay date={date} format="datetime" />,
    },
    {
      title: "الحركة",
      dataIndex: "movementType",
      key: "movementType",
      render: (type: string) => (
        <Tag color={getMovementTypeColor(type)}>{getMovementTypeLabel(type)}</Tag>
      ),
    },
    {
      title: "السيريال",
      dataIndex: "serialNumber",
      key: "serialNumber",
      render: (serial: string) => (
        <Tag style={{ fontFamily: "monospace" }}>{serial}</Tag>
      ),
    },
    {
      title: "المنتج",
      dataIndex: "productName",
      key: "productName",
    },
    {
      title: "بواسطة",
      dataIndex: "performedByName",
      key: "performedByName",
      render: (name: string) => name || "-",
    },
    {
      title: "ملاحظات",
      dataIndex: "notes",
      key: "notes",
      ellipsis: true,
      render: (notes: string) => notes || "-",
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingSkeleton type="form" rows={6} />
      </div>
    );
  }

  if (!employee) {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <Empty description="الموظف غير موجود">
            <Link to="/custody">
              <Button type="primary">العودة للقائمة</Button>
            </Link>
          </Empty>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="عهدة الموظف"
        breadcrumbs={[
          { title: "إدارة العهد", href: "/custody" },
          { title: employee.fullName },
        ]}
        extra={
          <Space>
            <Button icon={<ArrowRightOutlined />} onClick={() => navigate(-1)}>
              رجوع
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate(`/custody/assign?employee=${userId}`)}
            >
              تسليم عهدة
            </Button>
          </Space>
        }
      />

      {/* Employee Card */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          <Col>
            <Avatar
              size={80}
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                fontSize: 32,
                fontWeight: 600,
              }}
            >
              {employee.fullName?.charAt(0) || "?"}
            </Avatar>
          </Col>
          <Col flex={1}>
            <Title level={4} style={{ margin: 0 }}>
              {employee.fullName}
            </Title>
            {employee.position && (
              <Text type="secondary">{employee.position}</Text>
            )}
            <div style={{ marginTop: 8 }}>
              <Space size="large" wrap>
                {employee.email && (
                  <Text type="secondary">
                    <MailOutlined style={{ marginLeft: 4 }} />
                    {employee.email}
                  </Text>
                )}
                {employee.phone && (
                  <Text type="secondary">
                    <PhoneOutlined style={{ marginLeft: 4 }} />
                    {employee.phone}
                  </Text>
                )}
                {employee.department && (
                  <Text type="secondary">
                    <BankOutlined style={{ marginLeft: 4 }} />
                    {employee.department}
                  </Text>
                )}
              </Space>
            </div>
          </Col>
          <Col>
            <Card
              style={{ background: "#e6f7ff", border: "none" }}
              styles={{ body: { padding: "16px 24px", textAlign: "center" } }}
            >
              <Statistic
                title={<span style={{ color: "#1890ff" }}>عهدة حالية</span>}
                value={items.length}
                valueStyle={{ color: "#1890ff", fontWeight: 700 }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs
          defaultActiveKey="current"
          items={[
            {
              key: "current",
              label: `العهد الحالية (${items.length})`,
              children: items.length === 0 ? (
                <Empty description="لا توجد عهد حالية لهذا الموظف" />
              ) : (
                <Row gutter={[16, 16]}>
                  {items.map((item) => {
                    const days = getDaysInCustody(item.custodySince);
                    const daysColor = getDaysColor(days);
                    
                    return (
                      <Col xs={24} md={12} key={item.id}>
                        <Card
                          size="small"
                          style={{ background: "#fafafa" }}
                          actions={[
                            <Button
                              key="return"
                              type="text"
                              icon={<RollbackOutlined />}
                              onClick={() => {
                                setSelectedItem(item);
                                setShowReturnModal(true);
                              }}
                              style={{ color: "#fa8c16" }}
                            >
                              استرداد
                            </Button>,
                            <Button
                              key="transfer"
                              type="text"
                              icon={<SwapOutlined />}
                              onClick={() => {
                                setSelectedItem(item);
                                setShowTransferModal(true);
                              }}
                              style={{ color: "#1890ff" }}
                            >
                              تحويل
                            </Button>,
                          ]}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                            <div>
                              <Link to={`/devices/${item.serialNumber}`}>
                                <Tag color="blue" style={{ fontFamily: "monospace" }}>
                                  {item.serialNumber}
                                </Tag>
                              </Link>
                              <div style={{ fontWeight: 500, marginTop: 8 }}>{item.productName}</div>
                              {item.productModel && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {item.productModel}
                                </Text>
                              )}
                            </div>
                            <Tag color={daysColor === "success" ? "green" : daysColor === "warning" ? "gold" : "red"}>
                              {days} يوم
                            </Tag>
                          </div>

                          <Descriptions size="small" column={1}>
                            <Descriptions.Item label="منذ">
                              <DateDisplay date={item.custodySince} format="datetime" />
                            </Descriptions.Item>
                            {item.custodyReason && (
                              <Descriptions.Item label="السبب">
                                {item.custodyReason}
                              </Descriptions.Item>
                            )}
                          </Descriptions>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              ),
            },
            {
              key: "history",
              label: `سجل الحركات (${history.length})`,
              children: history.length === 0 ? (
                <Empty description="لا يوجد سجل حركات" />
              ) : (
                <Table
                  columns={historyColumns}
                  dataSource={history}
                  rowKey="id"
                  pagination={{
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} من ${total}`,
                  }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Return Modal */}
      <Modal
        title="استرداد العهدة"
        open={showReturnModal}
        onOk={handleReturn}
        onCancel={() => {
          setShowReturnModal(false);
          setSelectedItem(null);
          returnForm.resetFields();
        }}
        okText="تأكيد الاسترداد"
        cancelText="إلغاء"
        confirmLoading={submitting}
        okButtonProps={{ danger: true }}
      >
        {selectedItem && (
          <>
            <p>
              استرداد الجهاز{" "}
              <Tag style={{ fontFamily: "monospace" }}>{selectedItem.serialNumber}</Tag>{" "}
              من الموظف
            </p>

            <Form form={returnForm} layout="vertical" style={{ marginTop: 16 }}>
              <Form.Item name="warehouseId" label="إرجاع إلى مستودع">
                <Select placeholder="نفس المستودع الحالي" allowClear>
                  {warehouses.map((wh) => (
                    <Select.Option key={wh.id} value={wh.id}>
                      {wh.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="notes" label="ملاحظات">
                <TextArea
                  rows={3}
                  placeholder="حالة الجهاز عند الاسترداد..."
                />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      {/* Transfer Modal */}
      <Modal
        title="تحويل العهدة"
        open={showTransferModal}
        onOk={handleTransfer}
        onCancel={() => {
          setShowTransferModal(false);
          setSelectedItem(null);
          transferForm.resetFields();
        }}
        okText="تأكيد التحويل"
        cancelText="إلغاء"
        confirmLoading={submitting}
      >
        {selectedItem && (
          <>
            <p>
              تحويل الجهاز{" "}
              <Tag style={{ fontFamily: "monospace" }}>{selectedItem.serialNumber}</Tag>{" "}
              لموظف آخر
            </p>

            <Form form={transferForm} layout="vertical" style={{ marginTop: 16 }}>
              <Form.Item
                name="toUserId"
                label="تحويل إلى"
                rules={[{ required: true, message: "اختر الموظف" }]}
              >
                <Select placeholder="اختر موظف..." showSearch optionFilterProp="children">
                  {employees.map((emp) => (
                    <Select.Option key={emp.id} value={emp.id}>
                      {emp.fullName}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="reason" label="سبب التحويل">
                <Input placeholder="مثال: انتقال لقسم آخر" />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
}
