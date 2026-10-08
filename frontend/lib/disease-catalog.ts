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
      "เฝ้าระวังการขยายตัวของจุดสีน้ำตาลบนใบ และเน้นการป้องกันการแพร่กระจายของเชื้อ พิจารณาใช้ชีวภัณฑ์หรือสารควบคุมเชื้อราที่เหมาะสมตามคำแนะนำของผู้เชี่ยวชาญ",
  },
  {
    code: "WHITE_SCALE",
    nameTh: "เพลี้ยหอย",
    nameEn: "White Scale",
    description: "พบคราบ/จุดสีขาวคล้ายเกล็ดของเพลี้ยหอยเกาะอยู่บนใบ",
    recommendationTh: "ตรวจบริเวณใต้ใบและแนวเส้นใบอย่างสม่ำเสมอเพื่อเฝ้าระวังการเพิ่มจำนวนของเพลี้ยหอย และเน้นการใช้ศัตรูธรรมชาติในการควบคุมประชากรเพลี้ยหอย เช่น ด้วงเต่า หรือแตนเบียน ควรหลีกเลี่ยงการใช้สารกำจัดแมลงโดยไม่จำเป็น",
  },
];
