from typing import Annotated

from fastapi import Depends, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_token
from app.crud import user as user_crud
from app.db.session import get_db
from app.models.user import User

DbSession = Annotated[Session, Depends(get_db)]

_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)] = None,
) -> User:
    if credentials is None:
        raise UnauthorizedError("ต้องเข้าสู่ระบบก่อนใช้งาน")

    payload = decode_token(credentials.credentials, expected_type="access")
    user = user_crud.get_by_id(db, payload["sub"])
    if user is None:
        raise UnauthorizedError("ไม่พบผู้ใช้งานนี้ในระบบ")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_admin(current_user: CurrentUser) -> User:
    if current_user.role != "admin":
        raise ForbiddenError("ต้องเป็นผู้ดูแลระบบเท่านั้น")
    return current_user


AdminUser = Annotated[User, Depends(require_admin)]


class PageParams:
    def __init__(
        self,
        page: Annotated[int, Query(ge=1)] = 1,
        page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    ):
        self.page = page
        self.page_size = page_size


Pagination = Annotated[PageParams, Depends()]
