from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import get_user_id_from_token
from app.schemas.tag import (
    TagCreateRequest,
    TagResponse,
    TagUpdateRequest,
)
from app.services.tag_service import (
    create_tag,
    delete_tag,
    get_tag,
    get_tags,
    update_tag,
)


router = APIRouter(
    prefix="/tags",
    tags=["Tags"],
)


# =========================================================
# Security
# =========================================================

bearer_scheme = HTTPBearer()


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
) -> int:

    token = credentials.credentials

    try:
        return get_user_id_from_token(
            token,
            "access",
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        ) from exc


# =========================================================
# Create Tag
# POST /api/tags
# =========================================================

@router.post(
    "",
    response_model=TagResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_tag_route(
    data: TagCreateRequest,
    user_id: int = Depends(get_current_user_id),
):
    try:
        return create_tag(
            user_id=user_id,
            name=data.name.strip(),
            color=data.color,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


# =========================================================
# Get All Tags
# GET /api/tags
# =========================================================

@router.get(
    "",
    response_model=list[TagResponse],
)
def get_tags_route(
    user_id: int = Depends(get_current_user_id),
):
    return get_tags(
        user_id=user_id,
    )


# =========================================================
# Get Tag By ID
# GET /api/tags/{tag_id}
# =========================================================

@router.get(
    "/{tag_id}",
    response_model=TagResponse,
)
def get_tag_route(
    tag_id: int,
    user_id: int = Depends(get_current_user_id),
):
    tag = get_tag(
        user_id=user_id,
        tag_id=tag_id,
    )

    if tag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found.",
        )

    return tag


# =========================================================
# Update Tag
# PUT /api/tags/{tag_id}
# =========================================================

@router.put(
    "/{tag_id}",
    response_model=TagResponse,
)
def update_tag_route(
    tag_id: int,
    data: TagUpdateRequest,
    user_id: int = Depends(get_current_user_id),
):
    try:
        tag = update_tag(
            user_id=user_id,
            tag_id=tag_id,
            name=data.name.strip(),
            color=data.color,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    if tag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found.",
        )

    return tag


# =========================================================
# Delete Tag
# DELETE /api/tags/{tag_id}
# =========================================================

@router.delete(
    "/{tag_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_tag_route(
    tag_id: int,
    user_id: int = Depends(get_current_user_id),
):
    deleted = delete_tag(
        user_id=user_id,
        tag_id=tag_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found.",
        )

    return None