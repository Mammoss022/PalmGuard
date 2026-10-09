# อัปเดต PalmGuard บน Vercel / Render / Supabase

ตรวจเมื่อ 9 ตุลาคม 2026: Frontend production build ผ่าน และ Backend 33 tests ผ่าน โค้ดในเครื่องมี commit ที่ยังไม่ Push พร้อม migration ถึง `0008_diagnosis_failure_reason` และการแก้ส่วนตรวจใบปาล์มเพิ่มเติม

## 1. ตั้ง Render ก่อน Push

ใช้ service เดิมที่เชื่อม GitHub `Mammoss022/PalmGuard` กับ branch `main` และเว้น Root Directory ว่าง เพื่อให้เข้าถึงทั้ง `backend/` และ `ai/` ได้ Render ไม่ให้บริการเข้าถึงไฟล์นอก Root Directory ที่กำหนด ดังนั้นไม่ใช้ `backend` เป็น root สำหรับโมเดลที่อยู่อีกโฟลเดอร์

ใช้ Pre-deploy Command หาก service รองรับ:

```bash
cd backend && alembic upgrade head
```

ถ้าไม่มี Pre-deploy Command ให้ใส่ migration ใน Build Command ของ service นี้:

```bash
pip install -r backend/requirements.txt && cd backend && alembic upgrade head
```

Start Command:

```bash
cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

คำสั่งข้างต้นเป็น shell บน Render ค่า `$PORT` มาจาก Render ไม่ใช่ PowerShell ในเครื่อง

ถ้าใช้ Pre-deploy Command ให้ Build Command เป็น `pip install -r backend/requirements.txt` และใช้ migration ใน Pre-deploy เพียงจุดเดียว

ตรวจค่า Environment เดิมโดยไม่คัดลอก backend/.env ในเครื่องไปแทนทั้งหมด เพราะในเครื่องใช้ SQLite แต่ service จริงควรชี้ PostgreSQL เดิมของ Supabase:

```env
DATABASE_URL=postgresql+psycopg://...ค่าการเชื่อมต่อ Supabase เดิม...
STORAGE_BACKEND=supabase
SUPABASE_URL=...ค่าเดิม...
SUPABASE_SERVICE_ROLE_KEY=...ค่าลับเดิม...
SUPABASE_STORAGE_BUCKET=diagnosis-images
CORS_ORIGINS=https://YOUR_FRONTEND_DOMAIN
AI_BACKEND=mobilenet
MOBILENET_MODEL_PATH=../ai/models/mobilenetv2-v1.3.keras
GEMINI_API_KEY=...ค่าลับเดิม...
GEMINI_GATE_MODEL=gemini-3.5-flash-lite
PALM_GATE_MIN_CONFIDENCE=0.80
```

ค่า bucket และ CORS ต้องใช้ค่าจริงของระบบเดิม ถ้าใช้ custom domain ให้ใช้ origin นั้น ถ้ามีหลาย origin ให้คั่นด้วย comma คีย์ลับอยู่ Backend เท่านั้น ไม่ใส่ NEXT_PUBLIC_ โมเดล v1.4 candidate ยังไม่ถูกเลือกใช้งานเพราะภาพตัวอย่างเดิมไม่ดีขึ้น

## 2. ตรวจฐานข้อมูลก่อน migration

รัน SQL แบบอ่านอย่างเดียวใน Supabase SQL Editor:

```sql
SELECT version_num FROM alembic_version;

SELECT user_id, COUNT(*) AS response_count
FROM satisfaction_surveys
GROUP BY user_id
HAVING COUNT(*) > 1;
```

Migration 0004 เพิ่ม unique index ให้หนึ่งผู้ใช้ตอบแบบสอบถามได้หนึ่งรายการ ถ้ามีรายการซ้ำจะล้มเหลวโดยไม่ลบคำตอบให้อัตโนมัติ ต้องตรวจรายการซ้ำและกำหนดว่าจะเก็บคำตอบใดก่อน deploy อย่าลบทั้งหมดหรือใช้ reset เพื่อแก้ปัญหานี้

Migration ล่าสุดเพิ่ม leaf_assessments ปรับคำแนะนำโรค และเพิ่ม diagnoses.failure_reason ต้องใช้ Alembic ของโปรเจกต์นี้กับฐานข้อมูล Supabase เดิม ไม่ใช่สร้างฐานข้อมูลใหม่ และไม่ใช้ Supabase CLI migration แทน Alembic โดยไม่มีประวัติที่ตรงกัน

## 3. อัปเดต GitHub

Commit การแก้โค้ดให้ครบ จากนั้น Push branch ที่ Vercel/Render เชื่อมอยู่:

```powershell
cd D:\PalmGuard
git status
git push origin main
```

ไม่ต้องอัปโหลด .env, palmguard.db หรือไฟล์ dataset ZIP ไป GitHub โค้ด Frontend และ migration ที่ commit แล้วจะถูก Push ไปพร้อม branch นี้

## 4. Deploy service เดิม

- Render: ถ้า Auto Deploy เปิด ระบบจะ Deploy จาก Push ถ้าไม่เปิด ใช้ Manual Deploy → Deploy latest commit ตรวจ log ของ pip, Alembic และ Uvicorn ให้สำเร็จ
- Vercel: ตรวจ project เดิม Root Directory `frontend` และ Production Branch `main` ตั้ง `NEXT_PUBLIC_API_URL=https://YOUR_BACKEND.onrender.com/api/v1` แล้ว Deploy commit ใหม่ อย่า Redeploy commit เก่า หากไม่ได้ auto-deploy ให้เลือก commit ใหม่จาก Git
- Supabase: ใช้ project, Database และ Storage เดิม ไม่ต้องสร้างใหม่ รัน Alembic กับ DATABASE_URL ของ Supabase เพื่ออัปเดต schema

## 5. ตรวจหลัง Deploy

ตรวจว่า commit ใน dashboard ตรงกับ GitHub และ status Ready/Live จากนั้นเปิด:

```text
https://YOUR_BACKEND.onrender.com/health
https://YOUR_BACKEND.onrender.com/docs
https://YOUR_FRONTEND_DOMAIN
```

ทดสอบเข้าสู่ระบบ เปิดประวัติ/หน้า Admin ส่งภาพใบปาล์ม และส่งภาพสิ่งของที่ควรถูกปฏิเสธ ตรวจว่ารูปยังโหลดจาก Supabase ได้ `/health` อย่างเดียวไม่ตรวจ Database หรือ AI ทั้งระบบ ถ้าบริการตรวจภาพล่ม ระบบใหม่หยุดวิเคราะห์และให้ลองใหม่ ไม่ปล่อยภาพเข้าโมเดลโรค

## อ้างอิง

- [Render Deploys](https://render.com/docs/deploys)
- [Vercel Git Deployments](https://vercel.com/docs/git)
- [Render Pre-deploy Command](https://render.com/docs/deploys#pre-deploy-command)
- [Render Monorepo Root Directory](https://render.com/docs/monorepo-support)
