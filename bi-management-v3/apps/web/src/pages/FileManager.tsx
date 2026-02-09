/**
 * صفحة مدير الملفات
 */
import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Input,
  Space,
  message,
  Empty,
  Modal,
  Table,
  Statistic,
  Breadcrumb,
  Popconfirm,
  Upload,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  FolderOutlined,
  FolderAddOutlined,
  FileOutlined,
  FileImageOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  SoundOutlined,
  FileZipOutlined,
  PaperClipOutlined,
  DeleteOutlined,
  UploadOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  HomeOutlined,
  CloudUploadOutlined,
} from "@ant-design/icons";
import { PageHeader, DateDisplay, LoadingSkeleton } from "../components/shared";
import { API_BASE, getAuthHeaders } from "../utils/api";

interface Folder {
  id: string;
  name: string;
  path: string;
  color: string | null;
}

interface FileItem {
  id: string;
  name: string;
  originalName: string;
  url: string;
  mimeType: string;
  extension: string;
  size: number;
  category: string;
  createdAt: string;
  downloadCount: number;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  image: <FileImageOutlined style={{ color: "#faad14" }} />,
  video: <VideoCameraOutlined style={{ color: "#1890ff" }} />,
  audio: <SoundOutlined style={{ color: "#722ed1" }} />,
  document: <FileTextOutlined style={{ color: "#52c41a" }} />,
  archive: <FileZipOutlined style={{ color: "#fa8c16" }} />,
  other: <PaperClipOutlined />,
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default function FileManager() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "الرئيسية" },
  ]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [currentFolder, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const folderParams = currentFolder ? `?parentId=${currentFolder}` : "";
      const fileParams = new URLSearchParams();
      if (currentFolder) fileParams.append("folderId", currentFolder);
      if (search) fileParams.append("search", search);

      const [foldersRes, filesRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/files/folders${folderParams}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/files?${fileParams}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/files/stats`, { headers: getAuthHeaders() }),
      ]);
      if (foldersRes.ok) setFolders((await foldersRes.json()).folders || []);
      if (filesRes.ok) setFiles((await filesRes.json()).files || []);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error(error);
      message.error("حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folder: Folder | null) => {
    if (folder) {
      setCurrentFolder(folder.id);
      setBreadcrumb([...breadcrumb, { id: folder.id, name: folder.name }]);
    } else {
      setCurrentFolder(null);
      setBreadcrumb([{ id: null, name: "الرئيسية" }]);
    }
    setSelectedFiles([]);
  };

  const navigateToBreadcrumb = (index: number) => {
    const item = breadcrumb[index];
    setCurrentFolder(item.id);
    setBreadcrumb(breadcrumb.slice(0, index + 1));
    setSelectedFiles([]);
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      message.error("يرجى إدخال اسم المجلد");
      return;
    }
    try {
      await fetch(`${API_BASE}/api/files/folders`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: newFolderName, parentId: currentFolder }),
      });
      message.success("تم إنشاء المجلد بنجاح");
      setShowNewFolderModal(false);
      setNewFolderName("");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في إنشاء المجلد");
    }
  };

  const deleteFile = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/files/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      message.success("تم حذف الملف");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في حذف الملف");
    }
  };

  const deleteFolder = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/files/folders/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      message.success("تم حذف المجلد");
      loadData();
    } catch (error) {
      console.error(error);
      message.error("فشل في حذف المجلد");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedFiles((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const breadcrumbItems = breadcrumb.map((item, index) => ({
    title:
      index === 0 ? (
        <a onClick={() => navigateToBreadcrumb(index)}>
          <HomeOutlined /> {item.name}
        </a>
      ) : index === breadcrumb.length - 1 ? (
        <span>
          <FolderOutlined /> {item.name}
        </span>
      ) : (
        <a onClick={() => navigateToBreadcrumb(index)}>
          <FolderOutlined /> {item.name}
        </a>
      ),
  }));

  const listColumns: ColumnsType<Folder | FileItem> = [
    {
      title: "الاسم",
      key: "name",
      render: (_, record) => {
        if ("path" in record) {
          // Folder
          return (
            <a onClick={() => navigateToFolder(record as Folder)}>
              <FolderOutlined style={{ color: "#faad14", marginLeft: 8 }} />
              {record.name}
            </a>
          );
        } else {
          // File
          const file = record as FileItem;
          return (
            <span>
              {CATEGORY_ICONS[file.category] || CATEGORY_ICONS.other}
              <span style={{ marginRight: 8 }}>{file.name}</span>
            </span>
          );
        }
      },
    },
    {
      title: "النوع",
      key: "type",
      align: "center",
      width: 100,
      render: (_, record) => {
        if ("path" in record) {
          return "مجلد";
        } else {
          return (record as FileItem).extension?.toUpperCase() || "-";
        }
      },
    },
    {
      title: "الحجم",
      key: "size",
      align: "center",
      width: 100,
      render: (_, record) => {
        if ("path" in record) {
          return "-";
        } else {
          return formatFileSize((record as FileItem).size);
        }
      },
    },
    {
      title: "التاريخ",
      key: "date",
      align: "center",
      width: 120,
      render: (_, record) => {
        if ("path" in record) {
          return "-";
        } else {
          return <DateDisplay date={(record as FileItem).createdAt} />;
        }
      },
    },
    {
      title: "إجراءات",
      key: "actions",
      align: "center",
      width: 80,
      render: (_, record) => {
        if ("path" in record) {
          return (
            <Popconfirm
              title="حذف المجلد"
              description="هل أنت متأكد من حذف هذا المجلد وجميع محتوياته؟"
              onConfirm={() => deleteFolder((record as Folder).id)}
              okText="حذف"
              cancelText="إلغاء"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          );
        } else {
          return (
            <Popconfirm
              title="حذف الملف"
              description="هل أنت متأكد من حذف هذا الملف؟"
              onConfirm={() => deleteFile((record as FileItem).id)}
              okText="حذف"
              cancelText="إلغاء"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          );
        }
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="مدير الملفات"
        subtitle="إدارة المرفقات والمستندات"
        breadcrumbs={[{ title: "مدير الملفات" }]}
        extra={
          <Space>
            <Button icon={<FolderAddOutlined />} onClick={() => setShowNewFolderModal(true)}>
              مجلد جديد
            </Button>
            <Upload
              showUploadList={false}
              action={`${API_BASE}/api/files/upload`}
              headers={getAuthHeaders() as any}
              data={{ folderId: currentFolder }}
              onChange={(info) => {
                if (info.file.status === "done") {
                  message.success("تم رفع الملف بنجاح");
                  loadData();
                } else if (info.file.status === "error") {
                  message.error("فشل في رفع الملف");
                }
              }}
            >
              <Button type="primary" icon={<UploadOutlined />}>
                رفع ملف
              </Button>
            </Upload>
          </Space>
        }
      />

      {/* الإحصائيات */}
      {stats && (
        <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4} lg={4}>
            <Card size="small" style={{ background: "#e6f7ff" }}>
              <Statistic
                title="إجمالي الملفات"
                value={stats.totalFiles}
                valueStyle={{ color: "#1890ff" }}
                prefix={<FileOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <Card size="small" style={{ background: "#f6ffed" }}>
              <Statistic
                title="المساحة المستخدمة"
                value={formatFileSize(Number(stats.totalSize || 0))}
                valueStyle={{ color: "#52c41a", fontSize: 20 }}
                prefix={<CloudUploadOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <Card size="small" style={{ background: "#fff7e6" }}>
              <Statistic
                title="صور"
                value={stats.byCategory?.image || 0}
                valueStyle={{ color: "#fa8c16" }}
                prefix={<FileImageOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <Card size="small" style={{ background: "#f9f0ff" }}>
              <Statistic
                title="مستندات"
                value={stats.byCategory?.document || 0}
                valueStyle={{ color: "#722ed1" }}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <Card size="small">
              <Statistic
                title="أخرى"
                value={stats.byCategory?.other || 0}
                prefix={<PaperClipOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* شريط التنقل */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Breadcrumb items={breadcrumbItems} />
          <Space>
            <Input.Search
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث..."
              allowClear
              style={{ width: 200 }}
            />
            <Button.Group>
              <Button
                type={viewMode === "grid" ? "primary" : "default"}
                icon={<AppstoreOutlined />}
                onClick={() => setViewMode("grid")}
              />
              <Button
                type={viewMode === "list" ? "primary" : "default"}
                icon={<UnorderedListOutlined />}
                onClick={() => setViewMode("list")}
              />
            </Button.Group>
          </Space>
        </div>
      </Card>

      {/* المحتوى */}
      {loading ? (
        <LoadingSkeleton type="card" rows={3} />
      ) : (
        <Card style={{ minHeight: 400 }}>
          {folders.length === 0 && files.length === 0 ? (
            <Empty
              image={<FolderOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
              description="المجلد فارغ"
            />
          ) : viewMode === "grid" ? (
            <Row gutter={[16, 16]}>
              {/* المجلدات */}
              {folders.map((folder) => (
                <Col xs={12} sm={8} md={6} lg={4} key={folder.id}>
                  <Card
                    hoverable
                    size="small"
                    style={{ textAlign: "center", position: "relative" }}
                    onDoubleClick={() => navigateToFolder(folder)}
                  >
                    <FolderOutlined style={{ fontSize: 40, color: "#faad14", marginBottom: 8 }} />
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: 13,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {folder.name}
                    </div>
                    <Popconfirm
                      title="حذف المجلد"
                      description="هل أنت متأكد من حذف هذا المجلد؟"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        deleteFolder(folder.id);
                      }}
                      okText="حذف"
                      cancelText="إلغاء"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        style={{ position: "absolute", top: 4, left: 4 }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </Card>
                </Col>
              ))}
              {/* الملفات */}
              {files.map((file) => (
                <Col xs={12} sm={8} md={6} lg={4} key={file.id}>
                  <Card
                    hoverable
                    size="small"
                    style={{
                      textAlign: "center",
                      position: "relative",
                      border: selectedFiles.includes(file.id) ? "2px solid #1890ff" : undefined,
                      background: selectedFiles.includes(file.id) ? "#e6f7ff" : undefined,
                    }}
                    onClick={() => toggleSelect(file.id)}
                  >
                    <div style={{ fontSize: 40, marginBottom: 8 }}>
                      {CATEGORY_ICONS[file.category] || CATEGORY_ICONS.other}
                    </div>
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: 13,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {file.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#8c8c8c" }}>{formatFileSize(file.size)}</div>
                    <Popconfirm
                      title="حذف الملف"
                      description="هل أنت متأكد من حذف هذا الملف؟"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        deleteFile(file.id);
                      }}
                      okText="حذف"
                      cancelText="إلغاء"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        style={{ position: "absolute", top: 4, left: 4 }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <Table
              columns={listColumns}
              dataSource={[...folders, ...files]}
              rowKey="id"
              pagination={false}
              onRow={(record) => ({
                onDoubleClick: () => {
                  if ("path" in record) {
                    navigateToFolder(record as Folder);
                  }
                },
              })}
            />
          )}
        </Card>
      )}

      {/* موديل مجلد جديد */}
      <Modal
        title={
          <span>
            <FolderAddOutlined /> مجلد جديد
          </span>
        }
        open={showNewFolderModal}
        onOk={createFolder}
        onCancel={() => {
          setShowNewFolderModal(false);
          setNewFolderName("");
        }}
        okText="إنشاء"
        cancelText="إلغاء"
        width={400}
      >
        <Input
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="اسم المجلد"
          onPressEnter={createFolder}
          style={{ marginTop: 16 }}
        />
      </Modal>
    </div>
  );
}
