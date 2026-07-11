import strawberry

from app.models.user import User as UserModel


@strawberry.type
class User:
    id: strawberry.ID
    email: str

    @classmethod
    def from_model(cls, user: UserModel) -> "User":
        return cls(id=strawberry.ID(str(user.id)), email=user.email)
