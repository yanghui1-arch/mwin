"""Unit tests for src.api.schemas.response.ResponseModel

Covers:
  - success(): code=200, default/custom message, data storage.
  - error(): code=400, message stored, data is None.
  - Default values on a bare instance.
  - Works with various data types (str, int, list, None).
"""
from __future__ import annotations

import pytest

from src.api.schemas.response import ResponseModel


class TestResponseModelSuccess:
    def test_success_sets_code_200(self):
        resp = ResponseModel.success(data="hello")
        assert resp.code == 200

    def test_success_uses_default_success_message(self):
        resp = ResponseModel.success(data="hello")
        assert resp.message == "Success"

    def test_success_custom_message_overrides_default(self):
        resp = ResponseModel.success(data="hello", message="All good")
        assert resp.message == "All good"

    def test_success_stores_string_data(self):
        resp = ResponseModel.success(data="result text")
        assert resp.data == "result text"

    def test_success_stores_int_data(self):
        resp = ResponseModel.success(data=42)
        assert resp.data == 42

    def test_success_stores_list_data(self):
        resp = ResponseModel.success(data=[1, 2, 3])
        assert resp.data == [1, 2, 3]

    def test_success_stores_dict_data(self):
        resp = ResponseModel.success(data={"key": "value"})
        assert resp.data == {"key": "value"}

    def test_success_with_none_data(self):
        resp = ResponseModel.success(data=None)
        assert resp.data is None
        assert resp.code == 200

    def test_success_returns_response_model_instance(self):
        resp = ResponseModel.success(data="x")
        assert isinstance(resp, ResponseModel)


class TestResponseModelError:
    def test_error_sets_code_400(self):
        resp = ResponseModel.error(message="Something failed")
        assert resp.code == 400

    def test_error_stores_message(self):
        resp = ResponseModel.error(message="Not found")
        assert resp.message == "Not found"

    def test_error_has_no_data(self):
        resp = ResponseModel.error(message="oops")
        assert resp.data is None

    def test_error_returns_response_model_instance(self):
        resp = ResponseModel.error(message="err")
        assert isinstance(resp, ResponseModel)

    def test_error_empty_string_message(self):
        resp = ResponseModel.error(message="")
        assert resp.code == 400
        assert resp.message == ""

    def test_error_long_message(self):
        long_msg = "x" * 1000
        resp = ResponseModel.error(message=long_msg)
        assert resp.message == long_msg


class TestResponseModelDefaults:
    def test_default_code_is_zero(self):
        resp = ResponseModel()
        assert resp.code == 0

    def test_default_message_is_ok(self):
        resp = ResponseModel()
        assert resp.message == "ok"

    def test_default_data_is_none(self):
        resp = ResponseModel()
        assert resp.data is None

    def test_explicit_construction(self):
        resp = ResponseModel(code=500, message="Internal error", data=None)
        assert resp.code == 500
        assert resp.message == "Internal error"
        assert resp.data is None

    def test_success_and_error_codes_are_distinct(self):
        success = ResponseModel.success(data="ok")
        error = ResponseModel.error(message="fail")
        assert success.code != error.code

    def test_response_model_generic_type_annotation(self):
        """ResponseModel[list] should work identically to ResponseModel."""
        resp = ResponseModel[list].success(data=[1, 2])
        assert resp.data == [1, 2]
        assert resp.code == 200

    def test_success_with_empty_string_message_uses_default(self):
        """success(message='') — empty string is falsy, so it falls back to 'Success'."""
        resp = ResponseModel.success(data="x", message="")
        assert resp.message == "Success"

    def test_success_with_none_message_uses_default(self):
        """success(message=None) is the same as omitting the argument."""
        resp_explicit = ResponseModel.success(data="x", message=None)
        resp_default = ResponseModel.success(data="x")
        assert resp_explicit.message == resp_default.message == "Success"
