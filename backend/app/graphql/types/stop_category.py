import strawberry

from app.models.stop_category import StopCategory as StopCategoryModel


@strawberry.type
class StopCategory:
    id: strawberry.ID
    name: str
    emoji: str

    @classmethod
    def from_model(cls, category: StopCategoryModel) -> "StopCategory":
        return cls(id=strawberry.ID(str(category.id)), name=category.name, emoji=category.emoji)
