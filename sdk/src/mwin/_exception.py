
class APIKeyException(Exception):
    def __init__(self, error_msg: str, url: str | None =None):
        super().__init__(error_msg)
        self.url = url
    
    def __str__(self):
        error_msg = super().__str__()
        if self.url:
            return error_msg + f"(Pass url: {self.url})"
        return error_msg + f"(Pass url: None)"

class CallingSDKNotFoundException(Exception):
    def __init__(self, error_msg: str | None = None, provider: str | None = None):
        if error_msg is None:
            error_msg = "In this function, no calls to methods traceable by AITrace can be found. " \
            "Currently, the only traceable method supported by AITrace is openai.chat.completions.create()."
            
        super().__init__(error_msg)
        self.provider = provider
    
    def __str__(self):
        error_msg = super().__str__()
        if self.provider:
            return error_msg + f" (Pass provider: {self.provider})"
        return error_msg + f"(Pass provider: None)"
