from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.models.password_reset_token import PasswordResetToken as PasswordResetTokenModel
from app.schema import schema

REQUEST_PASSWORD_RESET = """
mutation($email: String!) {
  requestPasswordReset(email: $email)
}
"""

RESET_PASSWORD = """
mutation($token: String!, $newPassword: String!) {
  resetPassword(token: $token, newPassword: $newPassword)
}
"""

SIGNUP = """
mutation($email: String!, $password: String!, $firstName: String!, $lastName: String!) {
  signup(email: $email, password: $password, firstName: $firstName, lastName: $lastName) {
    token
    user { email firstName lastName avatarColor }
  }
}
"""


async def test_signup_creates_user_and_token(session, context):
    result = await schema.execute(
        SIGNUP,
        variable_values={
            "email": "new@example.com",
            "password": "password123",
            "firstName": "Ada",
            "lastName": "Lovelace",
        },
        context_value=context,
    )

    assert result.errors is None
    user = result.data["signup"]["user"]
    assert user["email"] == "new@example.com"
    assert user["firstName"] == "Ada"
    assert user["lastName"] == "Lovelace"
    assert user["avatarColor"]
    assert result.data["signup"]["token"]


async def test_signup_rejects_duplicate_email(session, context, user):
    result = await schema.execute(
        SIGNUP,
        variable_values={
            "email": user.email,
            "password": "password123",
            "firstName": "Ada",
            "lastName": "Lovelace",
        },
        context_value=context,
    )

    assert result.errors is not None
    assert "already exists" in result.errors[0].message


async def test_signup_rejects_blank_name(session, context):
    result = await schema.execute(
        SIGNUP,
        variable_values={
            "email": "new@example.com",
            "password": "password123",
            "firstName": "   ",
            "lastName": "Lovelace",
        },
        context_value=context,
    )

    assert result.errors is not None
    assert "First name and last name are required" in result.errors[0].message


async def test_login_succeeds_with_correct_password(session, context, user):
    result = await schema.execute(
        """
        mutation($email: String!, $password: String!) {
          login(email: $email, password: $password) { token }
        }
        """,
        variable_values={"email": user.email, "password": "password123"},
        context_value=context,
    )

    assert result.errors is None
    assert result.data["login"]["token"]


async def test_login_rejects_wrong_password(session, context, user):
    result = await schema.execute(
        """
        mutation($email: String!, $password: String!) {
          login(email: $email, password: $password) { token }
        }
        """,
        variable_values={"email": user.email, "password": "wrong-password"},
        context_value=context,
    )

    assert result.errors is not None
    assert "Invalid email or password" in result.errors[0].message


async def test_me_returns_current_user(auth_context, user):
    result = await schema.execute(
        "query { me { id email firstName lastName avatarColor } }", context_value=auth_context
    )

    assert result.errors is None
    assert result.data["me"]["email"] == user.email
    assert result.data["me"]["id"] == str(user.id)
    assert result.data["me"]["firstName"] == user.first_name
    assert result.data["me"]["lastName"] == user.last_name
    assert result.data["me"]["avatarColor"] == user.avatar_color


async def test_me_requires_auth(context):
    result = await schema.execute("query { me { email } }", context_value=context)

    assert result.errors is not None
    assert "Not authenticated" in result.errors[0].message


async def test_update_avatar_color_changes_color(auth_context):
    result = await schema.execute(
        """
        mutation($avatarColor: String!) {
          updateAvatarColor(avatarColor: $avatarColor) { avatarColor }
        }
        """,
        variable_values={"avatarColor": "#8b5cf6"},
        context_value=auth_context,
    )

    assert result.errors is None
    assert result.data["updateAvatarColor"]["avatarColor"] == "#8b5cf6"


async def test_update_avatar_color_rejects_invalid_color(auth_context):
    result = await schema.execute(
        """
        mutation($avatarColor: String!) {
          updateAvatarColor(avatarColor: $avatarColor) { avatarColor }
        }
        """,
        variable_values={"avatarColor": "#000000"},
        context_value=auth_context,
    )

    assert result.errors is not None
    assert "Invalid avatar color" in result.errors[0].message


