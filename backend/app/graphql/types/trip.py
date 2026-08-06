from datetime import date

import strawberry
from sqlalchemy import select

from app.graphql.types.day import Day
from app.graphql.types.permission import PermissionLevel
from app.graphql.types.share import Collaborator, ShareLink
from app.models.day import Day as DayModel
from app.models.enums import Permission
from app.models.trip import Trip as TripModel
from app.models.trip_collaborator import TripCollaborator as TripCollaboratorModel
from app.models.trip_share_link import TripShareLink as TripShareLinkModel
from app.models.user import User as UserModel


@strawberry.type
class Trip:
    id: strawberry.ID
    title: str
    start_date: date
    end_date: date
    # Private fields exist on the Python object but are never exposed in the
    # GraphQL schema - here it's how the fields below know who owns this
    # trip without re-fetching it from the database every time.
    owner_id: strawberry.Private[int]

    @classmethod
    def from_model(cls, trip: TripModel) -> "Trip":
        return cls(
            id=strawberry.ID(str(trip.id)),
            title=trip.title,
            start_date=trip.start_date,
            end_date=trip.end_date,
            owner_id=trip.user_id,
        )

    @strawberry.field
    async def days(self, info: strawberry.Info) -> list[Day]:
        session = info.context.session
        result = await session.execute(
            select(DayModel)
            .where(DayModel.trip_id == int(self.id))
            # Sorted by the day's actual calendar date. A day's "position" in
            # the list is always its date - there's no drag-to-reorder UI for
            # days the way there is for stops, and there's no sensible reason
            # a day would need a position independent of its date - so
            # there's no separate `order_index` column to maintain here.
            .order_by(DayModel.date)
        )
        return [Day.from_model(day) for day in result.scalars().all()]

    @strawberry.field
    def is_owner(self, info: strawberry.Info) -> bool:
        user = info.context.current_user
        return user is not None and user.id == self.owner_id

    @strawberry.field
    async def my_permission(self, info: strawberry.Info) -> PermissionLevel:
        user = info.context.current_user
        if user is not None and user.id == self.owner_id:
            return Permission.EDITOR

        session = info.context.session
        collaborator = await session.scalar(
            select(TripCollaboratorModel).where(
                TripCollaboratorModel.trip_id == int(self.id),
                TripCollaboratorModel.user_id == (user.id if user else None),
            )
        )
        return collaborator.permission if collaborator else Permission.VIEWER

    @strawberry.field
    async def share_links(self, info: strawberry.Info) -> list[ShareLink]:
        # Only the owner manages sharing - collaborators get an empty list
        # rather than an error, since the frontend simply won't render this
        # section for them.
        user = info.context.current_user
        if user is None or user.id != self.owner_id:
            return []

        session = info.context.session
        result = await session.execute(
            select(TripShareLinkModel).where(TripShareLinkModel.trip_id == int(self.id))
        )
        return [ShareLink.from_model(link) for link in result.scalars().all()]

    @strawberry.field
    async def collaborators(self, info: strawberry.Info) -> list[Collaborator]:
        user = info.context.current_user
        if user is None or user.id != self.owner_id:
            return []

        session = info.context.session
        result = await session.execute(
            select(TripCollaboratorModel, UserModel)
            .join(UserModel, UserModel.id == TripCollaboratorModel.user_id)
            .where(TripCollaboratorModel.trip_id == int(self.id))
        )
        return [
            Collaborator.from_model(collaborator, collaborator_user.email)
            for collaborator, collaborator_user in result.all()
        ]
