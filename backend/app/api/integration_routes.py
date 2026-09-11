from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.auth_routes import get_current_user_id
from app.schemas.integration import (
    ApiKeyCreate,
    ApiKeyResponse,
    IntegrationAppResponse,
    IntegrationUpdate,
)
from app.services.integration_service import (
    create_user_api_key,
    delete_user_api_key,
    get_user_api_keys,
    get_user_integrations,
    update_user_integration,
)

router = APIRouter(tags=["Integrations & API Keys"])


# =========================================================
# Third-Party Integrations
# =========================================================

@router.get(
    "/integrations",
    response_model=List[IntegrationAppResponse],
    status_code=status.HTTP_200_OK,
)
def list_integrations(
    user_id: int = Depends(get_current_user_id),
):
    try:
        return get_user_integrations(user_id=user_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch integrations: {exc}",
        ) from exc


@router.put(
    "/integrations/{app_id}",
    status_code=status.HTTP_200_OK,
)
def update_integration_status(
    app_id: str,
    data: IntegrationUpdate,
    user_id: int = Depends(get_current_user_id),
):
    try:
        return update_user_integration(
            user_id=user_id,
            app_id=app_id,
            is_connected=data.is_connected,
            account_email=data.account_email,
            config=data.config,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update integration: {exc}",
        ) from exc


# =========================================================
# Developer API Keys
# =========================================================

@router.get(
    "/api-keys",
    response_model=List[ApiKeyResponse],
    status_code=status.HTTP_200_OK,
)
def list_api_keys(
    user_id: int = Depends(get_current_user_id),
):
    try:
        return get_user_api_keys(user_id=user_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch API keys: {exc}",
        ) from exc


@router.post(
    "/api-keys",
    response_model=ApiKeyResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_api_key(
    data: ApiKeyCreate,
    user_id: int = Depends(get_current_user_id),
):
    try:
        return create_user_api_key(
            user_id=user_id,
            name=data.name,
            environment=data.environment,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create API key: {exc}",
        ) from exc


@router.delete(
    "/api-keys/{key_id}",
    status_code=status.HTTP_200_OK,
)
def delete_api_key_endpoint(
    key_id: int,
    user_id: int = Depends(get_current_user_id),
):
    try:
        delete_user_api_key(user_id=user_id, key_id=key_id)
        return {"message": "API key revoked successfully."}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete API key: {exc}",
        ) from exc
