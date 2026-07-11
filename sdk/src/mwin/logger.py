import logging
from logging import Logger
from types import MethodType
from typing import cast
from functools import lru_cache
from collections.abc import Hashable

@lru_cache
def _print_debug_once(logger: Logger, msg: str, *args: Hashable):
    logger.debug(msg, *args, stacklevel=3)

@lru_cache
def _print_warn_once(logger: Logger, msg: str, *args: Hashable):
    logger.warning(msg, *args, stacklevel=3)

# Offer only once log
class ATLogger(Logger):

    def debug_once(self, msg: str, *args: Hashable):
        _print_debug_once(self, msg, *args)

    def info_once(self, msg: str, *args: Hashable):
        _print_debug_once(self, msg, *args)

    def warn_once(self, msg: str, *args: Hashable):
        _print_warn_once(self, msg, *args)

def init_logger():
    """Initialize logger. As an SDK, we add only a NullHandler and let the
    application control whether/how aitrace logs are displayed."""

    logger = logging.getLogger("aitrace")
    logger.addHandler(logging.NullHandler())
    setattr(logger, 'debug_once', MethodType(ATLogger.debug_once, logger))
    setattr(logger, 'info_once', MethodType(ATLogger.info_once, logger))
    setattr(logger, 'warn_once', MethodType(ATLogger.warn_once, logger))
    return cast(ATLogger, logger)

logger = init_logger()
