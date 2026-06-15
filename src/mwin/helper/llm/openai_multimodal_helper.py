import base64
import binascii
import copy
import re
from typing import Any, Callable, cast

from openai.types.chat import ChatCompletionMessageParam
from openai.types.chat.chat_completion_content_part_image_param import ImageURL
from ...logger import logger


_IMAGE_DATA_URL = re.compile(
    r"^data:(image/(?:png|jpeg|gif|webp));base64,(.+)$",
    re.IGNORECASE | re.DOTALL,
)
_UPLOAD_FAILED_URL = "mwin://media/upload-failed"


def prepare_chat_completion_inputs_for_logging(
    inputs: dict[str, Any],
    upload_image: Callable[[bytes, str], str | None],
) -> dict[str, Any]:
    """Return a serializable log copy with inline OpenAI images uploaded.

    The caller's original request is never mutated. HTTP image URLs are left
    unchanged; only supported image data URLs are replaced.
    """
    # Tracking must not replace the data URL passed to the model.
    log_inputs = copy.deepcopy(inputs)
    messages = cast(list[ChatCompletionMessageParam], log_inputs.get("messages", []))
    for message in messages:
        if message["role"] != "user":
            continue
        content = message.get("content")
        if not isinstance(content, list):
            continue
        for part in content:
            if part["type"] == "image_url":
                _replace_inline_image(part["image_url"], upload_image)

    return log_inputs


def _replace_inline_image(
    image_url: ImageURL,
    upload_image: Callable[[bytes, str], str | None],
) -> None:
    """Replace one OpenAI image data URL with its mwin media URL in place.

    Remote HTTP URLs are unchanged. Invalid or failed uploads use a small
    placeholder URL so the step payload never contains the Base64 image.
    """
    url = image_url["url"]
    match = _IMAGE_DATA_URL.match(url)
    if match is None:
        return

    mime_type = match.group(1).lower()
    try:
        image_bytes = base64.b64decode(match.group(2), validate=True)
    except (binascii.Error, ValueError):
        logger.warning("Failed to decode an OpenAI image data URL for tracking.")
        image_url["url"] = _UPLOAD_FAILED_URL
        return

    uploaded_url = upload_image(image_bytes, mime_type)
    if uploaded_url is None:
        logger.warning("Failed to upload an OpenAI image for tracking.")
        # Never fall back to storing the original Base64 payload in the step JSON.
        image_url["url"] = _UPLOAD_FAILED_URL
        return

    image_url["url"] = uploaded_url
