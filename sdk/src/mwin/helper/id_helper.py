"""Generate id for step, trace and conversation
In the early days AITrace use a simple id generation method. In the later AITrace will adapt a better method.

Current id generation version is using uuid7, a time-sensitive uuid generation method.
It can be infered when generate from uuid itself. 
"""

from uuid import UUID
from datetime import datetime, timezone, timedelta

from uuid6 import uuid7

def generate_id() -> str:
    return str(uuid7())

def get_datetime_from_uuid7(u: UUID | str, timedelta_hours:int=8) -> datetime:
    """get datetime from uuid7
    
    Args:
        u(UUID | str): uuid
        timedelta_hours(int): time delta hours. Default to 8. (China time delta)
    
    Returns:
        datetime: datetime that create uuid.
    """

    if isinstance(u, str):
        u = UUID(u)

    timestamp_ms = int.from_bytes(u.bytes[0:6], byteorder='big')
    # Convert to datetime with timezone
    return datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone(timedelta(hours=timedelta_hours)))

if __name__ == "__main__":
    id = generate_id()
    print(f"UUID: {id}")
    print(f"Timestamp: {get_datetime_from_uuid7(id)}")
    print(f"Current time: {datetime.now(timezone(timedelta(hours=8)))}")