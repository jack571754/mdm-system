from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core.security import verify_password, create_access_token
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserOut
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/auth", tags=["认证鉴权"])


@router.post("/login", response_model=ApiResponse[TokenResponse], summary="用户登录")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """User login endpoint returning JWT token upon successful authentication."""
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名或密码错误",
        )

    if not user.is_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="该账号已被禁用，请联系管理员",
        )

    token = create_access_token(
        subject=user.username,
        claims={"role": user.role, "user_id": user.id}
    )

    return ApiResponse(
        code=200,
        message="登录成功",
        data=TokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserOut.model_validate(user)
        )
    )


@router.get("/me", response_model=ApiResponse[UserOut], summary="获取当前用户信息")
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Retrieve profile and role info for currently authenticated user."""
    return ApiResponse(
        code=200,
        message="success",
        data=UserOut.model_validate(current_user)
    )
