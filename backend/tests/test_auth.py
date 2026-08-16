from app.schema import schema

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


async def test_avatar_color_options_returns_palette(context):
    result = await schema.execute("query { avatarColorOptions }", context_value=context)

    assert result.errors is None
    assert "#8b5cf6" in result.data["avatarColorOptions"]
