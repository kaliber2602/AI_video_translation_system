import logging
import sys

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware


from app.api.routes import router
from app.core.database import ensure_db_schema

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
    force=True,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_db_schema()
    yield


app = FastAPI(title="VIDNOVA API", version="1.0.0", lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    try:
        body = await request.body()
        body_str = body.decode("utf-8", errors="replace")
    except Exception:
        body_str = "<could not read body>"
    logger.error(f"[422 Validation Error] {request.method} {request.url.path} -> Errors: {exc.errors()} | Raw Body: {body_str}")
    return JSONResponse(status_code=422, content={"detail": jsonable_encoder(exc.errors())})



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

from app.api.video_ws_routes import router as ws_router
from fastapi.responses import PlainTextResponse

@app.get("/metrics", response_class=PlainTextResponse)
def prometheus_metrics():
    """Lightweight native Prometheus metrics endpoint without heavy external deps."""
    lines = [
        "# HELP vidnova_api_status API availability status",
        "# TYPE vidnova_api_status gauge",
        "vidnova_api_status 1",
    ]
    try:
        from app.services.admin_service import (
            get_system_metrics,
            get_gpu_hardware_status,
            get_queue_orchestration_overview,
            get_chatbot_runtime_status,
            get_storage_stats,
        )
        import psutil
        import shutil

        metrics = get_system_metrics()
        gpu = get_gpu_hardware_status()
        queues = get_queue_orchestration_overview()
        chatbot = get_chatbot_runtime_status()
        storage = get_storage_stats()

        # Host System Resources
        cpu_usage = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory()

        lines.extend([
            "# HELP vidnova_host_cpu_percent Host CPU usage percent",
            "# TYPE vidnova_host_cpu_percent gauge",
            f"vidnova_host_cpu_percent {cpu_usage}",
            "# HELP vidnova_host_memory_percent Host Memory usage percent",
            "# TYPE vidnova_host_memory_percent gauge",
            f"vidnova_host_memory_percent {mem.percent}",
            "# HELP vidnova_host_memory_used_gb Host Memory used in GB",
            "# TYPE vidnova_host_memory_used_gb gauge",
            f"vidnova_host_memory_used_gb {round(mem.used / (1024**3), 2)}",
            "# HELP vidnova_host_memory_total_gb Host Memory total in GB",
            "# TYPE vidnova_host_memory_total_gb gauge",
            f"vidnova_host_memory_total_gb {round(mem.total / (1024**3), 2)}",

            "# HELP vidnova_total_users Total registered users",
            "# TYPE vidnova_total_users gauge",
            f"vidnova_total_users {metrics.total_users}",
            "# HELP vidnova_active_users Total active users",
            "# TYPE vidnova_active_users gauge",
            f"vidnova_active_users {metrics.active_users}",
            "# HELP vidnova_admin_users Total admin users",
            "# TYPE vidnova_admin_users gauge",
            f"vidnova_admin_users {metrics.admin_users}",
            "# HELP vidnova_total_projects Total projects created",
            "# TYPE vidnova_total_projects counter",
            f"vidnova_total_projects {metrics.total_projects}",
            "# HELP vidnova_total_videos Total video assets uploaded",
            "# TYPE vidnova_total_videos counter",
            f"vidnova_total_videos {metrics.total_videos}",
            "# HELP vidnova_total_jobs Total pipeline jobs",
            "# TYPE vidnova_total_jobs counter",
            f"vidnova_total_jobs {metrics.total_jobs}",
            "# HELP vidnova_jobs_processing Current processing jobs",
            "# TYPE vidnova_jobs_processing gauge",
            f"vidnova_jobs_processing {metrics.jobs_by_status.get('processing', 0)}",
            "# HELP vidnova_jobs_queued Current queued jobs",
            "# TYPE vidnova_jobs_queued gauge",
            f"vidnova_jobs_queued {metrics.jobs_by_status.get('queued', 0)}",
            "# HELP vidnova_jobs_completed Completed pipeline jobs",
            "# TYPE vidnova_jobs_completed counter",
            f"vidnova_jobs_completed {metrics.jobs_by_status.get('completed', 0)}",
            "# HELP vidnova_jobs_failed Total failed jobs",
            "# TYPE vidnova_jobs_failed gauge",
            f"vidnova_jobs_failed {metrics.jobs_by_status.get('failed', 0)}",
            "# HELP vidnova_jobs_cancelled Cancelled pipeline jobs",
            "# TYPE vidnova_jobs_cancelled counter",
            f"vidnova_jobs_cancelled {metrics.jobs_by_status.get('cancelled', 0)}",
            "# HELP vidnova_revenue_vnd Total revenue in VND",
            "# TYPE vidnova_revenue_vnd counter",
            f"vidnova_revenue_vnd {metrics.total_revenue_vnd}",
            "# HELP vidnova_words_consumed Total quota words synthesized",
            "# TYPE vidnova_words_consumed counter",
            f"vidnova_words_consumed {metrics.total_words_consumed or (metrics.total_credits_consumed * 10)}",

            "# HELP vidnova_connected_workers Number of connected Celery workers",
            "# TYPE vidnova_connected_workers gauge",
            f"vidnova_connected_workers {len(queues.connected_workers)}",
            "# HELP vidnova_stuck_jobs Stuck jobs over 30 mins",
            "# TYPE vidnova_stuck_jobs gauge",
            f"vidnova_stuck_jobs {queues.stuck_jobs_count}",
            "# HELP vidnova_total_queued_tasks Total queue depth in redis",
            "# TYPE vidnova_total_queued_tasks gauge",
            f"vidnova_total_queued_tasks {queues.total_queued}",

            "# HELP vidnova_ollama_status Ollama LLM container online status (1=up, 0=down)",
            "# TYPE vidnova_ollama_status gauge",
            f"vidnova_ollama_status {1 if chatbot.ollama_online else 0}",
            "# HELP vidnova_faiss_indexes FAISS indexed project vector databases",
            "# TYPE vidnova_faiss_indexes gauge",
            f"vidnova_faiss_indexes {chatbot.faiss_indexed_projects}",
            "# HELP vidnova_chat_messages Total video Q&A chat messages in system",
            "# TYPE vidnova_chat_messages counter",
            f"vidnova_chat_messages {chatbot.total_chat_messages}",
            "# HELP vidnova_chatbot_tokens_per_second Chatbot token generation rate in tokens/sec",
            "# TYPE vidnova_chatbot_tokens_per_second gauge",
            f"vidnova_chatbot_tokens_per_second {chatbot.last_tokens_per_second}",
            "# HELP vidnova_chatbot_avg_tokens_per_second Chatbot average token generation rate in tokens/sec",
            "# TYPE vidnova_chatbot_avg_tokens_per_second gauge",
            f"vidnova_chatbot_avg_tokens_per_second {chatbot.avg_tokens_per_second}",
            "# HELP vidnova_chatbot_tokens_total Total tokens generated by Ollama LLM",
            "# TYPE vidnova_chatbot_tokens_total counter",
            f"vidnova_chatbot_tokens_total {chatbot.total_tokens_generated}",
            "# HELP vidnova_chatbot_inferences_total Total inference requests processed by Ollama LLM",
            "# TYPE vidnova_chatbot_inferences_total counter",
            f"vidnova_chatbot_inferences_total {chatbot.total_inference_requests}",

            "# HELP vidnova_storage_total_bytes Total media & cache storage used in bytes",
            "# TYPE vidnova_storage_total_bytes gauge",
            f"vidnova_storage_total_bytes {storage.total_size_bytes}",
            "# HELP vidnova_storage_total_files Total media files stored",
            "# TYPE vidnova_storage_total_files gauge",
            f"vidnova_storage_total_files {storage.total_file_count}",
        ])

        for d in storage.directories:
            lines.append(f'vidnova_storage_dir_bytes{{directory="{d.directory}"}} {d.size_bytes}')

        for q in queues.queues:
            lines.append(f'vidnova_queue_depth{{queue="{q.queue_name}"}} {q.depth}')

        if gpu.available:
            lines.extend([
                "# HELP vidnova_gpu_vram_used_mb GPU VRAM used in MB",
                "# TYPE vidnova_gpu_vram_used_mb gauge",
                f"vidnova_gpu_vram_used_mb {gpu.used_memory_mb or 0}",
                "# HELP vidnova_gpu_vram_total_mb GPU total VRAM in MB",
                "# TYPE vidnova_gpu_vram_total_mb gauge",
                f"vidnova_gpu_vram_total_mb {gpu.total_memory_mb or 8192}",
                "# HELP vidnova_gpu_vram_percent GPU VRAM percent used",
                "# TYPE vidnova_gpu_vram_percent gauge",
                f"vidnova_gpu_vram_percent {gpu.memory_percent or 0.0}",
                "# HELP vidnova_gpu_temperature_c GPU temperature in Celsius",
                "# TYPE vidnova_gpu_temperature_c gauge",
                f"vidnova_gpu_temperature_c {gpu.temperature_c or 0}",
                "# HELP vidnova_gpu_utilization_percent GPU core utilization",
                "# TYPE vidnova_gpu_utilization_percent gauge",
                f"vidnova_gpu_utilization_percent {gpu.gpu_utilization_percent or 0}",
            ])
    except Exception as e:
        logger.debug(f"[Metrics] Expose metrics note: {e}")

    return "\n".join(lines) + "\n"

app.include_router(router)
app.include_router(ws_router)
