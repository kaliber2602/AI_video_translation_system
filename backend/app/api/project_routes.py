from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import get_db, DatabaseSession
from app.core.security import get_user_id_from_token
from app.schemas.asset import ProjectAssetsResponse
from app.schemas.project import (
    ProjectCreateRequest,
    ProjectFavoriteResponse,
    ProjectMemberAddRequest,
    ProjectMemberResponse,
    ProjectMemberUpdateRequest,
    ProjectResponse,
    ProjectUpdateRequest,
)
from app.schemas.folder import (
    FolderCreateRequest,
    FolderUpdateRequest,
    FolderResponse,
)
from app.schemas.tag import TagResponse
from app.services.subscription_service import validate_project_quota
from app.services.project_asset_service import (
    get_project_assets,
    create_project_zip_bundle,
)
from app.services.folder_service import (
    get_project_folders,
    get_folder_by_id,
    create_folder,
    update_folder,
    delete_folder,
)
from app.services.project_service import (
    add_project_member,
    add_project_tag,
    create_project,
    delete_project,
    empty_trash,
    get_project,
    get_project_members,
    get_project_tags,
    get_projects,
    permanent_delete_project,
    remove_project_member,
    remove_project_tag,
    restore_project,
    soft_delete_project,
    toggle_favorite,
    update_project,
    update_project_member_role,
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
    scope: str = Query(default="all", pattern="^(all|favorites|shared|trash)$"),
    user_id: int = Depends(get_current_user_id),
):
    return get_projects(
        owner_id=user_id,
        tag_id=tag_id,
        search=search,
        scope=scope,
    )


# =========================================================
# Empty Trash
# DELETE /api/projects/trash/empty
# =========================================================

