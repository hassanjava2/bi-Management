# Bi Management - API Endpoints Documentation

> هذا الملف يوثق جميع الـ endpoints المتاحة في Backend
> يجب تحديثه عند إضافة أي endpoint جديد

## Base URL
```
Development: http://localhost:3000/api
Production: https://api.bi-management.com/api
```

---

## Authentication `/auth`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | تسجيل الدخول | ❌ |
| POST | `/auth/register` | إنشاء حساب | ❌ |
| GET | `/auth/me` | معلومات المستخدم الحالي | ✅ |
| POST | `/auth/logout` | تسجيل الخروج | ✅ |
| POST | `/auth/refresh` | تجديد التوكن | ✅ |

---

## Tasks `/tasks`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/tasks` | جميع المهام | ✅ Admin/Manager |
| GET | `/tasks/my-tasks` | مهامي | ✅ |
| GET | `/tasks/today` | مهام اليوم | ✅ |
| GET | `/tasks/:id` | تفاصيل مهمة | ✅ |
| POST | `/tasks` | إنشاء مهمة | ✅ Manager+ |
| PUT | `/tasks/:id` | تحديث مهمة | ✅ |
| PUT | `/tasks/:id/status` | تحديث حالة | ✅ |
| DELETE | `/tasks/:id` | حذف مهمة | ✅ Admin |

---

## Attendance `/attendance`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/attendance/status` | حالة اليوم للمستخدم | ✅ |
| GET | `/attendance/my-record` | سجل حضوري | ✅ |
| GET | `/attendance/today` | حضور اليوم (الكل) | ✅ HR/Manager |
| GET | `/attendance/report` | تقرير الحضور | ✅ HR/Manager |
| GET | `/attendance/stats` | إحصائيات | ✅ HR/Manager |
| POST | `/attendance/check-in` | تسجيل دخول | ✅ |
| POST | `/attendance/check-out` | تسجيل خروج | ✅ |
| POST | `/attendance/manual` | إدخال يدوي | ✅ HR |

---

## AI `/ai`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/ai/chat` | محادثة مع AI | ✅ |
| GET | `/ai/conversations` | سجل المحادثات | ✅ |
| POST | `/ai/analyze` | تحليل نص | ✅ |
| POST | `/ai/tasks/generate` | توليد مهمة | ✅ |
| GET | `/ai/health` | حالة خدمة AI | ❌ |

---

## Notifications `/notifications`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/notifications` | إشعاراتي | ✅ |
| GET | `/notifications/unread-count` | عدد غير المقروءة | ✅ |
| PUT | `/notifications/:id/read` | تحديد كمقروء | ✅ |
| PUT | `/notifications/read-all` | تحديد الكل كمقروء | ✅ |

---

## Goals `/goals`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/goals/my-points` | نقاطي | ✅ |
| GET | `/goals/leaderboard` | المتصدرين | ✅ |
| GET | `/goals/rewards` | المكافآت المتاحة | ✅ |

---

## Users `/users`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users` | جميع المستخدمين | ✅ Admin/HR |
| GET | `/users/:id` | تفاصيل مستخدم | ✅ Admin/HR |
| POST | `/users` | إنشاء مستخدم | ✅ Admin |
| PUT | `/users/:id` | تحديث مستخدم | ✅ Admin/HR |
| DELETE | `/users/:id` | حذف مستخدم | ✅ Admin |

---

> **آخر تحديث:** 2026-02-02 (تم التحقق والإصلاح)
> **يجب التحقق من هذا الملف قبل إنشاء أي Frontend/Mobile code**

---

## ✅ Verified Endpoints (Mobile ↔ Backend)

All endpoints have been verified to match between mobile app and backend.
Last verification: 2026-02-02
