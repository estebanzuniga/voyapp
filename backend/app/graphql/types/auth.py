import strawberry

from app.graphql.types.user import User


@strawberry.type
class AuthPayload:
    token: str
    user: User
