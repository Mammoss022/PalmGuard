"""Update the care advice displayed in diagnosis results."""

from alembic import op
import sqlalchemy as sa

revision = "0006_disease_recommendations"
down_revision = "0005_leaf_assessments"
branch_labels = None
depends_on = None


def _update(recommendations):
    diseases = sa.table("disease_classes", sa.column("code", sa.String()), sa.column("recommendation_th", sa.Text()))
    for code, advice in recommendations.items():
        op.execute(diseases.update().where(diseases.c.code == code).values(recommendation_th=advice))


def upgrade():
    _update({
        "BROWN_SPOT": "ควรเฝ้าระวังและดูแลใบอย่างสม่ำเสมอ โดยเน้นการป้องกันการแพร่ของเชื้อ และสามารถใช้ชีวภัณฑ์หรือจุลินทรีย์ควบคุมเชื้อเพื่อช่วยลดความรุนแรงของโรคได้",
        "WHITE_SCALE": "ควรตรวจบริเวณด้านใต้ใบและเส้นใบอย่างสม่ำเสมอ เพื่อพบการระบาดตั้งแต่ระยะเริ่มต้น และควรอนุรักษ์ศัตรูธรรมชาติ เช่น แมลงตัวห้ำ ซึ่งช่วยควบคุมประชากรเพลี้ยหอยได้",
    })


def downgrade():
    _update({
        "BROWN_SPOT": "สังเกตใบที่มีจุดเพิ่มขึ้น ตัดใบที่เป็นโรครุนแรงทิ้ง และเว้นระยะปลูกให้อากาศถ่ายเทดี",
        "WHITE_SCALE": "ตรวจสอบใต้ใบเพื่อหาเพลี้ยหอย ฉีดพ่นน้ำแรงดันหรือใช้สารกำจัดแมลงที่เหมาะสม และตัดใบที่ระบาดหนักทิ้ง",
    })
