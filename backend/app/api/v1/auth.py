from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.crud import user as user_crud
from app.schemas.auth import (
    AccessTokenResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserResponse

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbSession) -> UserResponse:
    if user_crud.get_by_email(db, payload.email) is not None:
        raise ConflictError("อีเมลนี้ถูกใช้งานแล้ว")

    user = user_crud.create(
        db,
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        phone_number=payload.phone_number,
    )
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession) -> TokenResponse:
    user = user_crud.get_by_email(db, payload.email)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise UnauthorizedError("อีเมลหรือรหัสผ่านไม่ถูกต้อง")

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(payload: RefreshRequest, db: DbSession) -> AccessTokenResponse:
    token_payload = decode_token(payload.refresh_token, expected_type="refresh")
    user = user_crud.get_by_id(db, token_payload["sub"])
    if user is None:
        raise UnauthorizedError("ไม่พบผู้ใช้งานนี้ในระบบ")

    return AccessTokenResponse(access_token=create_access_token(user.id, user.role))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(current_user: CurrentUser) -> None:
    # Stateless: no refresh-token blacklist store exists yet — see
    # docs/API.md's "DECISION REQUIRED" note on this endpoint. The client
    # is responsible for discarding its tokens; nothing to persist here
    # without changing the DB schema.
    return None
