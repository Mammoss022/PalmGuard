import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1 import api_router
from app.core.config import settings
from app.core.exceptions import AppError

logger = logging.getLogger("palmguard")

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dev-only stand-in for Object Storage — see app/services/storage.py. Only
# mounted for STORAGE_BACKEND=local: STORAGE_DIR is never created (and would
# be empty/ephemeral anyway) when STORAGE_BACKEND=supabase, and StaticFiles
# raises at startup if the directory doesn't exist.
if settings.STORAGE_BACKEND == "local":
    app.mount("/media", StaticFiles(directory=settings.STORAGE_DIR), name="media")

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


def _error_envelope(code: str, message: str, details: list[dict] | None = None) -> dict:
    body: dict = {"code": code, "message": message}
    if details:
        body["details"] = details
    return {"error": body}


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_envelope(exc.code, exc.message, exc.details),
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    details = [
        {"field": ".".join(str(p) for p in err["loc"] if p != "body"), "issue": err["msg"]}
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_error_envelope("VALIDATION_ERROR", "ข้อมูลที่ส่งมาไม่ถูกต้อง", details),
    )


_STATUS_CODE_TO_CODE = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    413: "PAYLOAD_TOO_LARGE",
}


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = _STATUS_CODE_TO_CODE.get(exc.status_code, "HTTP_ERROR")
    message = exc.detail if isinstance(exc.detail, str) else "เกิดข้อผิดพลาด"
    return JSONResponse(status_code=exc.status_code, content=_error_envelope(code, message))


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error while processing %s %s", request.method, request.url)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_envelope("INTERNAL_SERVER_ERROR", "เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์"),
    )


@app.get("/health", tags=["health"])
def health_check() -> dict:
    return {"status": "ok"}
