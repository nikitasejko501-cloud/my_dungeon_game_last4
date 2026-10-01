"""
ЗАГРУЗКА КАРТИНКИ ИЗ ОТВЕТА API БЕЗ ОШИБКИ
«cannot identify image file <_io.BytesIO object>».

ЭТОТ ФАЙЛ — ГОТОВОЕ ИСПРАВЛЕНИЕ. В самом игровом проекте (TS/React) Python-кода
нет, поэтому ошибку надо править в том скрипте, который её бросает. Ниже —
корректная функция: она понимает и «сырые» байты изображения, и текст в Base64,
и data-URL (`data:image/png;base64,...`), проверяет размер ответа и даёт
понятную ошибку вместо загадочного `cannot identify image file`.
"""

from __future__ import annotations

import base64
import io
from typing import Union

from PIL import Image, UnidentifiedImageError


def _looks_like_base64_text(data: bytes) -> bool:
    """Похоже ли содержимое на ТЕКСТ base64, а не на бинарный файл картинки."""
    head = data[:64].lstrip()
    if head.startswith(b"data:"):          # data-URL
        return True
    # PNG/JPEG/GIF/WebP/BMP начинаются с известных «магических» байт.
    if head[:8] == b"\x89PNG\r\n\x1a\n":
        return False
    if head[:3] == b"\xff\xd8\xff":         # JPEG
        return False
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return False
    if head[:4] == b"RIFF":                 # WebP (RIFF....WEBP)
        return False
    if head[:2] == b"BM":                   # BMP
        return False
    # Иначе считаем это base64-строкой, если алфавит похож.
    import re
    return bool(re.fullmatch(rb"[A-Za-z0-9+/=\s]{16,}", data[:512]))


def decode_image_bytes(payload: Union[bytes, str], *, min_bytes: int = 32) -> bytes:
    """
    Приводит ответ API к ЧИСТЫМ БАЙТАМ изображения.

    Порядок важен именно такой:
      1) data-URL  -> берём часть после первой запятой;
      2) base64-текст -> base64.b64decode(...);
      3) сырые байты картинки -> возвращаем как есть.

    Плюс проверка размера: пустой/микроскопический ответ даёт понятную
    ошибку заранее, а не «cannot identify image file» внутри Pillow.
    """
    if payload is None:
        raise ValueError("Пустой ответ: payload = None")

    if isinstance(payload, str):
        raw_text = payload
        if raw_text.startswith("data:"):
            raw_text = raw_text.split(",", 1)[1]
        data = base64.b64decode(raw_text, validate=False)
    else:
        data = payload
        # Текст base64 мог прийти как bytes (например, из JSON-строки).
        if _looks_like_base64_text(data):
            text = data.strip()
            if text.startswith(b"data:"):
                text = text.split(b",", 1)[1]
            data = base64.b64decode(text, validate=False)

    if not data or len(data) < min_bytes:
        raise ValueError(
            f"Слишком маленький ответ изображения: {len(data)} байт "
            f"(нужно >= {min_bytes}). Похоже, API вернул не картинку."
        )
    return data


def open_image(payload: Union[bytes, str]) -> Image.Image:
    """
    Правильный Image.open() с предварительным декодированием Base64.

    Если ваш код падал на `Image.open(io.BytesIO(response.content))`, замените
    его на `img = open_image(response.content)` — этого достаточно.
    """
    data = decode_image_bytes(payload)
    try:
        img = Image.open(io.BytesIO(data))
        img.load()          # принудительно читаем пиксели — ошибки всплывут здесь
        return img
    except UnidentifiedImageError as exc:
        raise ValueError(
            "Не удалось распознать изображение даже после декодирования. "
            f"Первые байты: {data[:12]!r}. "
            "Проверьте, что API вернул именно картинку, а не JSON с ошибкой."
        ) from exc


# --- Пример использования ---------------------------------------------------
if __name__ == "__main__":
    # pytest-подобные проверки без внешних зависимостей.
    from PIL import Image as _I

    buf = io.BytesIO()
    _I.new("RGB", (4, 4), (255, 0, 0)).save(buf, format="PNG")
    png_bytes = buf.getvalue()

    # 1) сырые байты
    assert open_image(png_bytes).size == (4, 4)
    # 2) base64-строка
    assert open_image(base64.b64encode(png_bytes).decode()).size == (4, 4)
    # 3) data-URL
    assert open_image("data:image/png;base64," + base64.b64encode(png_bytes).decode()).size == (4, 4)
    # 4) пустой ответ -> понятная ошибка, а не «cannot identify image file»
    try:
        open_image(b"")
        raise AssertionError("ожидалась ошибка на пустом ответе")
    except ValueError:
        pass
    print("все проверки decode_image_bytes пройдены")
