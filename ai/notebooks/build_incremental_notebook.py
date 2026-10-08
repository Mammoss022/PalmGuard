"""Generate the self-contained Colab notebook; no training is run locally."""
import json
from pathlib import Path

cells = []
def md(s):
    cells.append(dict(cell_type="markdown", metadata={}, source=s.strip().splitlines(True)))
def code(s):
    cells.append(dict(cell_type="code", execution_count=None, outputs=[], metadata={}, source=s.strip().splitlines(True)))

md('''# PalmGuard: เพิ่มข้อมูลและ fine-tune โมเดลเดิม
รันทีละเซลล์ใน Google Colab โดยเลือก GPU ก่อน เตรียม Google Drive/MyDrive/PalmGuardTraining/
- new_dataset.zip: ZIP ที่มีโฟลเดอร์ภาพใหม่ทั้ง 11 โฟลเดอร์ (มีโฟลเดอร์ครอบอีกชั้นได้)
- oil_palm_disease_model.h5: โมเดลต้นฉบับจาก notebook เดิม
- class_names.json: รายชื่อคลาสจากการเทรนเดิม เรียงตาม output ของโมเดล
- old_split/ (แนะนำ): train/, val/, test/ แต่ละชุดมี brown_spots/, healthy/, white_scale/

หากใช้ mobilenetv2-v1.2.keras จาก PalmGuard ให้แก้ MODEL_PATH, CLASS_JSON และ MODEL_HAS_RESCALING=True ในเซลล์ตั้งค่า ห้ามใส่ Rescaling ซ้ำ
ภาพ Date Palm เป็นอินทผลัม ผลบนชุดนี้ไม่ยืนยันความแม่นยำกับปาล์มน้ำมันจริง
ผลทดสอบใหม่อาจปนภาพที่ pretrained model เคยเห็น หากไม่มีประวัติชุดเดิม จึงรายงานเป็น provisional เท่านั้น
''')
code('''from google.colab import drive
drive.mount('/content/drive')
import tensorflow as tf
import numpy as np
import pandas as pd
import json, hashlib, zipfile, shutil
from pathlib import Path
from PIL import Image
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
tf.keras.utils.set_random_seed(42)
print('TensorFlow:', tf.__version__)
print('GPU:', tf.config.list_physical_devices('GPU'))
if not tf.config.list_physical_devices('GPU'):
    print('แนะนำเปลี่ยน runtime เป็น GPU ก่อนเทรน')
''')
md('''## 1. ตั้งค่า
เลือกโมเดลที่ต้องการเริ่มต้น พร้อม class_names ของโมเดลไฟล์นั้น ห้ามเดาลำดับคลาส
old_split ต้องเป็นการแบ่งชุดเดิมจริง ห้ามนำข้อมูลเดิมทั้งหมดมาแบ่งใหม่ เพราะโมเดลเริ่มต้นเคยเห็นภาพ train เดิมแล้ว
หากไม่มี old_split โค้ดยังเทรนได้ แต่จะเปรียบเทียบการลืมข้อมูลเดิมและรับรองชุดทดสอบอิสระไม่ได้
''')
code('''ROOT = Path('/content/drive/MyDrive/PalmGuardTraining')
MODEL_PATH = ROOT / 'oil_palm_disease_model.h5'
CLASS_JSON = ROOT / 'class_names.json'
MODEL_HAS_RESCALING = False  # True เฉพาะโมเดล PalmGuard ที่มี Rescaling(1/255) อยู่แล้ว
ZIP_PATH = ROOT / 'new_dataset.zip'
OLD_SPLIT = ROOT / 'old_split'
OUT = ROOT / ('runs/' + pd.Timestamp.now().strftime('%Y%m%d_%H%M%S'))
OUT.mkdir(parents=True, exist_ok=False)
CLASSES = ['brown_spots', 'healthy', 'white_scale']
ALIASES = {'brown_spots':'brown_spots', 'brown_spot':'brown_spots',
           'healthy':'healthy', 'white_scale':'white_scale'}
assert MODEL_PATH.is_file(), MODEL_PATH
assert CLASS_JSON.is_file(), 'ต้องใช้รายชื่อคลาสที่บันทึกจากโมเดลเดิม'
old_names = json.loads(CLASS_JSON.read_text(encoding='utf-8'))
assert isinstance(old_names, list), 'class_names.json ต้องเป็น list เรียงตาม output index'
assert [ALIASES.get(x.lower()) for x in old_names] == CLASSES, old_names
print('ยืนยัน output index:', dict(enumerate(CLASSES)))
FOLDERS = {
 'brown_spots': ['Brown leaf Spot _1', 'Brown leaf Spot _2'],
 'healthy': ['Healthy Leaves _1', 'Healthy Leaves Date Palm Part_2', 'Healthy Leaves Date Palm Part_3'],
 'white_scale': ['White Cochineal_1', 'White Cochineal _2', 'White Cochineal _3',
                 'White Cochineal _4', 'White Cochineal _5', 'White Cochineal _6'],
}
NEW = Path('/content/palmguard_new')
NEW.mkdir(exist_ok=True)
with zipfile.ZipFile(ZIP_PATH) as z:
    for item in z.infolist():
        dest = (NEW / item.filename).resolve()
        assert dest.is_relative_to(NEW.resolve()), 'ZIP path ไม่ถูกต้อง'
    z.extractall(NEW)
''')
md('''## ทางเลือก: สร้าง old_split จาก archive.zip ย้อนหลัง
อัปโหลด archive.zip ไป ROOT ก่อน หากมี old_split เดิมจริงอยู่แล้ว ให้ข้ามเซลล์นี้
archive.zip มีข้อมูลซ้ำสองโครงสร้าง เลือกเฉพาะ Date Palm data/ ที่ root ตามสคริปต์เดิม
archive (1).zip ไม่ถูกใช้เทรนในสคริปต์ที่ตรวจ จึงไม่รวมเข้ากับสามคลาสนี้
การใช้ seed=42 และ ratio เดิมไม่รับประกัน split ตรงประวัติจริงหากเวอร์ชันไลบรารี/ไฟล์ต่างกัน
ตั้ง RECONSTRUCT_OLD=True เฉพาะเมื่อยอมรับว่า split นี้สร้างย้อนหลัง; รายงานผลแบบ provisional
''')
code('''RECONSTRUCT_OLD = False
if RECONSTRUCT_OLD:
    import subprocess, sys
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'split-folders==0.5.1'])
    import splitfolders
    restored = Path('/content/palmguard_old_organized')
    assert not restored.exists(), 'มีโฟลเดอร์จากการรันก่อนแล้ว ให้ restart runtime ก่อนสร้างใหม่'
    mapping = {'brown spots':'brown_spots', 'healthy':'healthy', 'white scale':'white_scale'}
    for label in CLASSES:
        (restored / label).mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(ROOT / 'archive.zip') as z:
        for item in z.infolist():
            parts = item.filename.split('/')
            if len(parts) != 3 or parts[0] != 'Date Palm data' or parts[1] not in mapping or item.is_dir():
                continue
            assert parts[2] not in ('', '.', '..')
            target = restored / mapping[parts[1]] / ('Date Palm data_' + parts[2])
            target.write_bytes(z.read(item))
    assert all(any((restored / c).iterdir()) for c in CLASSES)
    OLD_SPLIT = Path('/content/palmguard_old_split_reconstructed')
    assert not OLD_SPLIT.exists(), 'ต้องเริ่ม runtime ใหม่ก่อนสร้าง split ซ้ำ'
    splitfolders.ratio(str(restored), output=str(OLD_SPLIT), seed=42, ratio=(0.7,0.15,0.15))
    print('ใช้ split ที่สร้างย้อนหลัง:', OLD_SPLIT)
    print('ไม่ยืนยันว่าตรง split เดิม ต้องรายงานผลเป็น provisional')
''')
md('''## 2. ตรวจไฟล์และตัดภาพซ้ำก่อนแบ่งข้อมูล
ใช้ hash ของพิกเซล RGB ที่ decode แล้ว จึงพบไฟล์ต่างชื่อที่มีพิกเซลเหมือนกันด้วย แต่ไม่ครอบคลุมภาพที่ถูก crop/บีบอัด/ปรับสี
หากภาพเดียวกันมี label ต่างกัน โค้ดหยุดให้ตรวจเอง ไม่เลือก label ให้
ภาพใหม่ที่ซ้ำข้อมูลเก่าจะไม่นำเข้าซ้ำ และคง split เดิมไว้
''')
code('''EXTS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}
bad, duplicates, conflicts, rows = [], [], [], []
seen = {}
def add_folder(folder, label, split, origin):
    for p in sorted(folder.rglob('*')):
        if p.suffix.lower() not in EXTS or not p.is_file():
            continue
        try:
            with Image.open(p) as im:
                im = im.convert('RGB')
                im.load()
                digest = hashlib.sha256(str(im.size).encode() + im.tobytes()).hexdigest()
        except Exception as e:
            bad.append({'path':str(p), 'error':str(e)})
            continue
        if digest in seen:
            prev = seen[digest]
            duplicates.append({'path':str(p), 'kept':prev['path']})
            if prev['label'] != label or (origin == 'old' and prev['split'] != split):
                conflicts.append({'path':str(p), 'previous':prev})
            continue
        record = dict(path=str(p), label=label, split=split, origin=origin, hash=digest)
        seen[digest] = record
        rows.append(record)

if OLD_SPLIT.exists():
    for split in ['train', 'val', 'test']:
        for label in CLASSES:
            folder = OLD_SPLIT / split / label
            assert folder.is_dir(), f'โครงสร้าง old_split ไม่ครบ: {folder}'
            add_folder(folder, label, split, 'old')
for label, names in FOLDERS.items():
    for name in names:
        matches = [p for p in NEW.rglob('*') if p.is_dir() and p.name == name]
        assert len(matches) == 1, f'ต้องพบโฟลเดอร์ {name} ครั้งเดียว แต่พบ {len(matches)}'
        add_folder(matches[0], label, '', 'new')
pd.DataFrame(bad).to_csv(OUT / 'corrupt_files.csv', index=False)
pd.DataFrame(duplicates).to_csv(OUT / 'duplicates.csv', index=False)
(OUT / 'conflicts.json').write_text(json.dumps(conflicts, indent=2), encoding='utf-8')
assert not conflicts, 'พบ label ขัดแย้งหรือภาพซ้ำข้าม split เก่า ตรวจ conflicts.json ก่อน'
df = pd.DataFrame(rows)
print('ไฟล์เสีย:', len(bad), 'ภาพซ้ำ:', len(duplicates))
print(pd.crosstab(df.origin, df.label))
''')
md('''## 3. แบ่งข้อมูลใหม่ 70/15/15 และรวมกับ split เดิม
เซลล์นี้แบ่งระดับภาพ ใช้ได้เป็น baseline เท่านั้น ถ้ารู้ tree_id/ต้น/รอบถ่าย ต้องแบ่งเป็นกลุ่มให้ภาพจากต้นเดียวกันอยู่ split เดียวกันก่อนฝึกจริง
อย่าใช้หมายเลขไฟล์หรือโฟลเดอร์ Part เป็น tree_id โดยไม่มีหลักฐาน
แม้ตัดภาพซ้ำแล้ว ภาพมุมใกล้กันจากใบ/ต้นเดียวกันอาจยังทำให้ผลสูงเกินจริง
''')
code('''new = df[df.origin == 'new'].copy()
if len(new):
    assert new.label.value_counts().reindex(CLASSES, fill_value=0).min() >= 10, 'ภาพใหม่บางคลาสน้อยเกินไป'
    train_i, rest_i = train_test_split(new.index, test_size=0.30, random_state=42, stratify=new.label)
    val_i, test_i = train_test_split(rest_i, test_size=0.50, random_state=42, stratify=df.loc[rest_i, 'label'])
    df.loc[train_i, 'split'] = 'train'
    df.loc[val_i, 'split'] = 'val'
    df.loc[test_i, 'split'] = 'test'
assert set(df['split']) == {'train', 'val', 'test'}
assert df.groupby('hash')['split'].nunique().max() == 1
df.to_csv(OUT / 'split_manifest.csv', index=False)
print(pd.crosstab([df.origin, df['split']], df.label))
# Copy once to runtime local disk; read images locally during training.
LOCAL = Path('/content/palmguard_training')
LOCAL.mkdir(exist_ok=True)
for i, row in df.iterrows():
    dest = LOCAL / (row['hash'] + Path(row['path']).suffix.lower())
    if not dest.exists():
        shutil.copy2(row['path'], dest)
    df.loc[i, 'local_path'] = str(dest)

def make_ds(frame, training=False):
    paths = frame.local_path.to_numpy()
    labels = frame.label.map(dict(zip(CLASSES, range(3)))).to_numpy(dtype=np.int32)
    ds = tf.data.Dataset.from_tensor_slices((paths, labels))
    if training:
        ds = ds.shuffle(len(frame), seed=42, reshuffle_each_iteration=True)
    def load_pil(path):
        with Image.open(path.numpy().decode()) as im:
            # Match ai/src/preprocessing.py exactly: RGB then PIL bilinear resize.
            return np.asarray(im.convert('RGB').resize((224,224), Image.Resampling.BILINEAR), dtype=np.float32)
    def load(path, label):
        x = tf.py_function(load_pil, [path], tf.float32)
        x.set_shape((224,224,3))
        return x, tf.one_hot(label, 3)
    return ds.map(load, num_parallel_calls=tf.data.AUTOTUNE).batch(32).prefetch(tf.data.AUTOTUNE)
train_frame = df[df['split'] == 'train']
val_frame = df[df['split'] == 'val']
test_frame = df[df['split'] == 'test']
train_ds = make_ds(train_frame, True)
val_ds = make_ds(val_frame)
test_ds = make_ds(test_frame)
counts = train_frame.label.value_counts().reindex(CLASSES)
assert counts.notna().all() and (counts > 0).all()
class_weight = {i:float(len(train_frame)/(3*n)) for i,n in enumerate(counts)}
print('class_weight:', class_weight)
''')
md('''## 4. โหลดน้ำหนักเดิมและสร้างโมเดลรับพิกเซลดิบ
ไม่เปลี่ยน preprocessing เดิมเป็น MobileNetV2 preprocess_input เพราะโมเดลเดิมเรียนรู้จาก [0,1]
augmentation อยู่เฉพาะ wrapper สำหรับเทรน ไม่ส่งออกไปใช้ใน PalmGuard
''')
code('''core = tf.keras.models.load_model(MODEL_PATH, compile=False)
assert tuple(core.input_shape[1:]) == (224,224,3), core.input_shape
assert core.output_shape[-1] == 3, core.output_shape
core.summary()
raw = tf.keras.Input((224,224,3), name='raw_rgb')
normalized = raw if MODEL_HAS_RESCALING else tf.keras.layers.Rescaling(1./255)(raw)
deploy = tf.keras.Model(raw, core(normalized), name='palmguard_raw_pixels')
augment = tf.keras.Sequential([
    tf.keras.layers.RandomFlip('horizontal'),
    tf.keras.layers.RandomRotation(0.05, fill_mode='reflect'),
    tf.keras.layers.RandomZoom(0.10),
], name='train_augmentation')
train_input = tf.keras.Input((224,224,3))
trainer = tf.keras.Model(train_input, deploy(augment(train_input)))
def compile_model(m, lr):
    m.compile(optimizer=tf.keras.optimizers.Adam(lr), loss='categorical_crossentropy', metrics=['accuracy'])
compile_model(deploy, 1e-5)
baseline = {}
for origin in ['old', 'new']:
    subset = test_frame[test_frame.origin == origin]
    if len(subset):
        baseline[origin] = deploy.evaluate(make_ds(subset), verbose=0, return_dict=True)
print('โมเดลเดิมบน split เดียวกัน:', baseline)
deploy.save(OUT / 'baseline_raw.keras')
''')
md('''## 5. Fine-tune ที่ learning rate 1e-5
ปลดเฉพาะ 30 เลเยอร์ท้ายของ MobileNetV2 และ head; freeze BatchNormalization ทั้งหมด
checkpoint และ EarlyStopping ใช้ val_loss เหมือนกัน บันทึกบน Drive ทุกครั้งที่ดีขึ้น
หลังเทรนเลือกโมเดลจาก validation เท่านั้น หากยังไม่ดีเท่า baseline ให้เก็บ baseline
''')
code('''def descendants(layer):
    yield layer
    for child in getattr(layer, 'layers', []):
        yield from descendants(child)
core.trainable = True
bases = [l for l in descendants(core) if isinstance(l, tf.keras.Model) and 'mobilenetv2' in l.name.lower()]
assert len(bases) == 1, 'ไม่พบ MobileNetV2 เพียงหนึ่งตัว ตรวจ model.summary()'
base = bases[0]
base.trainable = True
for layer in base.layers[:-30]:
    layer.trainable = False
for layer in descendants(core):
    if isinstance(layer, tf.keras.layers.BatchNormalization):
        layer.trainable = False
compile_model(deploy, 1e-5)
baseline_val = deploy.evaluate(val_ds, verbose=0, return_dict=True)
compile_model(trainer, 1e-5)
callbacks = [
    tf.keras.callbacks.ModelCheckpoint(str(OUT / 'best_trainer.keras'), monitor='val_loss', save_best_only=True),
    tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True),
    tf.keras.callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=2, min_lr=1e-7),
    tf.keras.callbacks.CSVLogger(str(OUT / 'training_history.csv')),
]
history = trainer.fit(train_ds, validation_data=val_ds, epochs=20,
                      class_weight=class_weight, callbacks=callbacks)
# Copy weights from the best saved checkpoint explicitly.
best_trainer = tf.keras.models.load_model(OUT / 'best_trainer.keras', compile=False)
trainer.set_weights(best_trainer.get_weights())
compile_model(deploy, 1e-5)
candidate_val = deploy.evaluate(val_ds, verbose=0, return_dict=True)
accepted = candidate_val['loss'] < baseline_val['loss']
deploy.save(OUT / 'candidate_raw.keras')
selected = deploy if accepted else tf.keras.models.load_model(OUT / 'baseline_raw.keras', compile=False)
compile_model(selected, 1e-5)
selected.save(OUT / 'mobilenetv2-v1.3.keras')
print('baseline val:', baseline_val, 'candidate val:', candidate_val)
print('เลือก:', 'โมเดลเทรนเพิ่ม' if accepted else 'baseline เพราะ val_loss ไม่ดีขึ้น')
''')
md('''## 6. ประเมินและส่งออก
ใช้ test เพื่อรายงานหลังเลือกโมเดลแล้ว อย่าเลือก epoch/hyperparameters จาก test
test ใหม่เป็น provisional: อาจเคยอยู่ในชุดเทรนของโมเดลเริ่มต้น หรือมีภาพใกล้เคียงข้าม split
รายงาน old/new แยกกันเพื่อดูผลกระทบต่อข้อมูลเดิม ค่า confidence เป็น softmax ไม่ใช่การรับประกันความถูกต้อง
''')
code('''reports = {}
for origin in ['old', 'new']:
    subset = test_frame[test_frame.origin == origin]
    if subset.empty:
        continue
    ds = make_ds(subset)
    metrics = selected.evaluate(ds, verbose=0, return_dict=True)
    probs = selected.predict(ds, verbose=0)
    predicted = probs.argmax(axis=1)
    actual = subset.label.map(dict(zip(CLASSES, range(3)))).to_numpy()
    report = classification_report(actual, predicted, labels=[0,1,2], target_names=CLASSES, output_dict=True, zero_division=0)
    cm = confusion_matrix(actual, predicted, labels=[0,1,2])
    reports[origin] = {'metrics':metrics, 'report':report, 'confusion_matrix':cm.tolist(), 'baseline':baseline[origin]}
    print(origin, metrics)
    print(classification_report(actual, predicted, labels=[0,1,2], target_names=CLASSES, digits=4, zero_division=0))
    fig, ax = plt.subplots(figsize=(6,5))
    ax.imshow(cm, cmap='Blues')
    ax.set(xticks=range(3), yticks=range(3), xticklabels=CLASSES, yticklabels=CLASSES,
           xlabel='Predicted', ylabel='Actual', title=f'{origin} test (new = provisional)')
    for i in range(3):
        for j in range(3):
            ax.text(j, i, str(cm[i,j]), ha='center', va='center')
    fig.tight_layout()
    fig.savefig(OUT / f'confusion_matrix_{origin}.png')
    plt.show()
(OUT / 'evaluation.json').write_text(json.dumps(reports, indent=2), encoding='utf-8')
(OUT / 'class_names-v1.3.json').write_text(json.dumps(['Brown_Spot','Healthy','White_Scale'], indent=2), encoding='utf-8')
metadata = {'source_model':str(MODEL_PATH), 'tensorflow':tf.__version__,
 'input':'RGB float32 [0,255], PIL bilinear 224x224', 'internal_scaling':'1/255',
 'class_order':CLASSES, 'seed':42, 'candidate_accepted_by_val_loss':bool(accepted),
 'baseline_val':baseline_val, 'candidate_val':candidate_val,
 'test_limitations':'new test provisional: old training exposure and tree grouping unknown'}
(OUT / 'metadata.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
# Verify saved model reproduces predictions on the same raw-pixel batch.
reloaded = tf.keras.models.load_model(OUT / 'mobilenetv2-v1.3.keras', compile=False)
x, _ = next(iter(test_ds))
np.testing.assert_allclose(selected(x, training=False).numpy(), reloaded(x, training=False).numpy(), rtol=1e-5, atol=1e-6)
print('ตรวจ save/load ผ่าน; ผลลัพธ์อยู่ที่', OUT)
from google.colab import files
files.download(str(OUT / 'mobilenetv2-v1.3.keras'))
files.download(str(OUT / 'class_names-v1.3.json'))
files.download(str(OUT / 'evaluation.json'))
''')
md('''## นำเข้า PalmGuard หลังตรวจรายงาน
คัดลอก mobilenetv2-v1.3.keras ไป ai/models/ แล้วแก้ backend/.env:
```
AI_BACKEND=mobilenet
MOBILENET_MODEL_PATH=D:/PalmGuard/ai/models/mobilenetv2-v1.3.keras
```
แก้ MODEL_VERSION ใน ai/config.py เป็น "v1.3" แล้ว restart backend เพื่อโหลดโมเดลใหม่
CLASS_NAMES คงเป็น ["Brown_Spot", "Healthy", "White_Scale"]
โมเดลที่ส่งออกนี้รับพิกเซลดิบแล้ว จึงห้ามหาร 255 เพิ่มใน backend
ตรวจรูปตัวอย่างทั้งสามคลาสผ่านระบบจริง รวมถึงผลของ Gemini palm-leaf gate ที่ยังทำงานก่อน MobileNetV2
เก็บ v1.2 ไว้สำหรับย้อนกลับ และใช้ภาพปาล์มน้ำมันจริงที่ไม่เคยเทรนเพื่อประเมินก่อนนำไปใช้จริง
''')

path = Path(__file__).with_name('palmguard_incremental_colab.ipynb')
path.write_text(json.dumps({'cells':cells, 'metadata':{'kernelspec':{'display_name':'Python 3','language':'python','name':'python3'}, 'colab':{'name':path.name}, 'accelerator':'GPU'}, 'nbformat':4,'nbformat_minor':5}, ensure_ascii=False, indent=2), encoding='utf-8')
print(path)
