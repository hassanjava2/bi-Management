# 👨‍💻 دليل المطور
# BI Management - Developer Guide

---

## 📋 المحتويات

1. [البيئة والإعداد](#البيئة-والإعداد)
2. [هيكل المشروع](#هيكل-المشروع)
3. [Backend Development](#backend-development)
4. [Frontend Development](#frontend-development)
5. [قاعدة البيانات](#قاعدة-البيانات)
6. [الصلاحيات](#الصلاحيات)
7. [الاختبارات](#الاختبارات)
8. [النشر](#النشر)

---

## البيئة والإعداد

### المتطلبات
```
Node.js >= 18.0.0
npm >= 9.0.0
Git
VS Code (recommended)
```

### الإعداد الأولي
```bash
# Clone the repository
git clone <repo-url>
cd bi-management

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Setup environment
cp backend/.env.example backend/.env
# Edit .env with your settings

# Initialize database
cd backend
npm run db:init
```

### تشغيل بيئة التطوير
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

---

## هيكل المشروع

```
bi-management/
├── backend/
│   ├── src/
│   │   ├── app.js              # Express app entry
│   │   ├── config/
│   │   │   ├── database.js     # SQLite/sql.js setup
│   │   │   └── constants.js    # App constants
│   │   ├── controllers/        # Route handlers
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT authentication
│   │   │   ├── checkPermission.js  # Permission middleware
│   │   │   ├── errorHandler.js # Global error handler
│   │   │   ├── protection.js   # Security protections
│   │   │   ├── rateLimit.js    # Rate limiting
│   │   │   └── validate.js     # Input validation
│   │   ├── routes/             # API routes
│   │   ├── services/           # Business logic
│   │   ├── socket/             # WebSocket handlers
│   │   └── utils/              # Helper functions
│   ├── tests/                  # Test files
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main React component
│   │   ├── components/        # Reusable components
│   │   ├── context/           # React contexts
│   │   │   ├── AuthContext.jsx
│   │   │   └── SocketContext.jsx
│   │   ├── hooks/             # Custom hooks
│   │   │   ├── usePermission.js
│   │   │   └── useSocket.js
│   │   ├── pages/             # Page components
│   │   └── services/          # API services
│   └── package.json
│
└── database/
    ├── schema_v3_sqlite.sql   # Main schema
    ├── schema_additional.sql  # Additional tables
    └── seeds/                 # Seed data
```

---

## Backend Development

### إنشاء Route جديد

1. **إنشاء ملف Route:**
```javascript
// src/routes/example.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');

// GET /api/example
router.get('/', authenticate, async (req, res) => {
    try {
        // Logic here
        res.json({ success: true, data: [] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/example (with permission)
router.post('/', 
    authenticate, 
    checkPermission('example.create'),
    async (req, res) => {
        // Logic here
    }
);

module.exports = router;
```

2. **تسجيل Route في index.js:**
```javascript
// src/routes/index.js
const exampleRoutes = require('./example.routes');
router.use('/example', exampleRoutes);
```

### إنشاء Service

```javascript
// src/services/example.service.js
const { getDatabase } = require('../config/database');

class ExampleService {
    constructor(db) {
        this.db = db || getDatabase();
    }

    getAll() {
        const stmt = this.db.prepare('SELECT * FROM examples');
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    }

    getById(id) {
        const stmt = this.db.prepare('SELECT * FROM examples WHERE id = ?');
        stmt.bind([id]);
        let result = null;
        if (stmt.step()) {
            result = stmt.getAsObject();
        }
        stmt.free();
        return result;
    }

    create(data) {
        const id = require('uuid').v4();
        this.db.run(`
            INSERT INTO examples (id, name, created_at)
            VALUES (?, ?, datetime('now'))
        `, [id, data.name]);
        return { id, ...data };
    }
}

module.exports = ExampleService;
```

### إضافة Middleware

```javascript
// src/middleware/custom.js
function customMiddleware(options = {}) {
    return (req, res, next) => {
        // Middleware logic
        next();
    };
}

module.exports = customMiddleware;
```

---

## Frontend Development

### إنشاء صفحة جديدة

1. **إنشاء Component:**
```jsx
// src/pages/ExamplePage.jsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../services/api';

export default function ExamplePage() {
    const { data, isLoading } = useQuery({
        queryKey: ['examples'],
        queryFn: () => api.get('/example').then(r => r.data)
    });

    if (isLoading) return <div>جاري التحميل...</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold">مثال</h1>
            {/* Content */}
        </div>
    );
}
```

2. **إضافة Route:**
```jsx
// src/App.jsx
import ExamplePage from './pages/ExamplePage';

// Inside Routes
<Route path="/example" element={
    <ProtectedRoute permission="example.view">
        <ExamplePage />
    </ProtectedRoute>
} />
```

### استخدام الصلاحيات

```jsx
import { usePermission, Can } from '../hooks/usePermission';

function MyComponent() {
    // Hook method
    const { allowed: canCreate } = usePermission('example.create');

    // Component method
    return (
        <div>
            {canCreate && <button>إنشاء</button>}
            
            <Can permission="example.delete">
                <button>حذف</button>
            </Can>
            
            <Can 
                permissions={['example.edit', 'example.delete']} 
                any
            >
                <button>إجراءات</button>
            </Can>
        </div>
    );
}
```

### استخدام API Service

```javascript
// src/services/api.js
import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
});

// Request interceptor
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
```

---

## قاعدة البيانات

### إضافة جدول جديد

```sql
-- database/migrations/xxx_create_examples.sql
CREATE TABLE IF NOT EXISTS examples (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    is_deleted INTEGER DEFAULT 0,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_examples_status ON examples(status);
CREATE INDEX IF NOT EXISTS idx_examples_created_by ON examples(created_by);
```

### قواعد التسمية
- جداول: snake_case جمع (users, products, invoices)
- أعمدة: snake_case (created_at, is_deleted)
- Primary keys: id (TEXT UUID)
- Foreign keys: table_id (user_id, product_id)

### Soft Delete
كل الجداول تستخدم `is_deleted` بدلاً من الحذف الفعلي:
```sql
-- بدلاً من DELETE
UPDATE examples SET is_deleted = 1 WHERE id = ?;

-- عند الاستعلام
SELECT * FROM examples WHERE is_deleted = 0;
```

---

## الصلاحيات

### إضافة صلاحية جديدة

1. **في قاعدة البيانات:**
```sql
INSERT INTO permissions (id, code, name_ar, module, feature, action, security_level)
VALUES ('perm_xxx', 'example.create', 'إنشاء مثال', 'example', 'all', 'create', 2);
```

2. **ربطها بدور:**
```sql
INSERT INTO role_permissions (id, role_id, permission_id, granted_by)
VALUES ('rp_xxx', 'role_admin', 'perm_xxx', 'system');
```

3. **استخدامها في Backend:**
```javascript
router.post('/', 
    authenticate, 
    checkPermission('example.create'),
    handler
);
```

4. **استخدامها في Frontend:**
```jsx
<Can permission="example.create">
    <Button>إنشاء</Button>
</Can>
```

### مستويات الأمان
| المستوى | الوصف |
|---------|-------|
| 0 | عام - بدون قيود |
| 1 | أساسي - للموظفين |
| 2 | متوسط - للإدارة |
| 3 | عالي - للمديرين |
| 4 | حرج - للمدراء الكبار |
| 5 | أعلى - للمالكين فقط |

---

## الاختبارات

### كتابة اختبار جديد

```javascript
// tests/api/example.test.js
const request = require('supertest');
const { app } = require('../../src/app');

describe('Example API', () => {
    let authToken;

    beforeAll(async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'admin', password: 'Admin@123' });
        authToken = res.body.data.token;
    });

    describe('GET /api/example', () => {
        it('should return examples list', async () => {
            const res = await request(app)
                .get('/api/example')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('POST /api/example', () => {
        it('should create example', async () => {
            const res = await request(app)
                .post('/api/example')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Test' });

            expect([200, 201]).toContain(res.status);
        });
    });
});
```

### تشغيل الاختبارات
```bash
npm test                    # All tests
npm run test:api            # API tests only
npm run test:security       # Security tests
npm run test:coverage       # With coverage report
```

---

## النشر

### Build للإنتاج

```bash
# Frontend build
cd frontend
npm run build

# Output in frontend/dist/
```

### Environment Variables

```env
# Production .env
NODE_ENV=production
PORT=3000
DATABASE_PATH=/var/data/bi-management.db
JWT_SECRET=<strong-random-secret>
CORS_ORIGIN=https://yourdomain.com
```

### Docker (Optional)

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/src ./src
COPY database ./database

EXPOSE 3000
CMD ["node", "src/app.js"]
```

### النسخ الاحتياطي

```javascript
// Automatic backup script
const fs = require('fs');
const path = require('path');

function createBackup() {
    const dbPath = process.env.DATABASE_PATH;
    const backupDir = './backups';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.db`);
    
    fs.copyFileSync(dbPath, backupPath);
    console.log(`Backup created: ${backupPath}`);
}

// Run daily at 2 AM
```

---

## 📚 مراجع إضافية

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [SQLite Documentation](https://sqlite.org/docs.html)
- [JWT.io](https://jwt.io/)

---

## 🤝 المساهمة

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit Pull Request

---

*آخر تحديث: 2026-02-03*