async def test_update_avatar_color_requires_auth(context):
    result = await schema.execute(
        """
        mutation($avatarColor: String!) {
          updateAvatarColor(avatarColor: $avatarColor) { avatarColor }
        }
        """,
        variable_values={"avatarColor": "#8b5cf6"},
        context_value=context,
    )

    assert result.errors is not None
    assert "Not authenticated" in result.errors[0].message


async def test_update_name_changes_first_and_last_name(auth_context):
    result = await schema.execute(
        """
        mutation($firstName: String!, $lastName: String!) {
          updateName(firstName: $firstName, lastName: $lastName) { firstName lastName }
        }
        """,
        variable_values={"firstName": "Grace", "lastName": "Hopper"},
        context_value=auth_context,
    )

    assert result.errors is None
    assert result.data["updateName"]["firstName"] == "Grace"
    assert result.data["updateName"]["lastName"] == "Hopper"


async def test_update_name_rejects_blank_name(auth_context):
    result = await schema.execute(
        """
        mutation($firstName: String!, $lastName: String!) {
          updateName(firstName: $firstName, lastName: $lastName) { firstName }
        }
        """,
        variable_values={"firstName": "  ", "lastName": "Hopper"},
        context_value=auth_context,
    )

    assert result.errors is not None
    assert "First name and last name are required" in result.errors[0].message


async def test_update_name_requires_auth(context):
    result = await schema.execute(
        """
        mutation($firstName: String!, $lastName: String!) {
          updateName(firstName: $firstName, lastName: $lastName) { firstName }
        }
        """,
        variable_values={"firstName": "Grace", "lastName": "Hopper"},
        context_value=context,
    )

    assert result.errors is not None
    assert "Not authenticated" in result.errors[0].message


CHANGE_PASSWORD = """
mutation($currentPassword: String!, $newPassword: String!) {
  changePassword(currentPassword: $currentPassword, newPassword: $newPassword)
}
"""


async def test_change_password_updates_password(auth_context, user):
    result = await schema.execute(
        CHANGE_PASSWORD,
        variable_values={"currentPassword": "password123", "newPassword": "newpassword456"},
        context_value=auth_context,
    )

    assert result.errors is None
    assert result.data["changePassword"] is True

    login_result = await schema.execute(
        """
        mutation($email: String!, $password: String!) {
          login(email: $email, password: $password) { token }
        }
        """,
        variable_values={"email": user.email, "password": "newpassword456"},
        context_value=auth_context,
    )
    assert login_result.errors is None
    assert login_result.data["login"]["token"]


async def test_change_password_rejects_wrong_current_password(auth_context):
    result = await schema.execute(
        CHANGE_PASSWORD,
        variable_values={"currentPassword": "wrong-password", "newPassword": "newpassword456"},
        context_value=auth_context,
    )

    assert result.errors is not None
    assert "Current password is incorrect" in result.errors[0].message


async def test_change_password_rejects_short_new_password(auth_context):
    result = await schema.execute(
        CHANGE_PASSWORD,
        variable_values={"currentPassword": "password123", "newPassword": "short"},
        context_value=auth_context,
    )

    assert result.errors is not None
    assert "New password must be at least 8 characters" in result.errors[0].message


async def test_change_password_requires_auth(context):
    result = await schema.execute(
        CHANGE_PASSWORD,
        variable_values={"currentPassword": "password123", "newPassword": "newpassword456"},
        context_value=context,
    )

    assert result.errors is not None
    assert "Not authenticated" in result.errors[0].message


async def test_avatar_color_options_returns_palette(context):
    result = await schema.execute("query { avatarColorOptions }", context_value=context)

    assert result.errors is None
    assert "#8b5cf6" in result.data["avatarColorOptions"]


