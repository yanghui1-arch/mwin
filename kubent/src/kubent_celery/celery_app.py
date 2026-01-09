from celery import Celery

celery_app = Celery(
    "worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
)

celery_app.conf.update(
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_reject_on_worker_lost=True,
    task_track_started=True,
    result_expires=3600,     
)

celery_app.set_default()
celery_app.autodiscover_tasks(["src.kubent_celery.tasks"])