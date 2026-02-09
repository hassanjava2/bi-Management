/**
 * صفحة مركز الأرشيف
 */
import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Input,
  Select,
  Tag,
  Space,
  message,
  Empty,
  Modal,
  Table,
  Statistic,
  Tabs,
  Popconfirm,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  SaveOutlined,
  DeleteOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  FileOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  FileTextOutlined,
  InboxOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface ArchivedItem {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  description: string | null;
  category: string | null;
  archiveReason: string | null;
  archivedAt: string;
  isLocked: boolean;
}

interface Backup {
  id: string;
  name: string;
  backupType: string;
  status: string;
  size: string | null;
  createdAt: string;
  completedAt: string | null;
}

const ENTITY_TYPES: Record<string, { label: string; icon: React.ReactNode }> = {
  invoice: { label: "فاتورة", icon: <FileTextOutlined /> },
  customer: { label: "عميل", icon: <UserOutlined /> },
  product: { label: "منتج", icon: <InboxOutlined /> },
  order: { label: "طلب", icon: <ShoppingCartOutlined /> },
  employee: { label: "موظف", icon: <UserOutlined /> },
  contract: { label: "عقد", icon: <FileOutlined /> },
  other: { label: "أخرى", icon: <InboxOutlined /> },
};

const BACKUP_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد الانتظار", color: "default" },
  in_progress: { label: "جاري", color: "processing" },
  completed: { label: "مكتمل", color: "success" },
  failed: { label: "فشل", color: "error" },
};

