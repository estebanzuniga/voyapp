import strawberry
from sqlalchemy import or_, select

from app.graphql.access import get_viewer_permission
from app.graphql.types.share import ShareInvitePreview
from app.graphql.types.trip import Trip
from app.graphql.types.user import User
from app.models.trip import Trip as TripModel
from app.models.trip_collaborator import TripCollaborator as TripCollaboratorModel
from app.models.trip_share_link import TripShareLink as TripShareLinkModel
from app.models.user import AVATAR_COLORS


@strawberry.type
class Query:
    @strawberry.field
    def hello(self) -> str:
        return "Hello, Voyapp!"

    @strawberry.field
    def avatar_color_options(self) -> list[str]:
        # Backend stays the single source of truth for the palette (also
        # used to validate `updateAvatarColor`) - the profile page's color
        # picker renders whatever this returns instead of hardcoding its
        # own copy of the list.
        return list(AVATAR_COLORS)

    @strawberry.field
    async def me(self, info: strawberry.Info) -> User:
        # The frontend only persists the JWT across page loads (not the user
        # object it got back from login/signup), so the Profile page - and
        # anything else that needs "who's logged in" after a refresh - calls
        # this to rehydrate it from the token instead.
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")
        return User.from_model(user)

    @strawberry.field
    async def my_trips(self, info: strawberry.Info) -> list[Trip]:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        # Trips you own, plus trips someone shared with you (you're in
        # trip_collaborators for them) - the outer join can match a trip
        # more than once when it has several collaborators, so `.distinct()`
        # collapses that back down to one row per trip.
        result = await session.execute(
            select(TripModel)
            .outerjoin(
                TripCollaboratorModel,
                TripCollaboratorModel.trip_id == TripModel.id,
            )
            .where(
                or_(
                    TripModel.user_id == user.id,
                    TripCollaboratorModel.user_id == user.id,
                )
            )
            .distinct()
        )
        return [Trip.from_model(trip) for trip in result.scalars().all()]

    @strawberry.field
    async def trip(self, info: strawberry.Info, id: strawberry.ID) -> Trip | None:
        user = info.context.current_user
        if user is None:
            raise Exception("Not authenticated")

        session = info.context.session
        trip = await session.get(TripModel, int(id))
        if trip is None:
            return None

        permission = await get_viewer_permission(session, trip, user)
        if permission is None:
            return None

        return Trip.from_model(trip)

    @strawberry.field
    async def share_invite_preview(self, info: strawberry.Info, token: str) -> ShareInvitePreview:
        # Deliberately doesn't require authentication: a logged-out visitor
        # who just opened an invite link needs to see what it's for
        # ("You've been invited to view/edit <trip>") before we ask them to
        # log in or sign up to actually accept it.
        session = info.context.session
        link = await session.scalar(
            select(TripShareLinkModel).where(TripShareLinkModel.token == token)
        )
        if link is None or link.is_expired:
            return ShareInvitePreview(valid=False)

        trip = await session.get(TripModel, link.trip_id)
        if trip is None:
            return ShareInvitePreview(valid=False)

        return ShareInvitePreview(valid=True, trip_title=trip.title, permission=link.permission)