async def test_request_password_reset_creates_token_for_known_email(session, context, user):
    result = await schema.execute(
        REQUEST_PASSWORD_RESET,
        variable_values={"email": user.email},
        context_value=context,
    )

    assert result.errors is None
    assert result.data["requestPasswordReset"] is True

    tokens = await session.execute(
        select(PasswordResetTokenModel).where(PasswordResetTokenModel.user_id == user.id)
    )
    reset_token = tokens.scalar_one()
    assert reset_token.used_at is None
    assert not reset_token.is_expired


async def test_request_password_reset_returns_true_for_unknown_email(context):
    # Same response whether or not the email is registered - the mutation
    # shouldn't leak which emails have accounts.
    result = await schema.execute(
        REQUEST_PASSWORD_RESET,
        variable_values={"email": "nobody@example.com"},
        context_value=context,
    )

    assert result.errors is None
    assert result.data["requestPasswordReset"] is True


async def test_reset_password_updates_password_and_consumes_token(session, context, user):
    await schema.execute(
        REQUEST_PASSWORD_RESET,
        variable_values={"email": user.email},
        context_value=context,
    )
    tokens = await session.execute(
        select(PasswordResetTokenModel).where(PasswordResetTokenModel.user_id == user.id)
    )
    reset_token = tokens.scalar_one()

    result = await schema.execute(
        RESET_PASSWORD,
        variable_values={"token": reset_token.token, "newPassword": "brandnewpassword"},
        context_value=context,
    )

    assert result.errors is None
    assert result.data["resetPassword"] is True

    login_result = await schema.execute(
        """
        mutation($email: String!, $password: String!) {
          login(email: $email, password: $password) { token }
        }
        """,
        variable_values={"email": user.email, "password": "brandnewpassword"},
        context_value=context,
    )
    assert login_result.errors is None
    assert login_result.data["login"]["token"]

    await session.refresh(reset_token)
    assert reset_token.used_at is not None


async def test_reset_password_rejects_reused_token(session, context, user):
    await schema.execute(
        REQUEST_PASSWORD_RESET,
        variable_values={"email": user.email},
        context_value=context,
    )
    tokens = await session.execute(
        select(PasswordResetTokenModel).where(PasswordResetTokenModel.user_id == user.id)
    )
    reset_token = tokens.scalar_one()

    first = await schema.execute(
        RESET_PASSWORD,
        variable_values={"token": reset_token.token, "newPassword": "brandnewpassword"},
        context_value=context,
    )
    assert first.errors is None

    second = await schema.execute(
        RESET_PASSWORD,
        variable_values={"token": reset_token.token, "newPassword": "anotherpassword"},
        context_value=context,
    )
    assert second.errors is not None
    assert "invalid or has expired" in second.errors[0].message


async def test_reset_password_rejects_expired_token(session, context, user):
    expired_token = PasswordResetTokenModel(
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
    )
    session.add(expired_token)
    await session.commit()

    result = await schema.execute(
        RESET_PASSWORD,
        variable_values={"token": expired_token.token, "newPassword": "brandnewpassword"},
        context_value=context,
    )

    assert result.errors is not None
    assert "invalid or has expired" in result.errors[0].message


async def test_reset_password_rejects_unknown_token(context):
    result = await schema.execute(
        RESET_PASSWORD,
        variable_values={"token": "not-a-real-token", "newPassword": "brandnewpassword"},
        context_value=context,
    )

    assert result.errors is not None
    assert "invalid or has expired" in result.errors[0].message


async def test_reset_password_rejects_short_new_password(session, context, user):
    await schema.execute(
        REQUEST_PASSWORD_RESET,
        variable_values={"email": user.email},
        context_value=context,
    )
    tokens = await session.execute(
        select(PasswordResetTokenModel).where(PasswordResetTokenModel.user_id == user.id)
    )
    reset_token = tokens.scalar_one()

    result = await schema.execute(
        RESET_PASSWORD,
        variable_values={"token": reset_token.token, "newPassword": "short"},
        context_value=context,
    )

    assert result.errors is not None
    assert "New password must be at least 8 characters" in result.errors[0].message
