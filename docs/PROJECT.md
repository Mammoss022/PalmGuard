# PROJECT.md — PalmGuard AI

## Project Overview
PalmGuard AI คือ Web Application สำหรับช่วยเกษตรกรตรวจสอบความผิดปกติ/โรคเบื้องต้นของใบปาล์มน้ำมันจากภาพถ่าย โดยใช้ AI Model วิเคราะห์ภาพและแสดงผลพร้อมค่าความเชื่อมั่น (Confidence) และคำแนะนำเบื้องต้น

## Objectives
- ให้เกษตรกรตรวจสอบใบปาล์มเบื้องต้นได้ด้วยตนเองผ่านมือถือ
- ลดระยะเวลาการสังเกตความผิดปกติของใบปาล์มด้วยภาพถ่าย
- เก็บประวัติการวินิจฉัยเพื่อใช้ติดตามแนวโน้มของแปลงปลูก

## Target Users
- เกษตรกรผู้ปลูกปาล์มน้ำมัน (ผู้ใช้งานหลัก, ใช้งานผ่านมือถือเป็นหลัก)
- ผู้ดูแลระบบ (Admin) สำหรับจัดการผู้ใช้และข้อมูลระบบ

## Core Features
1. Landing Page แนะนำระบบ
2. Register / Login (JWT Authentication)
3. Dashboard สรุปข้อมูลผู้ใช้
4. Diagnose — ถ่ายภาพ/อัปโหลดภาพใบปาล์ม
5. AI Analysis — ส่งภาพไปวิเคราะห์ผ่าน Backend API
6. Result — แสดงผลลัพธ์ Class, Confidence, คำแนะนำเบื้องต้น
7. Diagnosis History — ประวัติการวินิจฉัยของผู้ใช้
8. Profile — จัดการข้อมูลส่วนตัว
9. Admin Dashboard — จัดการผู้ใช้/ดูภาพรวมการวินิจฉัยทั้งระบบ

## Scope
- ระบบ Web Application (Responsive, รองรับมือถือเป็นหลัก)
- วิเคราะห์ภาพใบปาล์ม 4 กลุ่มเริ่มต้น: Healthy, Brown Spot, White Scale (เพลี้ยหอย), Non-Palm (ภาพที่ไม่ใช่ใบปาล์มน้ำมัน)
- ระบบสมาชิกพื้นฐาน (Register/Login/Profile)
- ระบบเก็บประวัติผลการวินิจฉัยรายผู้ใช้

## Non-goals
- ไม่ใช่การวินิจฉัยทางการเกษตรอย่างเป็นทางการ หรือทดแทนผู้เชี่ยวชาญ/นักวิชาการเกษตร
- ไม่รองรับการวิเคราะห์วิดีโอหรือภาพถ่ายทางอากาศ (Drone/Satellite)
- ไม่มีระบบแจ้งเตือนแบบ Real-time (Push Notification) ใน MVP
- ไม่มีระบบชำระเงิน/สมาชิกแบบเสียค่าใช้จ่ายใน MVP
- ไม่รองรับหลายภาษานอกเหนือจากไทย/อังกฤษ (technical terms)

## Technology Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS, shadcn/ui, Lucide Icons, Noto Sans Thai |
| Backend | Python, FastAPI, Pydantic, SQLAlchemy, JWT Authentication |
| Database | PostgreSQL |
| AI | Python, TensorFlow/Keras, MobileNetV2 (Transfer Learning + Fine-tuning), OpenCV/PIL |
| Storage | Supabase Storage (รูปภาพ) + PostgreSQL (Metadata/URL) |
| Dev Tools | VS Code, Git, GitHub, Google Colab (Training) |
| Deployment (Demo/UAT) | Backend: Render (Free) · Database+Storage: Supabase (Free) · Frontend: Vercel (Free) — ดู [ARCHITECTURE.md#storage-architecture](ARCHITECTURE.md#storage-architecture) |

## Main User Flow
```
User → Login → Dashboard → Upload/Capture Palm Leaf Image
→ Preview Image → Submit Diagnosis → Backend API → AI Model
→ Prediction + Confidence + Recommendation → Save Diagnosis
→ Display Result → History
```

## MVP Scope
- Auth: Register, Login (JWT)
- Diagnose: Upload หรือถ่ายภาพ 1 ภาพต่อการวินิจฉัย 1 ครั้ง
- AI: จำแนก 4 Class (Healthy / Brown Spot / White Scale / Non-Palm) พร้อม Confidence
- History: รายการผลการวินิจฉัยย้อนหลังของผู้ใช้ (List + Detail)
- Profile: ดู/แก้ไขข้อมูลพื้นฐาน
- Satisfaction Survey: แบบสอบถามความพึงพอใจ (UAT) หลังทดลองใช้งานระบบ
- Admin: ดูรายชื่อผู้ใช้และรายการวินิจฉัยทั้งระบบ (read-only เบื้องต้น)

## Future Improvements
- เพิ่มจำนวน Disease Class และความละเอียดของคำแนะนำ
- ระบบแจ้งเตือน (Notification) เมื่อพบความผิดปกติซ้ำ
- Dashboard เชิงสถิติ/แผนที่แปลงปลูก
- รองรับ Offline mode บนมือถือ
- ระบบให้ผู้เชี่ยวชาญยืนยันผลวินิจฉัย (Expert Review)

## Open Items
- **DECISION REQUIRED:** ขอบเขตงานของ Admin Dashboard (read-only หรือจัดการข้อมูลได้เต็มรูปแบบ) — ดู [ARCHITECTURE.md](ARCHITECTURE.md), [API.md](API.md)
