from celery import Celery
from celery.signals import worker_init

from src.repository.redis import get_redis_config

_redis_cfg = get_redis_config()

celery_app = Celery(
    "worker",
    broker=_redis_cfg.build_url(db_override=1),
    backend=_redis_cfg.build_url(db_override=2),
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


@worker_init.connect
def setup_worker(**kwargs):
    from ..repository.redis import init_redis_pool
    from ..sandbox import init_docker_client, init_sandbox_manager
    init_redis_pool()
    docker_client = init_docker_client()
    init_sandbox_manager(capacity=64, docker_client=docker_client)