@router.delete(
    "/trash/empty",
    status_code=status.HTTP_200_OK,
)
def empty_trash_route(
    user_id: int = Depends(get_current_user_id),
):
    count = empty_trash(owner_id=user_id)
    return {"deleted_count": count, "message": f"Successfully emptied {count} projects from trash."}


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
        user_id=user_id,
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
        user_id=user_id,
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
# Soft Delete Project (Move to Trash)
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
    deleted = soft_delete_project(
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
# Restore Project from Trash
# POST /api/projects/{project_id}/restore
# =========================================================

@router.post(
    "/{project_id}/restore",
    response_model=ProjectResponse,
)
def restore_project_route(
    project_id: int,
    user_id: int = Depends(get_current_user_id),
):
    project = restore_project(
        owner_id=user_id,
        project_id=project_id,
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or not in trash.",
        )

    return project


# =========================================================
# Permanently Delete Project
# DELETE /api/projects/{project_id}/permanent
# =========================================================

@router.delete(
    "/{project_id}/permanent",
    status_code=status.HTTP_204_NO_CONTENT,
)
def permanent_delete_project_route(
    project_id: int,
    user_id: int = Depends(get_current_user_id),
):
    deleted = permanent_delete_project(
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
# Toggle Project Favorite
# POST /api/projects/{project_id}/favorite
# =========================================================

@router.post(
    "/{project_id}/favorite",
    response_model=ProjectFavoriteResponse,
)
def toggle_favorite_route(
    project_id: int,
    user_id: int = Depends(get_current_user_id),
):
    try:
        is_fav = toggle_favorite(
            user_id=user_id,
            project_id=project_id,
        )
        return ProjectFavoriteResponse(
            project_id=project_id,
            is_favorite=is_fav,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


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


# =========================================================
# Get Project Members
# GET /api/projects/{project_id}/members
# =========================================================

@router.get(
    "/{project_id}/members",
    response_model=list[ProjectMemberResponse],
)
def get_project_members_route(
    project_id: int,
    user_id: int = Depends(get_current_user_id),
):
    members = get_project_members(
        user_id=user_id,
        project_id=project_id,
    )

    if members is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied.",
        )

    return members


# =========================================================
# Add Member to Project (Share Project)
# POST /api/projects/{project_id}/members
# =========================================================

@router.post(
    "/{project_id}/members",
    response_model=ProjectMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_project_member_route(
    project_id: int,
    data: ProjectMemberAddRequest,
    user_id: int = Depends(get_current_user_id),
):
    try:
        return add_project_member(
            owner_id=user_id,
            project_id=project_id,
            email=data.email,
            role=data.role,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


# =========================================================
# Update Member Role
# PUT /api/projects/{project_id}/members/{member_id}
# =========================================================

@router.put(
    "/{project_id}/members/{member_id}",
    response_model=ProjectMemberResponse,
)
def update_project_member_role_route(
    project_id: int,
    member_id: int,
    data: ProjectMemberUpdateRequest,
    user_id: int = Depends(get_current_user_id),
):
    updated = update_project_member_role(
        owner_id=user_id,
        project_id=project_id,
        member_id=member_id,
        role=data.role,
    )

    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project member not found or you are not the owner.",
        )

    return updated


# =========================================================
# Remove Member from Project
# DELETE /api/projects/{project_id}/members/{member_id}
# =========================================================

@router.delete(
    "/{project_id}/members/{member_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_project_member_route(
    project_id: int,
    member_id: int,
    user_id: int = Depends(get_current_user_id),
):
    removed = remove_project_member(
        user_id=user_id,
        project_id=project_id,
        member_id=member_id,
    )

    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found or permission denied.",
        )

    return None


# =========================================================
# Project Folders Management
# =========================================================

@router.get(
    "/{project_id}/folders",
    response_model=list[FolderResponse],
    summary="List folders in a project",
)
def list_folders_route(
    project_id: int,
    parent_id: int | None = Query(default=None, description="Optional parent folder ID"),
    user_id: int = Depends(get_current_user_id),
):
    project = get_project(user_id=user_id, project_id=project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    return get_project_folders(project_id=project_id, parent_id=parent_id)


@router.post(
    "/{project_id}/folders",
    response_model=FolderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new folder in a project",
)
def create_folder_route(
    project_id: int,
    data: FolderCreateRequest,
    user_id: int = Depends(get_current_user_id),
):
    project = get_project(user_id=user_id, project_id=project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    return create_folder(project_id=project_id, name=data.name, parent_id=data.parent_id)


@router.put(
    "/{project_id}/folders/{folder_id}",
    response_model=FolderResponse,
    summary="Update folder name or parent",
)
def update_folder_route(
    project_id: int,
    folder_id: int,
    data: FolderUpdateRequest,
    user_id: int = Depends(get_current_user_id),
):
    project = get_project(user_id=user_id, project_id=project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    folder = get_folder_by_id(folder_id)
    if not folder or folder["project_id"] != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")
    updated = update_folder(folder_id=folder_id, name=data.name, parent_id=data.parent_id)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")
    return updated


@router.delete(
    "/{project_id}/folders/{folder_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a folder",
)
def delete_folder_route(
    project_id: int,
    folder_id: int,
    user_id: int = Depends(get_current_user_id),
):
    project = get_project(user_id=user_id, project_id=project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    folder = get_folder_by_id(folder_id)
    if not folder or folder["project_id"] != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")
    delete_folder(folder_id)
    return None


# =========================================================
# Project Assets & Storage Management
# =========================================================

@router.get(
    "/{project_id}/assets",
    response_model=ProjectAssetsResponse,
    summary="List all assets and files in a project",
)
def get_project_assets_route(
    project_id: int,
    folder_id: Optional[int] = Query(None, description="Filter by folder ID"),
    category: Optional[str] = Query(None, description="Filter by category (video, audio, subtitle, transcript, document, speaker_voice)"),
    search: Optional[str] = Query(None, description="Search assets by name or video title"),
    user_id: int = Depends(get_current_user_id),
    db: DatabaseSession = Depends(get_db),
):
    project = get_project(user_id=user_id, project_id=project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    return get_project_assets(
        db=db,
        project_id=project_id,
        folder_id=folder_id,
        category=category,
        search=search,
    )


@router.get(
    "/{project_id}/assets/zip",
    summary="Download project assets as a ZIP archive",
)
def download_project_assets_zip_route(
    project_id: int,
    folder_id: Optional[int] = Query(None, description="Filter by folder ID"),
    user_id: int = Depends(get_current_user_id),
    db: DatabaseSession = Depends(get_db),
):
    project = get_project(user_id=user_id, project_id=project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    zip_buffer = create_project_zip_bundle(
        db=db,
        project_id=project_id,
        folder_id=folder_id,
    )
    safe_name = "".join(c for c in project.get("name", f"project_{project_id}") if c.isalnum() or c in " ._-")
    filename = f"{safe_name}_assets.zip"

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


