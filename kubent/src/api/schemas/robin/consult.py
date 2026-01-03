from pydantic import BaseModel, Field

class ConsultRequest(BaseModel):
    question: str
    user_uuid: str
    session_id: str = Field(..., description="Chat session uuid in string format. It's temporary. It will be deprecated while using Redis.")
    project_name: str
    agent_name: str

class ConsultResponse(BaseModel):
    message: str