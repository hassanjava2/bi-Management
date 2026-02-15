---
description: Deploy BI ERP to production server (erp.biiraq.com)
---
// turbo-all

## Steps

1. Build frontend locally:
```bash
cd "d:\bi Management\bi-erp\frontend" && npm run build
```

2. Commit and push changes:
```bash
cd "d:\bi Management" && git add -A && git commit -m "update" && git push
```

3. SSH into server and run deploy script:
```bash
ssh root@srv1354622.hstgr.cloud "cd /var/www/bi-management && bash bi-erp/deploy.sh"
```

That's it! The deploy script on the server handles:
- `git pull`
- `npm run build` (frontend)
- Copy `dist/` to `/var/www/bi-erp-web/` (Nginx root)
- `pm2 restart bi-erp-api`
