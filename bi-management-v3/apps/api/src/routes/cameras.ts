/**
 * نظام الكاميرات - Cameras API
 * ────────────────────────────────
 * إدارة الكاميرات، التحليل، الكشف
 */
import { Hono } from "hono";
import { nanoid } from "nanoid";

const app = new Hono();

// ─── In-Memory Camera Store ───

interface Camera {
  id: string;
  name: string;
  rtspUrl: string;
  location: string;
  detectionTypes: string[];
  isActive: boolean;
  isAnalyzing: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Detection {
  id: string;
  cameraId: string;
  cameraName: string;
  detectionType: string;
  severity: string;
  location: string;
  imagePath: string | null;
  taskCreated: boolean;
  taskId: string | null;
  createdAt: string;
}

const cameras: Camera[] = [];
const detections: Detection[] = [];

// ─── قائمة الكاميرات ───

app.get("/", async (c) => {
  try {
    const camerasWithStatus = cameras.map((cam) => ({
      ...cam,
      status: cam.isAnalyzing ? "analyzing" : cam.isActive ? "connected" : "disconnected",
    }));

    return c.json({ success: true, data: camerasWithStatus });
  } catch (error) {
    console.error("Cameras list error:", error);
    return c.json({ error: "فشل في جلب الكاميرات" }, 500);
  }
});

// ─── إضافة كاميرا ───

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { name, rtsp_url, location, detection_types } = body;

    if (!name || !rtsp_url) {
      return c.json({ error: "name و rtsp_url مطلوبان" }, 400);
    }

    const camera: Camera = {
      id: `cam_${nanoid(12)}`,
      name,
      rtspUrl: rtsp_url,
      location: location || "",
      detectionTypes: detection_types || ["motion"],
      isActive: true,
      isAnalyzing: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    cameras.push(camera);

    return c.json({
      success: true,
      data: camera,
      message: "تم إضافة الكاميرا بنجاح",
    }, 201);
  } catch (error) {
    console.error("Add camera error:", error);
    return c.json({ error: "فشل في إضافة الكاميرا" }, 500);
  }
});

// ─── إحصائيات الكاميرات (قبل :id routes) ───

app.get("/statistics", async (c) => {
  try {
    const totalCameras = cameras.length;
    const activeCameras = cameras.filter((c) => c.isActive).length;
    const analyzingCameras = cameras.filter((c) => c.isAnalyzing).length;
    const totalDetections = detections.length;

    // Detections by type
    const detectionsByType: Record<string, number> = {};
    detections.forEach((d) => {
      detectionsByType[d.detectionType] = (detectionsByType[d.detectionType] || 0) + 1;
    });

    // Recent detections (last 24h)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentDetections = detections.filter((d) => d.createdAt > dayAgo).length;

    return c.json({
      success: true,
      data: {
        totalCameras,
        activeCameras,
        analyzingCameras,
        totalDetections,
        recentDetections,
        detectionsByType,
      },
    });
  } catch (error) {
    console.error("Camera statistics error:", error);
    return c.json({ error: "فشل في جلب الإحصائيات" }, 500);
  }
});

// ─── جميع الكشوفات الأخيرة ───

app.get("/detections/all", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "100");
    const sorted = [...detections].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return c.json({ success: true, data: sorted.slice(0, limit) });
  } catch (error) {
    console.error("All detections error:", error);
    return c.json({ error: "فشل في جلب الكشوفات" }, 500);
  }
});

// ─── تفاصيل كاميرا ───

app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const camera = cameras.find((cam) => cam.id === id);

    if (!camera) {
      return c.json({ error: "الكاميرا غير موجودة" }, 404);
    }

    return c.json({
      success: true,
      data: {
        ...camera,
        status: camera.isAnalyzing ? "analyzing" : camera.isActive ? "connected" : "disconnected",
      },
    });
  } catch (error) {
    console.error("Camera detail error:", error);
    return c.json({ error: "فشل في جلب بيانات الكاميرا" }, 500);
  }
});

// ─── تحديث كاميرا ───

app.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const camera = cameras.find((cam) => cam.id === id);

    if (!camera) {
      return c.json({ error: "الكاميرا غير موجودة" }, 404);
    }

    if (body.name) camera.name = body.name;
    if (body.rtsp_url) camera.rtspUrl = body.rtsp_url;
    if (body.location) camera.location = body.location;
    if (body.detection_types) camera.detectionTypes = body.detection_types;
    camera.updatedAt = new Date().toISOString();

    return c.json({ success: true, data: camera, message: "تم تحديث الكاميرا" });
  } catch (error) {
    console.error("Update camera error:", error);
    return c.json({ error: "فشل في تحديث الكاميرا" }, 500);
  }
});

