from datetime import datetime

import strawberry

from app.graphql.types.permission import PermissionLevel
from app.models.trip_collaborator import TripCollaborator as TripCollaboratorModel
from app.models.trip_share_link import TripShareLink as TripShareLinkModel


@strawberry.type
class ShareLink:
    id: strawberry.ID
    token: str
    permission: PermissionLevel
    created_at: datetime
    expires_at: datetime

    @classmethod
    def from_model(cls, link: TripShareLinkModel) -> "ShareLink":
        return cls(
            id=strawberry.ID(str(link.id)),
            token=link.token,
            permission=link.permission,
            created_at=link.created_at,
            expires_at=link.expires_at,
        )


@strawberry.type
class Collaborator:
    user_id: strawberry.ID
    email: str
    permission: PermissionLevel

    @classmethod
    def from_model(cls, collaborator: TripCollaboratorModel, email: str) -> "Collaborator":
        return cls(
            user_id=strawberry.ID(str(collaborator.user_id)),
            email=email,
            permission=collaborator.permission,
        )


@strawberry.type
class ShareInvitePreview:
    valid: bool
    trip_title: str | None = None
    permission: PermissionLevel | None = None
