from app.schema import schema


async def test_signup_creates_user_and_token(session, context):
    result = await schema.execute(
        """
        mutation($email: String!, $password: String!) {
          signup(email: $email, password: $password) {
            token
            user { email }
          }
        }
        """,
        variable_values={"email": "new@example.com", "password": "password123"},
        context_value=context,
    )

    assert result.errors is None
    assert result.data["signup"]["user"]["email"] == "new@example.com"
    assert result.data["signup"]["token"]


async def test_signup_rejects_duplicate_email(session, context, user):
    result = await schema.execute(
        """
        mutation($email: String!, $password: String!) {
          signup(email: $email, password: $password) { token }
        }
        """,
        variable_values={"email": user.email, "password": "password123"},
        context_value=context,
    )

    assert result.errors is not None
    assert "already exists" in result.errors[0].message


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
