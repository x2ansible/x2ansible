from pydantic import BaseModel

class ClassifyRequest(BaseModel):
    code: str
