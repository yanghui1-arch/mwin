"""Tests for mwin.logger — verifies SDK-safe logging behaviour."""

import logging

import pytest

from mwin.logger import logger


def test_null_handler_present():
    aitrace = logging.getLogger("aitrace")
    assert any(isinstance(h, logging.NullHandler) for h in aitrace.handlers)


def test_no_stream_handlers_by_default():
    aitrace = logging.getLogger("aitrace")
    stream_handlers = [h for h in aitrace.handlers if isinstance(h, logging.StreamHandler)
                       and not isinstance(h, logging.NullHandler)]
    assert stream_handlers == [], "SDK must not attach stream handlers to the aitrace logger"


def test_output_visible_at_debug_when_enabled(caplog):
    with caplog.at_level(logging.DEBUG, logger="aitrace"):
        logger.debug("debug message")
    assert "debug message" in caplog.text


def test_debug_once_deduplicates(caplog):
    with caplog.at_level(logging.DEBUG, logger="aitrace"):
        logger.debug_once("unique once msg %s", "x")
        logger.debug_once("unique once msg %s", "x")
    assert caplog.text.count("unique once msg x") == 1


def test_warn_once_deduplicates(caplog):
    with caplog.at_level(logging.WARNING, logger="aitrace"):
        logger.warn_once("unique warn msg %s", "y")
        logger.warn_once("unique warn msg %s", "y")
    assert caplog.text.count("unique warn msg y") == 1
