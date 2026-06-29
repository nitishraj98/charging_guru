"""UUIDv7 generation (time-sortable, non-enumerable).

Python's stdlib gains ``uuid7`` only in 3.14; we implement the RFC 9562
layout here so public entity IDs are k-sortable on all supported versions.
"""
from __future__ import annotations

import os
import time
import uuid


def uuid7() -> uuid.UUID:
    """Return a UUIDv7: 48-bit ms timestamp + version/variant + random."""
    unix_ms = int(time.time() * 1000)
    rand = os.urandom(10)  # 80 random bits

    b = bytearray(16)
    b[0] = (unix_ms >> 40) & 0xFF
    b[1] = (unix_ms >> 32) & 0xFF
    b[2] = (unix_ms >> 24) & 0xFF
    b[3] = (unix_ms >> 16) & 0xFF
    b[4] = (unix_ms >> 8) & 0xFF
    b[5] = unix_ms & 0xFF
    # version 7 in high nibble of byte 6
    b[6] = 0x70 | (rand[0] & 0x0F)
    b[7] = rand[1]
    # variant (10xx) in top bits of byte 8
    b[8] = 0x80 | (rand[2] & 0x3F)
    b[9:16] = rand[3:10]
    return uuid.UUID(bytes=bytes(b))
