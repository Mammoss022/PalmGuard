"""Seed data for disease_classes — matches docs/DATABASE.md#disease_classes exactly."""

from sqlalchemy.orm import Session

from app.models.disease_class import DiseaseClass

DISEASE_CLASSES_SEED = [
    {
        "id": 1,
        "code": "HEALTHY",
        "name_th": "ใบปกติ",
        "name_en": "Healthy",
        "description": "ใบมีสีเขียวสม่ำเสมอ ไม่พบจุดหรือร่องรอยความเสียหาย",
        "recommendation_th": "ใบอยู่ในสภาพปกติ ดูแลตามปกติและสังเกตอาการต่อเนื่องเป็นระยะ",
    },
    {
        "id": 2,
        "code": "BROWN_SPOT",
        "name_th": "ใบจุดสีน้ำตาล",
        "name_en": "Brown Spot / Leaf Spot",
        "description": "พบจุดสีน้ำตาลกระจายบนใบ อาจลุกลามหากไม่ดูแล",
        "recommendation_th": (
            "เฝ้าระวังการขยายตัวของจุดสีน้ำตาลบนใบ และเน้นการป้องกันการแพร่กระจายของเชื้อ พิจารณาใช้ชีวภัณฑ์หรือสารควบคุมเชื้อราที่เหมาะสมตามคำแนะนำของผู้เชี่ยวชาญ"
        ),
    },
    {
        "id": 3,
        "code": "WHITE_SCALE",
        "name_th": "เพลี้ยหอย",
        "name_en": "White Scale",
        "description": "พบคราบ/จุดสีขาวคล้ายเกล็ดของเพลี้ยหอยเกาะอยู่บนใบ",
        "recommendation_th": "ตรวจบริเวณใต้ใบและแนวเส้นใบอย่างสม่ำเสมอเพื่อเฝ้าระวังการเพิ่มจำนวนของเพลี้ยหอย และเน้นการใช้ศัตรูธรรมชาติในการควบคุมประชากรเพลี้ยหอย เช่น ด้วงเต่า หรือแตนเบียน ควรหลีกเลี่ยงการใช้สารกำจัดแมลงโดยไม่จำเป็น",
    },
    {
        "id": 4,
        "code": "NON_PALM",
        "name_th": "ไม่ใช่ใบปาล์มน้ำมัน",
        "name_en": "Non-Palm / Not a Palm Leaf",
        "description": "ภาพที่อัปโหลดไม่ใช่ใบปาล์มน้ำมัน (เช่น คน สัตว์ ยานพาหนะ ต้นไม้/ใบไม้ชนิดอื่น ดิน ท้องฟ้า สิ่งของ)",
        "recommendation_th": "กรุณาถ่ายภาพใบปาล์มน้ำมันให้ชัดเจนอีกครั้ง เพื่อให้ระบบวิเคราะห์ได้แม่นยำ",
    },
]


def seed_disease_classes(db: Session) -> None:
    for row in DISEASE_CLASSES_SEED:
        existing = db.get(DiseaseClass, row["id"])
        if existing is None:
            db.add(DiseaseClass(**row))
    db.commit()
