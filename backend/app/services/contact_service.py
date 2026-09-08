import logging
from typing import Any, Optional

import psycopg2

from app.core.config import MAIL_FROM
from app.core.database import get_connection
from app.services.email_service import send_email

logger = logging.getLogger("app.services.contact_service")

TABLE_CREATED = False


def ensure_contact_table_exists() -> None:
    """Ensure the contact_messages table and indexes exist in PostgreSQL."""
    global TABLE_CREATED
    if TABLE_CREATED:
        return

    connection = None
    try:
        connection = get_connection()
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS contact_messages (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    subject VARCHAR(255),
                    message TEXT NOT NULL,
                    status VARCHAR(50) DEFAULT 'pending',
                    ip_address VARCHAR(45),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_contact_messages_email
                    ON contact_messages(email);

                CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
                    ON contact_messages(created_at DESC);
                """
            )
        connection.commit()
        TABLE_CREATED = True
        logger.info("[ContactService] Verified contact_messages table existence.")
    except Exception as exc:
        if connection:
            connection.rollback()
        logger.warning(f"[ContactService] Table verification warning: {exc}")
    finally:
        if connection:
            connection.close()


def create_contact_message(
    name: str,
    email: str,
    subject: Optional[str],
    message: str,
    ip_address: Optional[str] = None,
) -> dict[str, Any]:
    """Insert a new contact message record into the database."""
    ensure_contact_table_exists()
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO contact_messages (
                    name,
                    email,
                    subject,
                    message,
                    ip_address,
                    status
                )
                VALUES (%s, %s, %s, %s, %s, 'pending')
                RETURNING
                    id,
                    name,
                    email,
                    subject,
                    message,
                    status,
                    created_at
                """,
                (
                    name.strip(),
                    email.strip().lower(),
                    subject.strip() if subject else None,
                    message.strip(),
                    ip_address,
                ),
            )
            row = cursor.fetchone()

        connection.commit()

        return {
            "id": row[0],
            "name": row[1],
            "email": row[2],
            "subject": row[3],
            "message": row[4],
            "status": row[5],
            "created_at": row[6],
        }

    except Exception as exc:
        connection.rollback()
        logger.error(f"[ContactService] Failed to create contact message: {exc}", exc_info=True)
        raise exc
    finally:
        connection.close()


def get_contact_messages(limit: int = 50, offset: int = 0) -> list[dict[str, Any]]:
    """Retrieve contact messages ordered by creation date."""
    ensure_contact_table_exists()
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    name,
                    email,
                    subject,
                    message,
                    status,
                    created_at
                FROM contact_messages
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
                """,
                (limit, offset),
            )
            rows = cursor.fetchall()

        return [
            {
                "id": row[0],
                "name": row[1],
                "email": row[2],
                "subject": row[3],
                "message": row[4],
                "status": row[5],
                "created_at": row[6],
            }
            for row in rows
        ]
    finally:
        connection.close()


def send_contact_notifications(contact_data: dict[str, Any]) -> None:
    """Send acknowledgment email to user and notification to admin (non-blocking task)."""
    user_email = contact_data.get("email")
    user_name = contact_data.get("name", "Valued Customer")
    subject_text = contact_data.get("subject") or "General Inquiry"
    message_content = contact_data.get("message", "")

    # 1. Gửi email xác nhận tiếp nhận cho người dùng
    if user_email and MAIL_FROM:
        try:
            ack_subject = f"[VIDNOVA] We received your message: {subject_text}"
            ack_html = f"""
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg: 12px;">
                <h2 style="color: #0d9488;">Hello {user_name},</h2>
                <p>Thank you for reaching out to <strong>VIDNOVA</strong>. We have received your inquiry and our team will get back to you within 24 hours.</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488;">
                    <p style="margin: 0 0 8px 0;"><strong>Subject:</strong> {subject_text}</p>
                    <p style="margin: 0;"><strong>Message:</strong><br/>{message_content}</p>
                </div>
                <p style="color: #64748b; font-size: 13px;">Best regards,<br/>VIDNOVA Support Team</p>
            </div>
            """
            send_email(
                to_email=user_email,
                subject=ack_subject,
                html_body=ack_html,
                text_body=f"Hello {user_name},\n\nThank you for reaching out to VIDNOVA. We received your message:\n{message_content}\n\nOur team will contact you soon.",
            )
            logger.info(f"[ContactService] Acknowledgment email sent to {user_email}")
        except Exception as exc:
            logger.warning(f"[ContactService] Could not send user acknowledgment email: {exc}")

    # 2. Gửi email thông báo cho Admin
    if MAIL_FROM:
        try:
            admin_subject = f"[VIDNOVA Contact Alert] New inquiry from {user_name} ({user_email})"
            admin_html = f"""
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h3 style="color: #0f172a;">New Contact Message Received</h3>
                <p><strong>From:</strong> {user_name} &lt;{user_email}&gt;</p>
                <p><strong>Subject:</strong> {subject_text}</p>
                <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p style="margin: 0; white-space: pre-wrap;">{message_content}</p>
                </div>
            </div>
            """
            send_email(
                to_email=MAIL_FROM,
                subject=admin_subject,
                html_body=admin_html,
                text_body=f"New Contact from {user_name} ({user_email})\nSubject: {subject_text}\n\nMessage:\n{message_content}",
            )
            logger.info(f"[ContactService] Admin notification email sent to {MAIL_FROM}")
        except Exception as exc:
            logger.warning(f"[ContactService] Could not send admin alert email: {exc}")
