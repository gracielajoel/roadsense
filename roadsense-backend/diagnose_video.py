"""
Diagnosa: kenapa sebuah video tidak menghasilkan event?

Jalankan dari folder roadsense-backend (venv aktif):
    python diagnose_video.py path\\ke\\video.mp4
    python diagnose_video.py path\\ke\\video.mp4 0.10      # coba confidence lebih rendah

Memakai model, imgsz, tracker, dan stride yang sama persis dengan backend.
"""
import sys
from collections import Counter, defaultdict

from app.config import (
    MIN_TRACK_FRAMES, MODEL_CONF, MODEL_IMGSZ, MODEL_PATH, TRACKER_CONFIG, USE_DUMMY_INFERENCE, VID_STRIDE,
)
from app.services.classes import to_damage_code
from app.services.inference import _get_model, _probe_video


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("Pemakaian: python diagnose_video.py VIDEO [CONF]")
    video = sys.argv[1]
    conf = float(sys.argv[2]) if len(sys.argv) > 2 else MODEL_CONF

    print(f"Model      : {MODEL_PATH}")
    print(f"Setelan    : imgsz={MODEL_IMGSZ} conf={conf} tracker={TRACKER_CONFIG} stride={VID_STRIDE} min_track={MIN_TRACK_FRAMES}")
    if USE_DUMMY_INFERENCE:
        print("CATATAN    : USE_DUMMY_INFERENCE=true di .env (backend memakai dummy, bukan model ini)")
    fps, total = _probe_video(video)
    print(f"Video      : {fps:.1f} fps, {total} frame (~{total / fps:.0f} detik)\n")

    model = _get_model()
    frames = frames_det = frames_noid = 0
    noid_best: dict[str, float] = defaultdict(float)   # deteksi yang tidak diberi ID oleh tracker
    track_len: Counter = Counter()
    track_best: dict[int, tuple[str, float]] = {}

    results = model.track(
        source=video, stream=True, persist=False, tracker=TRACKER_CONFIG,
        imgsz=MODEL_IMGSZ, conf=conf, vid_stride=VID_STRIDE, verbose=False,
    )
    for r in results:
        frames += 1
        b = r.boxes
        if b is None or len(b) == 0:
            continue
        frames_det += 1
        classes, confs = b.cls.tolist(), b.conf.tolist()
        if b.id is None:
            frames_noid += 1
            for c, s in zip(classes, confs):
                code = to_damage_code(int(c), model.names)
                noid_best[code] = max(noid_best[code], s)
            continue
        for tid, c, s in zip(b.id.tolist(), classes, confs):
            tid = int(tid)
            track_len[tid] += 1
            code = to_damage_code(int(c), model.names)
            if tid not in track_best or s > track_best[tid][1]:
                track_best[tid] = (code, s)

    kept = [t for t, n in track_len.items() if n >= MIN_TRACK_FRAMES]
    print(f"Frame diproses                  : {frames}")
    print(f"Frame dengan deteksi            : {frames_det}")
    print(f"  - tanpa ID dari tracker       : {frames_noid}")
    print(f"Jumlah track                    : {len(track_len)}")
    print(f"Track >= {MIN_TRACK_FRAMES} frame (jadi event)   : {len(kept)}")
    if noid_best:
        print("Deteksi tanpa ID (confidence tertinggi per kelas):",
              {k: round(v, 2) for k, v in noid_best.items()})
    for t in sorted(track_len):
        code, s = track_best[t]
        flag = "event" if t in kept else "dibuang (terlalu pendek)"
        print(f"  track {t}: {code} conf maks {s:.2f}, {track_len[t]} frame -> {flag}")

    print("\nKESIMPULAN:")
    if frames == 0:
        print("- Tidak ada frame yang terbaca. Cek file videonya.")
    elif frames_det == 0:
        print(f"- Model tidak mendeteksi APA PUN pada conf={conf}.")
        if conf > 0.10:
            print("  Coba lagi dengan conf lebih rendah: python diagnose_video.py VIDEO 0.10")
        print("  Coba juga video lain yang kerusakannya besar dan jelas (siang hari), dan tanyakan ke DL engineer")
        print("  imgsz yang dipakai saat evaluasi (training 640, config inferensi 512).")
    elif not track_len:
        print("- Ada deteksi, tetapi tracker tidak membuat track satu pun. Periksa TRACKER_CONFIG")
        print("  dan minta bantuan Nelson untuk setelan BoT-SORT.")
    elif not kept:
        print(f"- Semua track kurang dari {MIN_TRACK_FRAMES} frame (deteksi tidak stabil antar frame).")
        print("  Turunkan MIN_TRACK_FRAMES di .env, atau naikkan kualitas deteksi (conf/imgsz).")
    else:
        print(f"- Seharusnya ada {len(kept)} event. Kalau API tetap kosong, masalahnya di backend: kirim hasil ini ke aku.")


if __name__ == "__main__":
    main()
