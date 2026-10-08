"""Export publication figures from saved evaluation data, without retraining.

Run from the repository root:
    backend/.venv/Scripts/python.exe ai/scripts/export_report_figures.py
"""
import json
import csv
import html
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "ai/models/evaluation-v1.3.json"
OUTPUT = ROOT / "docs/report-figures"


def export_class_counts(data):
    font_path = Path("C:/Windows/Fonts/tahoma.ttf")
    font = FontProperties(fname=str(font_path)) if font_path.exists() else FontProperties()
    headers = ["Class", "ชุดทดสอบเดิม (ภาพ)", "ชุดทดสอบใหม่ (ภาพ)"]
    classes = [("brown_spots", "ใบจุดสีน้ำตาล"), ("healthy", "ใบปกติ"), ("white_scale", "เพลี้ยหอย")]
    rows = []
    for code, label in classes:
        rows.append([label, str(int(data["old"]["report"][code]["support"])), str(int(data["new"]["report"][code]["support"]))])
    totals = [sum(int(row[col]) for row in rows) for col in [1, 2]]
    assert totals == [397, 365]
    for key, total in zip(["old", "new"], totals):
        assert int(np.asarray(data[key]["confusion_matrix"]).sum()) == total
    rows.append(["รวม", str(totals[0]), str(totals[1])])
    fig, ax = plt.subplots(figsize=(9, 3.2))
    ax.axis("off")
    ax.set_title("จำนวนภาพแต่ละคลาสในชุดทดสอบโมเดล v1.3", fontproperties=font, fontsize=14, pad=15)
    table = ax.table(cellText=rows, colLabels=headers, cellLoc="center", loc="center", colWidths=[.34, .33, .33])
    table.auto_set_font_size(False)
    table.scale(1, 1.9)
    for (row, col), cell in table.get_celld().items():
        cell.set_edgecolor("black")
        cell.set_linewidth(.75)
        cell.get_text().set_fontproperties(font)
        cell.get_text().set_fontsize(12)
        if row == 0 or row == len(rows):
            cell.set_facecolor("#c7c7c7" if row == 0 else "#eeeeee")
            cell.get_text().set_weight("bold")
    note = "แหล่งข้อมูล: evaluation-v1.3.json — จำนวนภาพทดสอบ ไม่ใช่จำนวนภาพฝึกทั้งหมด"
    fig.text(.5, .025, note, ha="center", fontproperties=font, fontsize=9)
    for extension in ["png", "pdf"]:
        fig.savefig(OUTPUT / f"class-counts-v1.3.{extension}", dpi=300, bbox_inches="tight")
    plt.close(fig)
    with (OUTPUT / "class-counts-v1.3.csv").open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(headers)
        writer.writerows(rows)
    table_html = "<table><tr>" + "".join(f"<th>{html.escape(value)}</th>" for value in headers) + "</tr>" + "".join("<tr>" + "".join(f"<td>{html.escape(value)}</td>" for value in row) + "</tr>" for row in rows) + "</table>"
    (OUTPUT / "class-counts-v1.3.html").write_text('<!doctype html><html lang="th"><meta charset="utf-8"><style>body{font-family:Tahoma,sans-serif}table{border-collapse:collapse}th,td{border:1px solid black;padding:12px;text-align:center}th{background:#c7c7c7}</style><h2>จำนวนภาพแต่ละคลาสในชุดทดสอบโมเดล v1.3</h2>' + table_html + f'<p>{note}</p></html>', encoding="utf-8")


def export_tables(data):
    font_path = Path("C:/Windows/Fonts/tahoma.ttf")
    font = FontProperties(fname=str(font_path)) if font_path.exists() else FontProperties()
    headers = ["Class", "Accuracy (%)", "Precision (%)", "Recall (%)", "F1-Score (%)"]
    classes = [("brown_spots", "ใบจุดสีน้ำตาล"), ("healthy", "ใบปกติ"), ("white_scale", "เพลี้ยหอย")]
    note = "หมายเหตุ: Accuracy เป็นค่ารวมของชุดทดสอบ แสดงซ้ำทุกแถว; คอลัมน์อื่นเป็นค่าของแต่ละ Class"
    sections = []
    for key, title in [("old", "ผลการประเมินโมเดล v1.3 บนชุดทดสอบเดิม (397 ภาพ)"), ("new", "ผลการประเมินโมเดล v1.3 บนชุดทดสอบใหม่ (365 ภาพ)")]:
        report = data[key]["report"]
        rows = [[label, f"{report['accuracy'] * 100:.2f}"] + [f"{report[code][metric] * 100:.2f}" for metric in ["precision", "recall", "f1-score"]] for code, label in classes]
        fig, ax = plt.subplots(figsize=(10, 2.8))
        ax.axis("off")
        ax.set_title(title, fontproperties=font, fontsize=13, pad=14)
        table = ax.table(cellText=rows, colLabels=headers, cellLoc="center", loc="center", colWidths=[.25, .19, .19, .18, .19])
        table.auto_set_font_size(False)
        table.set_fontsize(12)
        table.scale(1, 1.8)
        for (row, col), cell in table.get_celld().items():
            cell.set_edgecolor("black")
            cell.set_linewidth(.75)
            cell.get_text().set_fontproperties(font)
            cell.get_text().set_fontsize(12)
            if row == 0:
                cell.set_facecolor("#c7c7c7")
                cell.get_text().set_weight("bold")
        fig.text(.5, .045, note, ha="center", fontproperties=font, fontsize=9)
        for extension in ["png", "pdf"]:
            fig.savefig(OUTPUT / f"performance-table-{key}-v1.3.{extension}", dpi=300, bbox_inches="tight")
        plt.close(fig)
        with (OUTPUT / f"performance-table-{key}-v1.3.csv").open("w", encoding="utf-8-sig", newline="") as stream:
            writer = csv.writer(stream)
            writer.writerow(headers)
            writer.writerows(rows)
        table_html = "<table><tr>" + "".join(f"<th>{html.escape(value)}</th>" for value in headers) + "</tr>" + "".join("<tr>" + "".join(f"<td>{html.escape(value)}</td>" for value in row) + "</tr>" for row in rows) + "</table>"
        sections.append(f"<h2>{title}</h2>{table_html}<p>{note}</p>")
    document = '<!doctype html><html lang="th"><meta charset="utf-8"><title>ตารางผลประเมิน PalmGuard</title><style>body{font-family:Tahoma,sans-serif;margin:40px}h2{font-size:18px}table{border-collapse:collapse;width:100%;max-width:900px}th,td{border:1px solid black;padding:10px;text-align:center}th{background:#c7c7c7}p{font-size:12px}</style><body>' + "".join(sections) + '<p>แหล่งข้อมูล: ai/models/evaluation-v1.3.json เป็นผลประเมินโมเดลที่บันทึกไว้บนสองชุดทดสอบ ไม่ใช่การฝึกสองครั้งหรือผลทดสอบระบบเว็บทั้งหมด</p></body></html>'
    (OUTPUT / "performance-tables-v1.3.html").write_text(document, encoding="utf-8")


