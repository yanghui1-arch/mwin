from typing import Literal
from typing_extensions import override

class StreamConsumed:

    def __bool__(self) -> Literal[False]:
        return False
    
    @override
    def __repr__(self):
        return "StreamConsumed"
    
STREAM_CONSUMED = StreamConsumed()
