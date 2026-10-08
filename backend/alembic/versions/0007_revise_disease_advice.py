"""Revise diagnosis care advice."""

from alembic import op
import sqlalchemy as sa

revision = "0007_revise_disease_advice"
down_revision = "0006_disease_recommendations"
branch_labels = None
depends_on = None


def _update(recommendations):
    diseases = sa.table("disease_classes", sa.column("code", sa.String()), sa.column("recommendation_th", sa.Text()))
    for code, advice in recommendations.items():
        op.execute(diseases.update().where(diseases.c.code == code).values(recommendation_th=advice))


def upgrade():
    _update({
        "BROWN_SPOT": "เฝ้าระวังการขยายตัวของจุดสีน้ำตาลบนใบ และเน้นการป้องกันการแพร่กระจายของเชื้อ พิจารณาใช้ชีวภัณฑ์หรือสารควบคุมเชื้อราที่เหมาะสมตามคำแนะนำของผู้เชี่ยวชาญ",
        "WHITE_SCALE": "ตรวจบริเวณใต้ใบและแนวเส้นใบอย่างสม่ำเสมอเพื่อเฝ้าระวังการเพิ่มจำนวนของเพลี้ยหอย และเน้นการใช้ศัตรูธรรมชาติในการควบคุมประชากรเพลี้ยหอย เช่น ด้วงเต่า หรือแตนเบียน ควรหลีกเลี่ยงการใช้สารกำจัดแมลงโดยไม่จำเป็น",
    })


def downgrade():
    _update({
        "BROWN_SPOT": "ควรเฝ้าระวังและดูแลใบอย่างสม่ำเสมอ โดยเน้นการป้องกันการแพร่ของเชื้อ และสามารถใช้ชีวภัณฑ์หรือจุลินทรีย์ควบคุมเชื้อเพื่อช่วยลดความรุนแรงของโรคได้",
        "WHITE_SCALE": "ควรตรวจบริเวณด้านใต้ใบและเส้นใบอย่างสม่ำเสมอ เพื่อพบการระบาดตั้งแต่ระยะเริ่มต้น และควรอนุรักษ์ศัตรูธรรมชาติ เช่น แมลงตัวห้ำ ซึ่งช่วยควบคุมประชากรเพลี้ยหอยได้",
    })