def main():
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    export_class_counts(data)
    if "--counts-only" in sys.argv:
        print(f"Class count tables saved to {OUTPUT}")
        return
    export_tables(data)
    if "--tables-only" in sys.argv:
        print(f"Tables saved to {OUTPUT}")
        return
    plt.rcParams.update({"font.size": 11, "axes.spines.top": False, "axes.spines.right": False})
    metrics = ["accuracy", "precision", "recall", "f1-score"]
    labels = ["Accuracy", "Precision", "Recall", "F1-score"]
    fig, ax = plt.subplots(figsize=(8.4, 5.2))
    x = np.arange(4)
    summaries = []
    for offset, key, title, color in [(-.19, "old", "Original test set", "#8ba9bd"), (.19, "new", "New test set", "#307b57")]:
        report = data[key]["report"]
        cm = np.asarray(data[key]["confusion_matrix"])
        correct, total = int(np.trace(cm)), int(cm.sum())
        accuracy = correct / total
        assert np.isclose(accuracy, report["accuracy"])
        values = [accuracy * 100] + [report["macro avg"][metric] * 100 for metric in metrics[1:]]
        bars = ax.bar(x + offset, values, .36, color=color, label=f"{title} (n={total})")
        ax.bar_label(bars, labels=[f"{v:.2f}%" for v in values], padding=4, fontsize=9)
        summaries.append(f"{title}: {correct}/{total} correct; Accuracy = {accuracy:.2%}")
    ax.set_xticks(x, labels)
    ax.set_ylim(0, 112)
    ax.set_yticks(np.arange(0, 101, 20))
    ax.set_ylabel("Score (%)")
    ax.set_title("PalmGuard MobileNetV2 v1.3 — Test-set Performance", pad=18)
    ax.legend(loc="lower right")
    ax.set_axisbelow(True)
    ax.grid(axis="y", alpha=.18)
    fig.text(.5, .025, "Precision, Recall and F1-score use macro averaging. Saved model evaluation; excludes web rejection gate.", ha="center", fontsize=8)
    fig.tight_layout(rect=(0, .05, 1, 1))
    for extension in ["png", "pdf"]:
        fig.savefig(OUTPUT / f"model-performance-v1.3.{extension}", dpi=300, bbox_inches="tight")
    plt.close(fig)

    cm = np.asarray(data["new"]["confusion_matrix"])
    classes = ["Leaf Spot", "Healthy", "White Scale"]
    fig, ax = plt.subplots(figsize=(6.4, 5.5))
    plot = ax.imshow(cm, cmap="Greens", vmin=0)
    ax.set_xticks(range(3), classes)
    ax.set_yticks(range(3), classes)
    ax.set_xlabel("Predicted class")
    ax.set_ylabel("Actual class")
    ax.set_title("Confusion Matrix — New Test Set (n=365)", pad=16)
    for (row, col), value in np.ndenumerate(cm):
        ax.text(col, row, str(value), ha="center", va="center", color="white" if value > cm.max()/2 else "#163b29", fontsize=15)
    fig.colorbar(plot, ax=ax, label="Number of images")
    fig.tight_layout()
    for extension in ["png", "pdf"]:
        fig.savefig(OUTPUT / f"confusion-matrix-v1.3.{extension}", dpi=300, bbox_inches="tight")
    plt.close(fig)
    (OUTPUT / "evaluation-summary.txt").write_text("Source: ai/models/evaluation-v1.3.json\n" + "\n".join(summaries) + "\nThese are saved model evaluation results, not an end-to-end web system test.\n", encoding="utf-8")
    print("\n".join(summaries))
    print(f"Figures saved to {OUTPUT}")


if __name__ == "__main__":
    main()
