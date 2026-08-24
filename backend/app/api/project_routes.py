from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import get_user_id_from_token
from app.schemas.project import (
    ProjectCreateRequest,
    ProjectResponse,
    ProjectUpdateRequest,
)
from app.schemas.tag import TagResponse
from app.services.subscription_service import validate_project_quota
from app.services.project_service import (
    add_project_tag,
    create_project,
    delete_project,
    get_project,
    get_project_tags,
    get_projects,
    remove_project_tag,
    update_project,
)


router = APIRouter(
    prefix="/projects",
    tags=["Projects"],
)


# =========================================================
# Security
# =========================================================

bearer_scheme = HTTPBearer()


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> int:
    token = credentials.credentials
    try:
        return get_user_id_from_token(token, "access")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


# =========================================================
# Create Project
# POST /api/projects
# =========================================================

@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_project_route(
    data: ProjectCreateRequest,
    user_id: int = Depends(get_current_user_id),
):
    # Enforce plan project limit quota
    validate_project_quota(user_id)

    try:
        return create_project(
            owner_id=user_id,
            name=data.name.strip(),
            description=data.description,
            cover_path=data.cover_path,
            tag_ids=data.tag_ids,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


# =========================================================
# Get All Projects for Authenticated User
# GET /api/projects
# =========================================================

@router.get(
    "",
    response_model=list[ProjectResponse],
)
def get_projects_route(
    tag_id: int | None = Query(default=None),
    search: str | None = Query(default=None),
    user_id: int = Depends(get_current_user_id),
):
    return get_projects(
        owner_id=user_id,
        tag_id=tag_id,
        search=search,
    )


# =========================================================
# Get Project Detail
# GET /api/projects/{project_id}
# =========================================================

@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
)
def get_project_route(
    project_id: int,
    user_id: int = Depends(get_current_user_id),
):
    project = get_project(
        owner_id=user_id,
        project_id=project_id,
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    return project


# =========================================================
# Update Project
# PUT /api/projects/{project_id}
# =========================================================

@router.put(
    "/{project_id}",
    response_model=ProjectResponse,
)
def update_project_route(
    project_id: int,
    data: ProjectUpdateRequest,
    user_id: int = Depends(get_current_user_id),
):
    project = update_project(
        owner_id=user_id,
        project_id=project_id,
        name=data.name,
        description=data.description,
        cover_path=data.cover_path,
        status=data.status,
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    return project


# =========================================================
# Delete Project
# DELETE /api/projects/{project_id}
# =========================================================

@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_project_route(
    project_id: int,
    user_id: int = Depends(get_current_user_id),
):
    deleted = delete_project(
        owner_id=user_id,
        project_id=project_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    return None


# =========================================================
# Get Project Tags
# GET /api/projects/{project_id}/tags
# =========================================================

@router.get(
    "/{project_id}/tags",
    response_model=list[TagResponse],
)
def get_project_tags_route(
    project_id: int,
    user_id: int = Depends(get_current_user_id),
):
    tags = get_project_tags(
        owner_id=user_id,
        project_id=project_id,
    )

    if tags is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    return tags


# =========================================================
# Assign Tag to Project
# POST /api/projects/{project_id}/tags/{tag_id}
# =========================================================

@router.post(
    "/{project_id}/tags/{tag_id}",
    response_model=TagResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_project_tag_route(
    project_id: int,
    tag_id: int,
    user_id: int = Depends(get_current_user_id),
):
    try:
        tag = add_project_tag(
            owner_id=user_id,
            project_id=project_id,
            tag_id=tag_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    if tag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    return tag


# =========================================================
# Remove Tag from Project
# DELETE /api/projects/{project_id}/tags/{tag_id}
# =========================================================

@router.delete(
    "/{project_id}/tags/{tag_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_project_tag_route(
    project_id: int,
    tag_id: int,
    user_id: int = Depends(get_current_user_id),
):
    removed = remove_project_tag(
        owner_id=user_id,
        project_id=project_id,
        tag_id=tag_id,
    )

    if removed is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag was not assigned to this project.",
        )

    return None
