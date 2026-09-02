import type { DiseaseClass } from "@/lib/types";

// Static reference content for the public Landing page — mirrors the
// disease_classes seeded in the Backend DB exactly (backend/app/db/seed.py),
// not mock/demo data. Authenticated pages get this same info live from the
// Backend embedded in each Diagnosis result (see lib/diagnoses.ts).
export const diseaseClasses: DiseaseClass[] = [
  {
    code: "HEALTHY",
    nameTh: "ใบปกติ",
    nameEn: "Healthy",
    description: "ใบมีสีเขียวสม่ำเสมอ ไม่พบจุดหรือร่องรอยความเสียหาย",
    recommendationTh: "ใบอยู่ในสภาพปกติ ดูแลตามปกติและสังเกตอาการต่อเนื่องเป็นระยะ",
  },
  {
    code: "BROWN_SPOT",
    nameTh: "ใบจุดสีน้ำตาล",
    nameEn: "Brown Spot / Leaf Spot",
    description: "พบจุดสีน้ำตาลกระจายบนใบ อาจลุกลามหากไม่ดูแล",
    recommendationTh:
      "สังเกตใบที่มีจุดเพิ่มขึ้น ตัดใบที่เป็นโรครุนแรงทิ้ง และเว้นระยะปลูกให้อากาศถ่ายเทดี",
  },
  {
    code: "WHITE_SCALE",
    nameTh: "เพลี้ยหอย",
    nameEn: "White Scale",
    description: "พบคราบ/จุดสีขาวคล้ายเกล็ดของเพลี้ยหอยเกาะอยู่บนใบ",
    recommendationTh: "ตรวจสอบใต้ใบเพื่อหาเพลี้ยหอย ฉีดพ่นน้ำแรงดันหรือใช้สารกำจัดแมลงที่เหมาะสม และตัดใบที่ระบาดหนักทิ้ง",
  },
];
