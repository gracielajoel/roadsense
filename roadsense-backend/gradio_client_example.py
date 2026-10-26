"""Contoh client tipis Gradio: cuma manggil API, tanpa logika."""
import time
import gradio as gr
import httpx

API = "http://localhost:8000/api/v1"
BASE = "http://localhost:8000"


def analyze(video_path):
    with open(video_path, "rb") as f:
        r = httpx.post(f"{API}/videos", files={"file": (video_path, f, "video/mp4")}, timeout=300)
    r.raise_for_status()
    ids = r.json()
    while True:
        job = httpx.get(f"{API}/jobs/{ids['job_id']}").json()
        if job["status"] in ("done", "failed"):
            break
        time.sleep(1)
    events = httpx.get(f"{API}/videos/{ids['video_id']}/events").json()
    return [[e["id"], e["damage_type"], e["confidence"], e["timestamp_sec"]] for e in events]


with gr.Blocks() as demo:
    v = gr.Video(label="Upload video")
    btn = gr.Button("Analisis")
    out = gr.Dataframe(headers=["id", "type", "conf", "detik"])
    btn.click(analyze, v, out)

demo.launch()
