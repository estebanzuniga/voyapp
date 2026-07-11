from datetime import date

import strawberry
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.graphql.types.trip import Trip
from app.models.trip import Trip as TripModel
from app.models.user import User as UserModel

DEMO_USER_EMAIL = "demo@voyapp.dev"


async def _get_or_create_demo_user(session: AsyncSession) -> UserModel:
    result = await session.execute(select(UserModel).where(UserModel.email == DEMO_USER_EMAIL))
    user = result.scalar_one_or_none()
    if user is None:
        user = UserModel(email=DEMO_USER_EMAIL, password_hash="unset")
        session.add(user)
        await session.flush()
    return user


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_trip(
        self, info: strawberry.Info, title: str, start_date: date, end_date: date
    ) -> Trip:
        session = info.context.session
        user = await _get_or_create_demo_user(session)
        trip = TripModel(title=title, start_date=start_date, end_date=end_date, user_id=user.id)
        session.add(trip)
        await session.commit()
        return Trip.from_model(trip)
