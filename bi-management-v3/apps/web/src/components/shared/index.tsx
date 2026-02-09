import React from "react";
import {
  Breadcrumb,
  Button,
  Card,
  Table,
  Tag,
  Space,
  Typography,
  Spin,
  Modal,
  Empty,
  Skeleton,
  Popconfirm,
  message,
} from "antd";
import type { TableProps, TableColumnType } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  FilterOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

dayjs.locale("ar");

const { Title, Text } = Typography;

// ==============================
// PageHeader - عنوان الصفحة مع breadcrumb
// ==============================

interface BreadcrumbItem {
  title: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  extra?: React.ReactNode;
  onBack?: () => void;
}

export function PageHeader({ title, subtitle, breadcrumbs = [], extra }: PageHeaderProps) {
  const breadcrumbItems = [
    { title: <Link to="/"><HomeOutlined /> الرئيسية</Link> },
    ...breadcrumbs.map((item) => ({
      title: item.href ? <Link to={item.href}>{item.title}</Link> : item.title,
    })),
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      {breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 16 }} />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            {title}
          </Title>
          {subtitle && (
            <Text type="secondary" style={{ marginTop: 4 }}>
              {subtitle}
            </Text>
          )}
        </div>
        {extra && <Space>{extra}</Space>}
      </div>
    </div>
  );
}

// ==============================
// DataTable - جدول موحد مع بحث وفلترة
// ==============================

interface DataTableProps<T> extends Omit<TableProps<T>, "title"> {
  title?: string;
  onAdd?: () => void;
  addLabel?: string;
  onRefresh?: () => void;
  onExport?: () => void;
  onBulkDelete?: (selectedRows: T[]) => void;
  searchPlaceholder?: string;
  extra?: React.ReactNode;
}

