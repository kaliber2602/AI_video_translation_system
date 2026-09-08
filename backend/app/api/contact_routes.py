import logging
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request, status

from app.schemas.contact import (
    ContactCreateRequest,
    ContactResponse,
    ContactSubmitSuccessResponse,
)
from app.services.contact_service import (
    create_contact_message,
    get_contact_messages,
    send_contact_notifications,
)

logger = logging.getLogger("app.api.contact_routes")

router = APIRouter(
    prefix="/contact",
    tags=["Contact & Feedback"],
)


@router.post(
    "",
    response_model=ContactSubmitSuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a contact or inquiry message",
)
def submit_contact(
    data: ContactCreateRequest,
    request: Request,
    background_tasks: BackgroundTasks,
):
    """
    Public endpoint: Anyone can submit an inquiry or contact message.
    Stores the message in PostgreSQL and queues background email notifications.
    """
    client_ip = None
    if request.client:
        client_ip = request.client.host

    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()

    try:
        contact_record = create_contact_message(
            name=data.name,
            email=data.email,
            subject=data.subject,
            message=data.message,
            ip_address=client_ip,
        )

        background_tasks.add_task(send_contact_notifications, contact_record)

        return ContactSubmitSuccessResponse(
            success=True,
            message="Your message has been received. We will get back to you soon.",
            data=ContactResponse(**contact_record),
        )

    except Exception as exc:
        logger.error(f"[ContactAPI] Error submitting contact message: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while saving your message. Please try again later.",
        ) from exc


@router.get(
    "",
    response_model=List[ContactResponse],
    summary="List contact messages",
)
def list_contacts(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Retrieve submitted contact messages."""
    try:
        contacts = get_contact_messages(limit=limit, offset=offset)
        return [ContactResponse(**c) for c in contacts]
    except Exception as exc:
        logger.error(f"[ContactAPI] Error listing contacts: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve contact messages.",
        ) from exc
