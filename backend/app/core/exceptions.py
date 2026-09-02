"""App-level errors that map 1:1 onto the error envelope in docs/API.md:

    { "error": { "code": "...", "message": "...", "details": [...] } }

Raise these from routers/services; the handler registered in app/main.py
converts them to the JSON envelope with the right HTTP status code.
"""

from __future__ import annotations


class AppError(Exception):
    status_code: int = 400
    code: str = "BAD_REQUEST"

    def __init__(self, message: str, details: list[dict] | None = None):
        self.message = message
        self.details = details
        super().__init__(message)


class BadRequestError(AppError):
    status_code = 400
    code = "BAD_REQUEST"


class ValidationAppError(AppError):
    status_code = 422
    code = "VALIDATION_ERROR"


class UnauthorizedError(AppError):
    status_code = 401
    code = "UNAUTHORIZED"


class ForbiddenError(AppError):
    status_code = 403
    code = "FORBIDDEN"


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"


class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"
