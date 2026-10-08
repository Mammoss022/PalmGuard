# กราฟประเมินโมเดลสำหรับรายงาน PalmGuard

ใช้ผลจาก `ai/models/evaluation-v1.3.json` ซึ่งเป็นผลประเมินที่บันทึกไว้ ไม่ได้รันทดสอบโมเดลใหม่ในการสร้างกราฟครั้งนี้

- ชุดทดสอบใหม่: ทำนายถูก 352 จาก 365 ภาพ, Accuracy 96.44%
- ชุดทดสอบเดิม: ทำนายถูก 393 จาก 397 ภาพ, Accuracy 98.99%
- Precision, Recall และ F1-score ในกราฟเป็นค่า macro average

Accuracy = จำนวนภาพที่ทำนายถูก / จำนวนภาพทดสอบทั้งหมด × 100

กราฟอยู่ใน `docs/report-figures/` มี PNG ความละเอียด 300 DPI และ PDF
สร้างซ้ำจากโฟลเดอร์โปรเจกต์ด้วย:

```powershell
backend/.venv/Scripts/python.exe ai/scripts/export_report_figures.py
```

## ข้อความตัวอย่างสำหรับรายงาน

แบบจำลอง MobileNetV2 รุ่น v1.3 สำหรับจำแนกใบปาล์มเป็น 3 ประเภท ได้แก่ ใบปกติ ใบจุดสีน้ำตาล และเพลี้ยหอย มีความแม่นยำบนชุดทดสอบใหม่ 365 ภาพเท่ากับ 96.44% โดยจำแนกถูกต้อง 352 ภาพ และจำแนกผิด 13 ภาพ ตามไฟล์ผลประเมินที่บันทึกไว้

ควรตรวจสอบที่มาของชุดทดสอบก่อนรายงานว่าเป็นข้อมูลที่ไม่เคยใช้ในการฝึกหรือเลือกโมเดล รวมถึงไม่มีภาพซ้ำหรือภาพจากใบเดียวกันปะปนระหว่างชุดฝึกกับชุดทดสอบ

ผลนี้เป็น Accuracy ของแบบจำลองตามไฟล์ประเมิน ไม่ใช่ผลทดสอบระบบเว็บไซต์ตั้งแต่การอัปโหลด การตรวจว่าเป็นใบปาล์ม ไปจนถึงการปฏิเสธภาพตามเกณฑ์ความเชื่อมั่น หากต้องการวัดระบบทั้งหมด ให้ใช้ภาพที่ผู้เชี่ยวชาญยืนยันคำตอบและไม่เคยใช้ฝึก ส่งผ่านเว็บไซต์จริง บันทึกคำตอบทุกภาพ รวมภาพที่ระบบวิเคราะห์ไม่สำเร็จด้วย แล้วรายงานจำนวนที่ถูกต้อง จำนวนที่ผิด และจำนวนที่ระบบปฏิเสธแยกกัน

Confidence ของภาพแต่ละภาพและคะแนนความพึงพอใจไม่ใช่ Accuracy

## กราฟเส้น Accuracy / Loss แบบตัวอย่าง

ต้องมีค่าระหว่างฝึกทุก epoch ได้แก่ `accuracy`, `val_accuracy`, `loss`, `val_loss` ไม่สามารถสร้างกราฟเส้นนี้จาก Accuracy สุดท้ายเพียงค่าเดียวได้

ถ้ายังเปิด notebook ฝึกใน Colab และมีตัวแปร `history` จาก `history = model.fit(...)` อยู่ ให้รัน:

```python
import json
import matplotlib.pyplot as plt

# ใช้ history จากการฝึกจริง ห้ามใส่ค่าตัวเลขที่สมมติขึ้น
h = history.history
with open("history-v1.3.json", "w") as f:
    json.dump(h, f)

epochs = range(1, len(h["accuracy"]) + 1)
fig, axes = plt.subplots(1, 2, figsize=(12, 4))
for ax, metric, title in zip(axes, ["accuracy", "loss"], ["Model accuracy", "Model loss"]):
    ax.plot(epochs, h[metric], label="Training")
    ax.plot(epochs, h["val_" + metric], label="Validation")
    ax.set_title(title)
    ax.set_xlabel("Epoch")
    ax.set_ylabel(metric.capitalize())
    ax.legend()
    ax.grid(alpha=0.2)
fig.tight_layout()
fig.savefig("training-curves-v1.3.png", dpi=300, bbox_inches="tight")
fig.savefig("training-curves-v1.3.pdf", bbox_inches="tight")
plt.show()
```

หาก notebook ใช้ชื่อ `history_fine_tune` หรือ `history_head` ให้เปลี่ยนชื่อให้ตรงกับตัวแปรจริง และระบุว่ากราฟเป็นช่วงฝึกใด หากไม่มีประวัติการฝึกเดิม จะต้องฝึกใหม่เพื่อเก็บประวัติ และรายงานกราฟกับผลทดสอบของการฝึกครั้งใหม่นั้น ไม่จับคู่กับผลประเมินของคนละการฝึก
