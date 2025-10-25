# Logging Configuration

## ภาพรวม
โปรเจคนี้มีการตั้งค่า logging สำหรับทั้ง backend และ frontend โดย logs จะถูก mapping ออกมาที่โฟลเดอร์ `logs/` ใน host machine

## Backend Logging

### การติดตั้ง
```bash
cd backend
npm install winston winston-daily-rotate-file @types/winston
```

### ไฟล์ Log ที่สร้าง
- `logs/backend/app-YYYY-MM-DD.log` - ข้อมูล log ทั่วไป
- `logs/backend/error-YYYY-MM-DD.log` - ข้อมูล error logs
- `logs/backend/access-YYYY-MM-DD.log` - ข้อมูล HTTP access logs
- `logs/backend/exceptions-YYYY-MM-DD.log` - ข้อมูล unhandled exceptions
- `logs/backend/rejections-YYYY-MM-DD.log` - ข้อมูล unhandled promise rejections

### การใช้งาน
```typescript
import logger from './utils/logger';

// Log levels
logger.info('Information message', { data: 'additional data' });
logger.warn('Warning message');
logger.error('Error message', error);
logger.debug('Debug message');
```

## Frontend Logging

### การใช้งาน
```typescript
import logger from './utils/logger';
import { useLogger } from './hooks/useLogger';

// ใน component
const { logAction, logError, logApiCall } = useLogger('ComponentName');

// การ log
logAction('Button clicked', { buttonId: 'submit' });
logError('API call failed', error);
logApiCall('/api/customers', 'GET');
```

### การดู Logs
- Logs ถูกเก็บใน localStorage
- สามารถดู logs ใน Developer Console
- Export logs เป็น JSON ได้

## Docker Volume Mapping

Logs จะถูก mapping ไปที่:
- Host: `./logs/backend/` → Container: `/app/logs/`
- Host: `./logs/frontend/` → Container: `/app/logs/`

## การรัน

### ด้วย Docker Compose
```bash
docker-compose up --build
```

### แยกการรัน
```bash
# Backend
cd backend
npm install
npm start

# Frontend  
cd frontend
npm install
npm start
```

## การตั้งค่า Log Level

### Backend
ตั้งค่าผ่าน environment variable:
```bash
LOG_LEVEL=debug # หรือ info, warn, error
```

### Frontend
Logs จะแสดงใน console เฉพาะใน development mode

## Log Rotation

- Backend: ใช้ winston-daily-rotate-file
- Max file size: 20MB
- Retention: 7-30 วัน ตาม log type
- Frontend: เก็บ 100 entries ล่าสุดใน localStorage

## Monitoring

สามารถติดตาม logs แบบ real-time:
```bash
# ดู backend logs
tail -f logs/backend/app-$(date +%Y-%m-%d).log

# ดู error logs
tail -f logs/backend/error-$(date +%Y-%m-%d).log
```