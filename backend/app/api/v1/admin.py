import json
from datetime import datetime, timezone
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.enum_config import EnumConfig
from app.models.user import User
from app.models.sync import AppConfig
from app.core.security import hash_password
from app.api.deps import require_roles
from app.schemas.common import ApiResponse
from app.schemas.admin import (
    EnumConfigResponse,
    EnumConfigCreate,
    EnumConfigUpdate,
    UserAdminResponse,
    UserAdminCreate,
    UserAdminUpdate,
    AppConfigResponse,
    AppConfigUpdate,
)

router = APIRouter(prefix="/admin", tags=["System Administration"])


# ===================== Enum Configs =====================

@router.get("/enums", response_model=ApiResponse[List[EnumConfigResponse]])
def list_enum_configs(
    domain: Optional[str] = Query(None),
    field_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    query = db.query(EnumConfig)
    if domain:
        query = query.filter(EnumConfig.domain == domain)
    if field_name:
        query = query.filter(EnumConfig.field_name == field_name)
    enums = query.order_by(EnumConfig.domain, EnumConfig.field_name, EnumConfig.sort_order).all()
    return ApiResponse(code=200, message="success", data=[EnumConfigResponse.model_validate(e) for e in enums])


@router.post("/enums", response_model=ApiResponse[EnumConfigResponse])
def create_enum_config(
    payload: EnumConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    # Check if duplicate value in domain and field
    existing = db.query(EnumConfig).filter(
        EnumConfig.domain == payload.domain,
        EnumConfig.field_name == payload.field_name,
        EnumConfig.value == payload.value.strip(),
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"枚举项 '{payload.value}' 已存在")

    enum_item = EnumConfig(
        domain=payload.domain,
        field_name=payload.field_name,
        value=payload.value.strip(),
        sort_order=payload.sort_order,
        is_enabled=payload.is_enabled,
    )
    db.add(enum_item)
    db.commit()
    db.refresh(enum_item)
    return ApiResponse(code=200, message="添加枚举项成功", data=EnumConfigResponse.model_validate(enum_item))


@router.put("/enums/{id}", response_model=ApiResponse[EnumConfigResponse])
def update_enum_config(
    id: int,
    payload: EnumConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    item = db.query(EnumConfig).filter(EnumConfig.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="未找到指定的枚举配置")

    if payload.value is not None:
        item.value = payload.value.strip()
    if payload.sort_order is not None:
        item.sort_order = payload.sort_order
    if payload.is_enabled is not None:
        item.is_enabled = payload.is_enabled

    db.commit()
    db.refresh(item)
    return ApiResponse(code=200, message="更新枚举项成功", data=EnumConfigResponse.model_validate(item))


@router.delete("/enums/{id}", response_model=ApiResponse[dict])
def delete_enum_config(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    item = db.query(EnumConfig).filter(EnumConfig.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="未找到指定的枚举配置")
    db.delete(item)
    db.commit()
    return ApiResponse(code=200, message="删除枚举项成功", data={"id": id})


# ===================== User Management =====================

@router.get("/users", response_model=ApiResponse[List[UserAdminResponse]])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    users = db.query(User).order_by(User.id).all()
    return ApiResponse(code=200, message="success", data=[UserAdminResponse.model_validate(u) for u in users])


@router.post("/users", response_model=ApiResponse[UserAdminResponse])
def create_user(
    payload: UserAdminCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    existing = db.query(User).filter(User.username == payload.username.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"用户名 '{payload.username}' 已被占用")

    if payload.role not in ("admin", "operator", "api"):
        raise HTTPException(status_code=400, detail="角色仅限: admin, operator, api")

    user = User(
        username=payload.username.strip(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_enabled=payload.is_enabled,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return ApiResponse(code=200, message="创建用户成功", data=UserAdminResponse.model_validate(user))


@router.put("/users/{id}", response_model=ApiResponse[UserAdminResponse])
def update_user(
    id: int,
    payload: UserAdminUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="未找到指定用户")

    if payload.password:
        user.password_hash = hash_password(payload.password)
    if payload.role:
        if payload.role not in ("admin", "operator", "api"):
            raise HTTPException(status_code=400, detail="角色仅限: admin, operator, api")
        user.role = payload.role
    if payload.is_enabled is not None:
        # Prevent disabling the current admin
        if user.id == current_user.id and not payload.is_enabled:
            raise HTTPException(status_code=400, detail="不能禁用当前登录的管理员账号")
        user.is_enabled = payload.is_enabled

    db.commit()
    db.refresh(user)
    return ApiResponse(code=200, message="更新用户成功", data=UserAdminResponse.model_validate(user))


# ===================== System Configs (Authority Priorities) =====================

@router.get("/configs", response_model=ApiResponse[List[AppConfigResponse]])
def list_app_configs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    configs = db.query(AppConfig).all()
    results = []
    for c in configs:
        parsed_val = c.value
        try:
            parsed_val = json.loads(c.value)
        except Exception:
            pass
        results.append(
            AppConfigResponse(
                key=c.key,
                value=parsed_val,
                description=c.description,
                updated_at=c.updated_at,
            )
        )
    return ApiResponse(code=200, message="success", data=results)


@router.put("/configs/{key}", response_model=ApiResponse[AppConfigResponse])
def update_app_config(
    key: str,
    payload: AppConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    cfg = db.query(AppConfig).filter(AppConfig.key == key).first()
    raw_val = payload.value if isinstance(payload.value, str) else json.dumps(payload.value, ensure_ascii=False)
    now = datetime.now(timezone.utc)

    if not cfg:
        cfg = AppConfig(
            key=key,
            value=raw_val,
            description=payload.description,
            updated_at=now,
        )
        db.add(cfg)
    else:
        cfg.value = raw_val
        if payload.description:
            cfg.description = payload.description
        cfg.updated_at = now

    db.commit()
    db.refresh(cfg)

    parsed_val = cfg.value
    try:
        parsed_val = json.loads(cfg.value)
    except Exception:
        pass

    return ApiResponse(
        code=200,
        message="配置更新成功",
        data=AppConfigResponse(
            key=cfg.key,
            value=parsed_val,
            description=cfg.description,
            updated_at=cfg.updated_at,
        )
    )
