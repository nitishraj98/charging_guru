"""Gunicorn config for production: uvicorn workers under gunicorn."""
import multiprocessing
import os

bind = os.getenv("CG_BIND", "0.0.0.0:8000")
workers = int(os.getenv("CG_WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = "uvicorn.workers.UvicornWorker"
timeout = int(os.getenv("CG_TIMEOUT", "60"))
graceful_timeout = 30
keepalive = 5
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("CG_LOG_LEVEL", "info")