export function DataTable<T extends { id?: string | number }>({
  title,
  columns,
  dataSource,
  loading,
  onAdd,
  addLabel = "إضافة جديد",
  onRefresh,
  onExport,
  onBulkDelete,
  extra,
  rowSelection,
  ...props
}: DataTableProps<T>) {
  const [selectedRowKeys, setSelectedRowKeys] = React.useState<React.Key[]>([]);

  const tableRowSelection = rowSelection || (onBulkDelete ? {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  } : undefined);

  const selectedRows = dataSource?.filter((item) => selectedRowKeys.includes(item.id as React.Key)) || [];

  return (
    <Card
      title={title}
      extra={
        <Space wrap>
          {onBulkDelete && selectedRowKeys.length > 0 && (
            <Popconfirm
              title="تأكيد الحذف"
              description={`هل تريد حذف ${selectedRowKeys.length} عنصر؟`}
              onConfirm={() => {
                onBulkDelete(selectedRows);
                setSelectedRowKeys([]);
              }}
              okText="حذف"
              cancelText="إلغاء"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />}>
                حذف المحدد ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
          {onRefresh && (
            <Button icon={<ReloadOutlined />} onClick={onRefresh}>
              تحديث
            </Button>
          )}
          {onExport && (
            <Button icon={<ExportOutlined />} onClick={onExport}>
              تصدير
            </Button>
          )}
          {onAdd && (
            <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
              {addLabel}
            </Button>
          )}
          {extra}
        </Space>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table<T>
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        rowSelection={tableRowSelection}
        rowKey={(record) => record.id as React.Key}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} من ${total}`,
          pageSize: 20,
          pageSizeOptions: ["10", "20", "50", "100"],
        }}
        scroll={{ x: "max-content" }}
        {...props}
      />
    </Card>
  );
}

// ==============================
// FormCard - بطاقة نموذج موحدة
// ==============================

interface FormCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
  onSubmit?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  extra?: React.ReactNode;
}

export function FormCard({
  title,
  subtitle,
  children,
  loading,
  onSubmit,
  onCancel,
  submitLabel = "حفظ",
  cancelLabel = "إلغاء",
  extra,
}: FormCardProps) {
  return (
    <Card
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          {subtitle && (
            <Text type="secondary" style={{ fontSize: 14 }}>
              {subtitle}
            </Text>
          )}
        </div>
      }
      extra={extra}
    >
      <Spin spinning={loading || false}>
        {children}
        {(onSubmit || onCancel) && (
          <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "flex-end" }}>
            {onCancel && (
              <Button onClick={onCancel}>{cancelLabel}</Button>
            )}
            {onSubmit && (
              <Button type="primary" onClick={onSubmit}>
                {submitLabel}
              </Button>
            )}
          </div>
        )}
      </Spin>
    </Card>
  );
}

// ==============================
// StatusTag - علامات الحالة
// ==============================

type StatusType = "active" | "inactive" | "pending" | "completed" | "cancelled" | "draft" | "approved" | "rejected" | "paid" | "unpaid" | "partial" | "overdue" | string;

const statusConfig: Record<string, { color: string; label: string }> = {
  active: { color: "green", label: "نشط" },
  inactive: { color: "default", label: "غير نشط" },
  pending: { color: "gold", label: "معلق" },
  completed: { color: "green", label: "مكتمل" },
  cancelled: { color: "red", label: "ملغي" },
  draft: { color: "default", label: "مسودة" },
  approved: { color: "green", label: "موافق عليه" },
  rejected: { color: "red", label: "مرفوض" },
  paid: { color: "green", label: "مدفوع" },
  unpaid: { color: "orange", label: "غير مدفوع" },
  partial: { color: "blue", label: "جزئي" },
  overdue: { color: "red", label: "متأخر" },
  open: { color: "blue", label: "مفتوح" },
  closed: { color: "default", label: "مغلق" },
  in_progress: { color: "processing", label: "قيد التنفيذ" },
  on_hold: { color: "warning", label: "معلق" },
  shipped: { color: "cyan", label: "تم الشحن" },
  delivered: { color: "green", label: "تم التسليم" },
  returned: { color: "magenta", label: "مرتجع" },
};

interface StatusTagProps {
  status: StatusType;
  customLabel?: string;
}

export function StatusTag({ status, customLabel }: StatusTagProps) {
  const config = statusConfig[status] || { color: "default", label: status };
  return <Tag color={config.color}>{customLabel || config.label}</Tag>;
}

// ==============================
// MoneyDisplay - عرض الأرقام بصيغة العملة
// ==============================

interface MoneyDisplayProps {
  amount: number;
  currency?: string;
  colored?: boolean;
  size?: "small" | "default" | "large";
}

export function MoneyDisplay({ amount, currency = "د.ع", colored = false, size = "default" }: MoneyDisplayProps) {
  const formatted = new Intl.NumberFormat("ar-IQ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  const fontSize = size === "small" ? 13 : size === "large" ? 18 : 14;
  const fontWeight = size === "large" ? 600 : 400;

  const style: React.CSSProperties = {
    fontSize,
    fontWeight,
    fontFamily: "Tajawal, monospace",
  };

  if (colored) {
    style.color = amount > 0 ? "#059669" : amount < 0 ? "#dc2626" : undefined;
  }

  return (
    <span style={style}>
      {formatted} <small style={{ opacity: 0.7 }}>{currency}</small>
    </span>
  );
}

// ==============================
// DateDisplay - عرض التواريخ بالعربي
// ==============================

interface DateDisplayProps {
  date: string | Date | null | undefined;
  format?: "date" | "datetime" | "time" | "relative";
  fallback?: string;
}

export function DateDisplay({ date, format = "date", fallback = "-" }: DateDisplayProps) {
  if (!date) return <span style={{ color: "#94a3b8" }}>{fallback}</span>;

  const d = dayjs(date);
  if (!d.isValid()) return <span style={{ color: "#94a3b8" }}>{fallback}</span>;

  let formatted: string;
  switch (format) {
    case "datetime":
      formatted = d.format("YYYY/MM/DD HH:mm");
      break;
    case "time":
      formatted = d.format("HH:mm");
      break;
    case "relative":
      formatted = d.fromNow();
      break;
    default:
      formatted = d.format("YYYY/MM/DD");
  }

  return <span>{formatted}</span>;
}

// ==============================
// ConfirmDelete - تأكيد الحذف
// ==============================

interface ConfirmDeleteProps {
  onConfirm: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function ConfirmDelete({
  onConfirm,
  title = "تأكيد الحذف",
  description = "هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.",
  children,
}: ConfirmDeleteProps) {
  return (
    <Popconfirm
      title={title}
      description={description}
      onConfirm={onConfirm}
      okText="حذف"
      cancelText="إلغاء"
      okButtonProps={{ danger: true }}
      icon={<ExclamationCircleOutlined style={{ color: "#dc2626" }} />}
    >
      {children}
    </Popconfirm>
  );
}

// ==============================
// LoadingSpinner - مؤشر تحميل
// ==============================

interface LoadingSpinnerProps {
  tip?: string;
  fullPage?: boolean;
}

export function LoadingSpinner({ tip = "جاري التحميل...", fullPage = false }: LoadingSpinnerProps) {
  if (fullPage) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "#f1f5f9",
        }}
      >
        <Spin size="large" tip={tip} />
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: 40 }}>
      <Spin size="large" tip={tip} />
    </div>
  );
}

// ==============================
// LoadingSkeleton - هيكل تحميل
// ==============================

interface LoadingSkeletonProps {
  type?: "card" | "table" | "form" | "list";
  rows?: number;
}

export function LoadingSkeleton({ type = "card", rows = 4 }: LoadingSkeletonProps) {
  if (type === "table") {
    return (
      <Card>
        <Skeleton active paragraph={{ rows }} />
      </Card>
    );
  }

  if (type === "form") {
    return (
      <Card>
        <Skeleton active title={{ width: "30%" }} paragraph={{ rows, width: ["60%", "80%", "40%", "70%"] }} />
      </Card>
    );
  }

  if (type === "list") {
    return (
      <Card>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} avatar active paragraph={{ rows: 1 }} style={{ marginBottom: 16 }} />
        ))}
      </Card>
    );
  }

  return (
    <Card>
      <Skeleton active />
    </Card>
  );
}

// ==============================
// EmptyState - حالة فارغة
// ==============================

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  image?: React.ReactNode;
}

export function EmptyState({
  title = "لا توجد بيانات",
  description = "لم يتم العثور على أي عناصر",
  action,
  image,
}: EmptyStateProps) {
  return (
    <Card>
      <Empty
        image={image || Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div>
            <Text strong style={{ display: "block", marginBottom: 4 }}>
              {title}
            </Text>
            <Text type="secondary">{description}</Text>
          </div>
        }
      >
        {action}
      </Empty>
    </Card>
  );
}

// ==============================
// ActionButtons - أزرار الإجراءات للجداول
// ==============================

interface ActionButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  extra?: React.ReactNode;
}

export function ActionButtons({ onView, onEdit, onDelete, extra }: ActionButtonsProps) {
  return (
    <Space>
      {onView && (
        <Button type="link" size="small" onClick={onView}>
          عرض
        </Button>
      )}
      {onEdit && (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={onEdit}>
          تعديل
        </Button>
      )}
      {onDelete && (
        <ConfirmDelete onConfirm={onDelete}>
          <Button type="link" danger size="small" icon={<DeleteOutlined />}>
            حذف
          </Button>
        </ConfirmDelete>
      )}
      {extra}
    </Space>
  );
}

// ==============================
// StatsCard - بطاقة إحصائيات
// ==============================

interface StatsCardProps {
  title: string;
  value: number | string;
  prefix?: React.ReactNode;
  suffix?: string;
  trend?: { value: number; isUp: boolean };
  icon?: React.ReactNode;
  color?: string;
  loading?: boolean;
}

export function StatsCard({ title, value, prefix, suffix, trend, icon, color = "#3730a3", loading }: StatsCardProps) {
  if (loading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 1 }} />
      </Card>
    );
  }

  return (
    <Card
      styles={{
        body: {
          padding: "20px 24px",
        },
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <Text type="secondary" style={{ fontSize: 14 }}>
            {title}
          </Text>
          <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 4 }}>
            {prefix}
            <span style={{ fontSize: 28, fontWeight: 600, color }}>{value}</span>
            {suffix && <span style={{ fontSize: 14, color: "#64748b" }}>{suffix}</span>}
          </div>
          {trend && (
            <div style={{ marginTop: 8 }}>
              <Tag color={trend.isUp ? "green" : "red"}>
                {trend.isUp ? "↑" : "↓"} {Math.abs(trend.value)}%
              </Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                مقارنة بالفترة السابقة
              </Text>
            </div>
          )}
        </div>
        {icon && (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: `${color}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              color,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
