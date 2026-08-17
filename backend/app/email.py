import httpx

from app.config import settings

BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email"


async def send_password_reset_email(to_email: str, reset_url: str) -> None:
    """Send the "reset your password" email via Brevo's transactional API."""

    if not settings.brevo_api_key:
        print(f"[email] BREVO_API_KEY not set - password reset link for {to_email}: {reset_url}")
        return

    async with httpx.AsyncClient() as client:
        response = await client.post(
            BREVO_ENDPOINT,
            headers={
                "api-key": settings.brevo_api_key,
                "content-type": "application/json",
                "accept": "application/json",
            },
            json={
                "sender": {"name": "VoyApp", "email": settings.email_from},
                "to": [{"email": to_email}],
                "subject": "Reset your VoyApp password",
                "textContent": (
                    "Hi,\n\n"
                    "We received a request to reset your VoyApp password.\n\n"
                    f"Click the link below (valid for 1 hour):\n{reset_url}\n\n"
                    "If you didn't request this, you can safely ignore this email.\n\n"
                    "— VoyApp"
                ),
                "htmlContent": f"""
                    <div style="font-family:sans-serif;max-width:480px;margin:auto">
                      <h2 style="color:#3b82f6">VoyApp</h2>
                      <p>We received a request to reset your password.</p>
                      <p>
                        <a href="{reset_url}"
                           style="display:inline-block;padding:10px 20px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
                          Reset password
                        </a>
                      </p>
                      <p style="color:#6b7280;font-size:13px">This link is valid for 1 hour. If you didn't request this, you can ignore this email.</p>
                    </div>
                """,
            },
        )
        response.raise_for_status()