// ─── حذف كاميرا ───

app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const index = cameras.findIndex((cam) => cam.id === id);

    if (index === -1) {
      return c.json({ error: "الكاميرا غير موجودة" }, 404);
    }

    cameras.splice(index, 1);
    return c.json({ success: true, message: "تم حذف الكاميرا" });
  } catch (error) {
    console.error("Delete camera error:", error);
    return c.json({ error: "فشل في حذف الكاميرا" }, 500);
  }
});

// ─── بدء التحليل ───

app.post("/:id/start", async (c) => {
  try {
    const id = c.req.param("id");
    const camera = cameras.find((cam) => cam.id === id);

    if (!camera) {
      return c.json({ error: "الكاميرا غير موجودة" }, 404);
    }

    camera.isAnalyzing = true;
    camera.updatedAt = new Date().toISOString();

    return c.json({
      success: true,
      data: { cameraId: id, status: "analyzing" },
      message: "تم بدء التحليل",
    });
  } catch (error) {
    console.error("Start analysis error:", error);
    return c.json({ error: "فشل في بدء التحليل" }, 500);
  }
});

// ─── إيقاف التحليل ───

app.post("/:id/stop", async (c) => {
  try {
    const id = c.req.param("id");
    const camera = cameras.find((cam) => cam.id === id);

    if (!camera) {
      return c.json({ error: "الكاميرا غير موجودة" }, 404);
    }

    camera.isAnalyzing = false;
    camera.updatedAt = new Date().toISOString();

    return c.json({
      success: true,
      data: { cameraId: id, status: "connected" },
      message: "تم إيقاف التحليل",
    });
  } catch (error) {
    console.error("Stop analysis error:", error);
    return c.json({ error: "فشل في إيقاف التحليل" }, 500);
  }
});

// ─── لقطة من الكاميرا ───

app.get("/:id/snapshot", async (c) => {
  try {
    const id = c.req.param("id");
    const camera = cameras.find((cam) => cam.id === id);

    if (!camera) {
      return c.json({ error: "الكاميرا غير موجودة" }, 404);
    }

    return c.json({
      success: true,
      data: {
        cameraId: id,
        cameraName: camera.name,
        timestamp: new Date().toISOString(),
        imageUrl: null,
        note: "اللقطة تتطلب اتصال مباشر بالكاميرا",
      },
    });
  } catch (error) {
    console.error("Snapshot error:", error);
    return c.json({ error: "فشل في التقاط الصورة" }, 500);
  }
});

// ─── كشوفات كاميرا معينة ───

app.get("/:id/detections", async (c) => {
  try {
    const id = c.req.param("id");
    const limit = parseInt(c.req.query("limit") || "50");

    const cameraDetections = detections
      .filter((d) => d.cameraId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);

    return c.json({ success: true, data: cameraDetections });
  } catch (error) {
    console.error("Camera detections error:", error);
    return c.json({ error: "فشل في جلب الكشوفات" }, 500);
  }
});

// ─── Webhook للكاميرات ───

app.post("/webhook", async (c) => {
  try {
    const apiKey = c.req.header("x-api-key") || c.req.query("api_key");
    const validApiKey = process.env.CAMERA_WEBHOOK_API_KEY || "dev-camera-webhook-key";

    if (apiKey !== validApiKey) {
      return c.json({ error: "Invalid API key" }, 401);
    }

    const body = await c.req.json();
    const { camera_id, detection_type, severity, location, image_path, task_id } = body;

    const camera = cameras.find((cam) => cam.id === camera_id);

    const detection: Detection = {
      id: `det_${nanoid(12)}`,
      cameraId: camera_id,
      cameraName: camera?.name || "Unknown",
      detectionType: detection_type || "unknown",
      severity: severity || "low",
      location: location || "",
      imagePath: image_path || null,
      taskCreated: !!task_id,
      taskId: task_id || null,
      createdAt: new Date().toISOString(),
    };

    detections.push(detection);
    if (detections.length > 1000) detections.splice(0, detections.length - 1000);

    return c.json({ success: true, data: detection });
  } catch (error) {
    console.error("Webhook error:", error);
    return c.json({ error: "فشل في معالجة الـ webhook" }, 500);
  }
});

export default app;
