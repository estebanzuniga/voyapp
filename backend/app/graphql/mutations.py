from datetime import date

import strawberry
from sqlalchemy import select

from app.auth.security import create_access_token, hash_password, verify_password
from app.graphql.types.auth import AuthPayload
from app.graphql.types.trip import Trip
from app.graphql.types.user import User
from app.models.trip import Trip as TripModel
from app.models.user import User as UserModel


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def signup(self, info: strawberry.Info, email: str, password: str) -> AuthPayload:
        session = info.context.session
        existing = await session.execute(select(UserModel).where(UserModel.email == email))
        if existing.scalar_one_or_none() is not None:
            raise Exception("A user with that email already exists")

        user = UserModel(email=email, password_hash=hash_password(password))
        session.add(user)
        await session.commit()

        token = create_access_token(user.id)
        return AuthPayload(token=token, user=User.from_model(user))

    @strawberry.mutation
    async def login(self, info: strawberry.Info, email: str, password: str) -> AuthPayload:
        session = info.context.session
        result = await session.execute(select(UserModel).where(UserModel.email == email))
        user = result.scalar_one_or_none()
        if user is None or not verify_password(password, user.password_hash):
            raise Exception("Invalid email or password")

        token = create_access_token(user.id)
        return AuthPayload(token=token, user=User.from_model(user))

    @strawberry.mutation
    async def create_trip(
        self, info: strawberry.Info, title: str, start_date: date, end_date: date
    ) -> Trip:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        trip = TripModel(title=title, start_date=start_date, end_date=end_date, user_id=user.id)
        session.add(trip)
        await session.commit()
        return Trip.from_model(trip)
