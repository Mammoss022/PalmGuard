from pydantic import BaseModel


class ErrorDetail(BaseModel):
    field: str | None = None
    issue: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] | None = None


class ErrorResponse(BaseModel):
    """Matches the error envelope in docs/API.md#error-response-format."""

    error: ErrorBody
