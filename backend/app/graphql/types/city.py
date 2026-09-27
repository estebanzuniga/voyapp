import strawberry
from sqlalchemy import select

from app.graphql.types.stop import Stop
from app.models.city import City as CityModel
from app.models.stop import Stop as StopModel


@strawberry.type
class City:
    id: strawberry.ID
    name: str

    @classmethod
    def from_model(cls, city: CityModel) -> "City":
        return cls(id=strawberry.ID(str(city.id)), name=city.name)

    @strawberry.field
    async def stops(self, info: strawberry.Info) -> list[Stop]:
        session = info.context.session
        result = await session.execute(
            select(StopModel)
            .where(StopModel.city_id == int(self.id))
            .order_by(StopModel.order_index)
        )
        return [Stop.from_model(stop) for stop in result.scalars().all()]
