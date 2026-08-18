import os
import smtplib

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials


# =========================================================
# SMTP / Gmail configuration
# =========================================================

SMTP_HOST = os.getenv(
    "SMTP_HOST",
    "smtp.gmail.com",
)

SMTP_PORT = int(
    os.getenv("SMTP_PORT", "465")
)

MAIL_FROM = os.getenv("MAIL_FROM")

GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID"
)

GOOGLE_CLIENT_SECRET = os.getenv(
    "GOOGLE_CLIENT_SECRET"
)

GOOGLE_REFRESH_TOKEN = os.getenv(
    "GOOGLE_REFRESH_TOKEN"
)

GOOGLE_TOKEN_URI = (
    "https://oauth2.googleapis.com/token"
)


# =========================================================
# Google OAuth2
# =========================================================

def get_access_token() -> str:

    if not GOOGLE_CLIENT_ID:
        raise ValueError(
            "GOOGLE_CLIENT_ID is not configured."
        )

    if not GOOGLE_CLIENT_SECRET:
        raise ValueError(
            "GOOGLE_CLIENT_SECRET is not configured."
        )

    if not GOOGLE_REFRESH_TOKEN:
        raise ValueError(
            "GOOGLE_REFRESH_TOKEN is not configured."
        )

    credentials = Credentials(
        token=None,
        refresh_token=GOOGLE_REFRESH_TOKEN,
        token_uri=GOOGLE_TOKEN_URI,
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
    )

    credentials.refresh(Request())

    if not credentials.token:
        raise RuntimeError(
            "Failed to obtain Google OAuth2 access token."
        )

    return credentials.token


# =========================================================
# Gmail XOAUTH2
# =========================================================

def build_xoauth2_string(
    email: str,
    access_token: str,
) -> str:

    return (
        f"user={email}"
        f"\x01auth=Bearer {access_token}"
        f"\x01\x01"
    )


# =========================================================
# Send email
# =========================================================

def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
) -> bool:

    if not MAIL_FROM:
        raise ValueError(
            "MAIL_FROM is not configured."
        )

    access_token = get_access_token()

    message = MIMEMultipart("alternative")

    message["From"] = MAIL_FROM
    message["To"] = to_email
    message["Subject"] = subject

    if text_body:
        message.attach(
            MIMEText(
                text_body,
                "plain",
                "utf-8",
            )
        )

    message.attach(
        MIMEText(
            html_body,
            "html",
            "utf-8",
        )
    )

    xoauth2_string = build_xoauth2_string(
        MAIL_FROM,
        access_token,
    )

    with smtplib.SMTP_SSL(
        SMTP_HOST,
        SMTP_PORT,
    ) as smtp:

        smtp.docmd(
            "AUTH",
            "XOAUTH2",
            xoauth2_string
            .encode("utf-8")
            .decode("ascii"),
        )

        smtp.sendmail(
            MAIL_FROM,
            [to_email],
            message.as_string(),
        )

    return True