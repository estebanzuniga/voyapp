import strawberry

from app.models.user import User as UserModel


@strawberry.type
class User:
    id: strawberry.ID
    email: str
    first_name: str
    last_name: str
    avatar_color: str
    language: str

    @classmethod
    def from_model(cls, user: UserModel) -> "User":
        return cls(
            id=strawberry.ID(str(user.id)),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            avatar_color=user.avatar_color,
            language=user.language,
        )
