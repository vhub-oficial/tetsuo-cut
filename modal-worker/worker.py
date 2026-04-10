"""
TETSUO CUT — Modal.com Audio Processing Worker
"""

import modal
import os
import subprocess
import tempfile

app = modal.App("tetsuo-cut")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install("fastapi[standard]", "supabase==2.10.0", "httpx==0.27.0")
)

WAV_FILTERS = (
    "highpass=f=80,"
    "acompressor=threshold=-20dB:ratio=4:makeup=6dB,"
    "silenceremove="
    "start_periods=1:start_threshold=-55dB:start_silence=0.05:"
    "stop_periods=-1:stop_duration=0.10:stop_threshold=-45dB:stop_silence=0.10,"
    "adelay=200|200"
)

MP3_FILTERS = (
    "highpass=f=80,"
    "acompressor=threshold=-20dB:ratio=4:makeup=6dB,"
    "silenceremove="
    "start_periods=1:start_threshold=-50dB:start_silence=0.05:"
    "stop_periods=-1:stop_duration=0.10:stop_threshold=-40dB:stop_silence=0.10,"
    "adelay=200|200"
)


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("tetsuo-cut-secrets")],
    timeout=600,
    memory=1024,
)
@modal.fastapi_endpoint(method="POST")
def process_audio(item: dict) -> dict:
    from supabase import create_client

    job_id = item.get("job_id")
    if not job_id:
        return {"error": "missing job_id"}

    supabase_url = os.environ["SUPABASE_URL"]
    service_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    client = create_client(supabase_url, service_key)

    client.table("jobs").update(
        {"status": "processing", "processing_started_at": "now()"}
    ).eq("id", job_id).execute()

    try:
        result = (
            client.table("jobs")
            .select("*")
            .eq("id", job_id)
            .single()
            .execute()
        )
        job = result.data
        if not job:
            raise ValueError(f"Job {job_id} not found")

        original_path = job["original_file_path"]
        filename = job["original_filename"]
        ext = filename.rsplit(".", 1)[-1].lower()

        if ext not in ("mp3", "wav"):
            raise ValueError(f"Unsupported file format: {ext}")

        file_bytes = client.storage.from_("audio-originals").download(original_path)

        with tempfile.TemporaryDirectory() as tmpdir:
            input_path = os.path.join(tmpdir, f"input.{ext}")
            output_path = os.path.join(tmpdir, f"output.{ext}")

            with open(input_path, "wb") as f:
                f.write(file_bytes)

            if ext == "wav":
                filters = WAV_FILTERS
                codec_args = ["-acodec", "pcm_s16le"]
            else:
                filters = MP3_FILTERS
                codec_args = ["-acodec", "libmp3lame", "-b:a", "192k"]

            cmd = [
                "ffmpeg", "-y",
                "-i", input_path,
                "-af", filters,
                *codec_args,
                output_path,
            ]

            proc = subprocess.run(cmd, capture_output=True, text=True)

            if proc.returncode != 0:
                stderr_tail = proc.stderr[-1000:] if proc.stderr else "(no output)"
                raise RuntimeError(f"ffmpeg failed (exit {proc.returncode}): {stderr_tail}")

            with open(output_path, "rb") as f:
                processed_bytes = f.read()

        processed_path = f"{job['user_id']}/processed/{job_id}.{ext}"
        client.storage.from_("audio-processed").upload(
            processed_path,
            processed_bytes,
            {"content-type": f"audio/{ext}"},
        )

        client.table("jobs").update(
            {
                "status": "done",
                "processed_file_path": processed_path,
                "processing_finished_at": "now()",
            }
        ).eq("id", job_id).execute()

        return {"ok": True, "job_id": job_id}

    except Exception as exc:
        error_message = str(exc)[:2000]

        client.table("jobs").update(
            {
                "status": "error",
                "error_message": error_message,
                "processing_finished_at": "now()",
            }
        ).eq("id", job_id).execute()

        try:
            client.table("job_logs").insert(
                {
                    "job_id": job_id,
                    "level": "error",
                    "message": error_message,
                    "metadata": {},
                }
            ).execute()
        except Exception:
            pass

        raise
