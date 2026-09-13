import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.notification_routes import get_current_user_id
from app.services.batch_service import BatchService
from app.services.project_service import get_project

logger = logging.getLogger(__name__)

router = APIRouter(tags=["batch_processing"])


class CreateBatchRequest(BaseModel):
    name: Optional[str] = ""
    video_ids: List[int] = Field(..., min_length=1)
    preset_id: Optional[int] = None
    config_override: Optional[Dict[str, Any]] = None


@router.post(
    "/projects/{project_id}/batches",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=Dict[str, Any],
)
def create_project_batch(
    project_id: int,
    payload: CreateBatchRequest,
    user_id: int = Depends(get_current_user_id),
):
    """
    Create a new batch processing job for selected videos within a project
    and dispatch the sequential execution Celery task.
    """
    # Verify project access
    proj = get_project(project_id=project_id, user_id=user_id)
    if not proj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied.",
        )

    try:
        batch = BatchService.create_batch_job(
            project_id=project_id,
            user_id=user_id,
            name=payload.name or "",
            video_ids=payload.video_ids,
            preset_id=payload.preset_id,
            config_override=payload.config_override,
        )
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not initialize batch job.",
            )

        # Dispatch async Celery worker task
        from app.tasks.video_tasks import task_process_batch_job

        task = task_process_batch_job.delay(batch["id"], user_id)
        batch["celery_task_id"] = task.id

        logger.info(
            f"🚀 [BatchAPI] Batch {batch['id']} queued for project {project_id} with task {task.id}"
        )
        return batch

    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as exc:
        logger.error(f"[BatchAPI] Error triggering batch job: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while dispatching the batch processing job.",
        )


@router.get("/projects/{project_id}/batches", response_model=List[Dict[str, Any]])
def list_project_batches(
    project_id: int,
    user_id: int = Depends(get_current_user_id),
):
    """List all batch processing jobs associated with a project."""
    proj = get_project(project_id=project_id, user_id=user_id)
    if not proj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied.",
        )

    return BatchService.list_project_batches(project_id=project_id)


@router.get("/batches/{batch_id}", response_model=Dict[str, Any])
def get_batch_details(
    batch_id: str,
    user_id: int = Depends(get_current_user_id),
):
    """Retrieve full batch job status, progress, and all item video statuses."""
    batch = BatchService.get_batch_job(batch_id=batch_id)
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch job not found.",
        )

    # Check project authorization
    proj = get_project(project_id=batch["project_id"], user_id=user_id)
    if not proj:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this batch job.",
        )

    return batch


@router.post("/batches/{batch_id}/cancel", status_code=status.HTTP_200_OK)
def cancel_batch_job(
    batch_id: str,
    user_id: int = Depends(get_current_user_id),
):
    """Cancel a queued or running batch job."""
    batch = BatchService.get_batch_job(batch_id=batch_id)
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch job not found.",
        )

    proj = get_project(project_id=batch["project_id"], user_id=user_id)
    if not proj:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to cancel this batch job.",
        )

    success = BatchService.cancel_batch_job(batch_id=batch_id, user_id=user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch job cannot be cancelled or is already finished.",
        )

    return {"status": "success", "message": "Batch cancellation requested."}