export default function ArchiveCenter() {
  const [items, setItems] = useState<ArchivedItem[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("items");
  const [entityFilter, setEntityFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, [entityFilter, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityFilter) params.append("entityType", entityFilter);
      if (search) params.append("search", search);

      const [itemsRes, backupsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/archive/items?${params}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/archive/backups`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/archive/stats`, { headers: getAuthHeaders() }),
      ]);
      if (itemsRes.ok) setItems((await itemsRes.json()).items || []);
      if (backupsRes.ok) setBackups((await backupsRes.json()).backups || []);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const createBackup = () => {
    Modal.confirm({
      title: "إنشاء نسخة احتياطية",
      content: (
        <Input id="backup-name" placeholder="اسم النسخة الاحتياطية" style={{ marginTop: 16 }} />
      ),
      okText: "إنشاء",
      cancelText: "إلغاء",
      onOk: async () => {
        const nameEl = document.getElementById("backup-name") as HTMLInputElement;
        if (!nameEl?.value) {
          message.error("يرجى إدخال اسم النسخة");
          return Promise.reject();
        }
        try {
          await fetch(`${API_BASE}/api/archive/backups`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ name: nameEl.value }),
          });
          message.success("تم إنشاء النسخة الاحتياطية");
          loadData();
        } catch (error) {
          console.error(error);
          message.error("فشل في إنشاء النسخة");
        }
      },
    });
  };

  const restoreBackup = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/archive/backups/${id}/restore`, { method: "POST" });
      message.success("تم استعادة النسخة بنجاح");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في استعادة النسخة");
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/archive/items/${id}`, { method: "DELETE" });
      message.success("تم حذف العنصر");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في حذف العنصر");
    }
  };

  const itemColumns: ColumnsType<ArchivedItem> = [
    {
      title: "العنصر",
      dataIndex: "title",
      key: "title",
      render: (_, record) => {
        const type = ENTITY_TYPES[record.entityType] || ENTITY_TYPES.other;
        return (
          <Space>
            {type.icon}
            <div>
              <div style={{ fontWeight: 500 }}>
                {record.title}
                {record.isLocked && <LockOutlined style={{ marginRight: 8, color: "#faad14" }} />}
              </div>
              {record.description && (
                <div style={{ fontSize: 12, color: "#8c8c8c" }}>{record.description}</div>
              )}
            </div>
          </Space>
        );
      },
    },
    {
      title: "النوع",
      dataIndex: "entityType",
      key: "entityType",
      align: "center",
      width: 100,
      render: (type: string) => {
        const config = ENTITY_TYPES[type] || ENTITY_TYPES.other;
        return <Tag>{config.label}</Tag>;
      },
    },
    {
      title: "السبب",
      dataIndex: "archiveReason",
      key: "archiveReason",
      align: "center",
      width: 150,
      render: (reason: string | null) => reason || "-",
    },
    {
      title: "تاريخ الأرشفة",
      dataIndex: "archivedAt",
      key: "archivedAt",
      align: "center",
      width: 120,
      render: (date: string) => <DateDisplay date={date} />,
    },
    {
      title: "إجراءات",
      key: "actions",
      align: "center",
      width: 80,
      render: (_, record) =>
        !record.isLocked && (
          <Popconfirm
            title="حذف العنصر"
            description="هل أنت متأكد من حذف هذا العنصر؟"
            onConfirm={() => deleteItem(record.id)}
            okText="حذف"
            cancelText="إلغاء"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        ),
    },
  ];

  const backupColumns: ColumnsType<Backup> = [
    {
      title: "الاسم",
      dataIndex: "name",
      key: "name",
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: "النوع",
      dataIndex: "backupType",
      key: "backupType",
      align: "center",
      width: 100,
      render: (type: string) => {
        switch (type) {
          case "full":
            return "كاملة";
          case "incremental":
            return "تزايدية";
          default:
            return "تفاضلية";
        }
      },
    },
    {
      title: "الحالة",
      dataIndex: "status",
      key: "status",
      align: "center",
      width: 120,
      render: (status: string) => {
        const config = BACKUP_STATUS[status] || BACKUP_STATUS.pending;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "التاريخ",
      dataIndex: "createdAt",
      key: "createdAt",
      align: "center",
      width: 120,
      render: (date: string) => <DateDisplay date={date} />,
    },
    {
      title: "إجراءات",
      key: "actions",
      align: "center",
      width: 100,
      render: (_, record) =>
        record.status === "completed" && (
          <Popconfirm
            title="استعادة النسخة"
            description="هل أنت متأكد من استعادة هذه النسخة؟"
            onConfirm={() => restoreBackup(record.id)}
            okText="استعادة"
            cancelText="إلغاء"
          >
            <Button type="primary" size="small" icon={<ReloadOutlined />}>
              استعادة
            </Button>
          </Popconfirm>
        ),
    },
  ];

  const tabItems = [
    {
      key: "items",
      label: (
        <span>
          <InboxOutlined /> العناصر المؤرشفة
        </span>
      ),
      children: (
        <>
          {/* الفلاتر */}
          <Space style={{ marginBottom: 16 }} wrap>
            <Input.Search
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث..."
              allowClear
              style={{ width: 250 }}
            />
            <Select
              value={entityFilter || undefined}
              onChange={(value) => setEntityFilter(value || "")}
              placeholder="كل الأنواع"
              allowClear
              style={{ width: 150 }}
            >
              {Object.entries(ENTITY_TYPES).map(([k, v]) => (
                <Select.Option key={k} value={k}>
                  {v.icon} {v.label}
                </Select.Option>
              ))}
            </Select>
          </Space>

          {loading ? (
            <LoadingSkeleton type="table" rows={5} />
          ) : items.length === 0 ? (
            <Empty
              image={<DatabaseOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
              description="لا توجد عناصر مؤرشفة"
            />
          ) : (
            <Table
              columns={itemColumns}
              dataSource={items}
              rowKey="id"
              pagination={{
                showSizeChanger: true,
                showTotal: (total) => `${total} عنصر`,
              }}
            />
          )}
        </>
      ),
    },
    {
      key: "backups",
      label: (
        <span>
          <SaveOutlined /> النسخ الاحتياطية
        </span>
      ),
      children:
        backups.length === 0 ? (
          <Empty
            image={<SaveOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
            description="لا توجد نسخ احتياطية"
          />
        ) : (
          <Table
            columns={backupColumns}
            dataSource={backups}
            rowKey="id"
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `${total} نسخة`,
            }}
          />
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="مركز الأرشيف"
        subtitle="إدارة الأرشيف والنسخ الاحتياطية"
        breadcrumbs={[{ title: "مركز الأرشيف" }]}
        extra={
          <Button type="primary" icon={<SaveOutlined />} onClick={createBackup}>
            نسخة احتياطية
          </Button>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ background: "#e6f7ff" }}>
              <Statistic
                title="عناصر مؤرشفة"
                value={stats.totalItems}
                valueStyle={{ color: "#1890ff" }}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ background: "#f6ffed" }}>
              <Statistic
                title="نسخ احتياطية"
                value={stats.totalBackups}
                valueStyle={{ color: "#52c41a" }}
                prefix={<SaveOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ background: "#fff7e6" }}>
              <Statistic
                title="فواتير"
                value={stats.byType?.invoice || 0}
                valueStyle={{ color: "#fa8c16" }}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="عملاء"
                value={stats.byType?.customer || 0}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* التبويبات */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  );
}
