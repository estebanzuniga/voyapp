"""Shared trip-access checks used by every trip/day/stop resolver.

Every mutation/query that touches a trip (or something nested under it,
like a day or stop) needs to answer the same question: "can this user do
this to this trip?" Now that trips can be shared, that's no longer just
`trip.user_id == user.id` - it also has to check for a `TripCollaborator`
row with a high enough permission. Centralizing that here means the ~10
call sites in queries.py/mutations.py all share one source of truth instead
of repeating (and risking drifting apart on) the same OR-logic.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import Permission
from app.models.trip import Trip as TripModel
from app.models.trip_collaborator import TripCollaborator as TripCollaboratorModel
from app.models.user import User as UserModel


async def get_viewer_permission(
    session: AsyncSession, trip: TripModel, user: UserModel
) -> Permission | None:
    """The highest permission `user` has on `trip`, or None for no access at
    all. Owners are always treated as editors."""
    if trip.user_id == user.id:
        return Permission.EDITOR

    collaborator = await session.scalar(
        select(TripCollaboratorModel).where(
            TripCollaboratorModel.trip_id == trip.id,
            TripCollaboratorModel.user_id == user.id,
        )
    )
    return collaborator.permission if collaborator else None


async def require_trip_access(
    session: AsyncSession,
    trip_id: int,
    user: UserModel,
    *,
    editor: bool = False,
    not_found_message: str = "Trip not found",
) -> TripModel:
    """Fetch a trip the user is allowed to view (or edit, if `editor=True`).

    Raises the same "not found" message whether the trip doesn't exist or
    the user just doesn't have access to it - that's deliberate, so a
    stranger probing ids can't tell "doesn't exist" apart from "not yours".
    """
    trip = await session.get(TripModel, trip_id)
    if trip is None:
        raise Exception(not_found_message)

    permission = await get_viewer_permission(session, trip, user)
    if permission is None or (editor and permission != Permission.EDITOR):
        raise Exception(not_found_message)

    return trip


async def require_trip_owner(
    session: AsyncSession,
    trip_id: int,
    user: UserModel,
    *,
    not_found_message: str = "Trip not found",
) -> TripModel:
    """Fetch a trip only if `user` is its owner - used for managing sharing
    itself (creating/revoking links, adding/removing collaborators), which
    editors should not be able to do just because they can edit stops."""
    trip = await session.get(TripModel, trip_id)
    if trip is None or trip.user_id != user.id:
        raise Exception(not_found_message)
    return trip
