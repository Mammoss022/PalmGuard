from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.crud import user as user_crud
from app.schemas.user import UserResponse, UserUpdateRequest

router = APIRouter()


@router.get("/me", response_model=UserResponse)
def read_me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
def update_me(payload: UserUpdateRequest, current_user: CurrentUser, db: DbSession) -> UserResponse:
    user = user_crud.update_profile(
        db,
        current_user,
        full_name=payload.full_name,
        phone_number=payload.phone_number,
    )
    return UserResponse.model_validate(user)
