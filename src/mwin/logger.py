import os
import argparse
import logging
from logging import Logger
from logging.config import dictConfig
from types import MethodType
from typing import cast
from functools import lru_cache
from collections.abc import Hashable

def parse_args():
    parser = argparse.ArgumentParser(description="AI Track parser")
    parser.add_argument('--log-level', type=str, default='INFO', help='Set log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)')
    return parser.parse_known_args()[0]

# Identify log level
LOG_LEVEL = 'INFO'
if os.environ.get('AT_LOG_LEVEL', None) is not None:
    LOG_LEVEL = os.environ.get('AT_LOG_LEVEL')
else:
    py_args = parse_args()
    LOG_LEVEL = py_args.log_level.upper()

# Format configuration
AT_LOGGING_PREFIX = "aitrace"

_DETAILED_FORMAT = (
    f"%(asctime)s [%(process)d-%(processName)s:%(thread)d] %(relativeCreated)d AT %(levelname)s [%(filename)s:%(lineno)d]: %(message)s"
)

_SIMPLED_FORMAT = f"{AT_LOGGING_PREFIX}: %(message)s"
_DATE_FORMAT = "%m-%d %H:%M:%S"

CONSOLE_LOG_FORMAT = 'simpled'
if LOG_LEVEL == 'DEBUG':
    CONSOLE_LOG_FORMAT = 'detailed'

# root logging configuration
DEFAULT_LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        'simpled': {
            'format': _SIMPLED_FORMAT,
            'datefmt': _DATE_FORMAT,
        },
        'detailed': {
            'format': _DETAILED_FORMAT,
            'datefmt': _DATE_FORMAT,
        },
    },
    "handlers": {
        "console": {
            'class': 'logging.StreamHandler',
            'formatter': CONSOLE_LOG_FORMAT,
            'level': LOG_LEVEL,
        },
    },
    'loggers': {
        '': {
            'handlers': ['console'],
            'level': LOG_LEVEL,
        },
    },
}

@lru_cache
def _print_info_once(logger: Logger, msg: str, *args: Hashable):
    # Set the stacklevel to 3 to print the original caller's line info
    logger.debug(msg, *args, stacklevel=3)

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
        _print_info_once(self, msg, *args)

    def warn_once(self, msg: str, *args: Hashable):
        _print_warn_once(self, msg, *args)

def _configure_root_logger():
    dictConfig(DEFAULT_LOGGING_CONFIG)

def init_logger():
    """Initialize logger"""
    
    logger = logging.getLogger("aitrace")
    setattr(logger, 'debug_once', MethodType(ATLogger.debug_once, logger))
    setattr(logger, 'info_once', MethodType(ATLogger.info_once, ATLogger.info_once))
    setattr(logger, 'warn_once', MethodType(ATLogger.warn_once, ATLogger.warn_once))
    return cast(ATLogger, logger)

_configure_root_logger()

logger = init_logger()
