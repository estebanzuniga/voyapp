from app.auth.security import hash_password
from app.models.user import User as UserModel
from app.schema import schema
from tests.conftest import make_context

CREATE_TRIP = """
mutation($title: String!, $start: Date!, $end: Date!) {
  createTrip(title: $title, startDate: $start, endDate: $end) { id }
}
"""

CREATE_SHARE_LINK = """
mutation($tripId: ID!, $permission: PermissionLevel!) {
  createShareLink(tripId: $tripId, permission: $permission) { id token permission }
}
"""

REVOKE_SHARE_LINK = """
mutation($tripId: ID!, $linkId: ID!) {
  revokeShareLink(tripId: $tripId, linkId: $linkId)
}
"""

ACCEPT_SHARE_INVITE = """
mutation($token: String!) {
  acceptShareInvite(token: $token) { id title }
}
"""

SHARE_INVITE_PREVIEW = """
query($token: String!) {
  shareInvitePreview(token: $token) { valid tripTitle permission }
}
"""

ADD_DAY = """
mutation($tripId: ID!, $date: Date!) {
  addDay(tripId: $tripId, date: $date) { id }
}
"""

TRIP_QUERY = """
query($id: ID!) {
  trip(id: $id) { id title isOwner myPermission collaborators { email permission } }
}
"""

REMOVE_COLLABORATOR = """
mutation($tripId: ID!, $userId: ID!) {
  removeCollaborator(tripId: $tripId, userId: $userId)
}
"""

UPDATE_COLLABORATOR_PERMISSION = """
mutation($tripId: ID!, $userId: ID!, $permission: PermissionLevel!) {
  updateCollaboratorPermission(tripId: $tripId, userId: $userId, permission: $permission) {
    permission
  }
}
"""


async def _create_trip(context):
    result = await schema.execute(
        CREATE_TRIP,
        variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
        context_value=context,
    )
    assert result.errors is None
    return result.data["createTrip"]["id"]


async def test_create_share_link_allows_multiple_per_permission(auth_context):
    trip_id = await _create_trip(auth_context)

    first = await schema.execute(
        CREATE_SHARE_LINK,
        variable_values={"tripId": trip_id, "permission": "VIEWER"},
        context_value=auth_context,
    )
    second = await schema.execute(
        CREATE_SHARE_LINK,
        variable_values={"tripId": trip_id, "permission": "VIEWER"},
        context_value=auth_context,
    )

    assert first.errors is None and second.errors is None
    # Two independent viewer links, both live at once.
    assert first.data["createShareLink"]["id"] != second.data["createShareLink"]["id"]
    assert first.data["createShareLink"]["token"] != second.data["createShareLink"]["token"]


async def test_revoke_share_link_only_affects_that_link(auth_context):
    trip_id = await _create_trip(auth_context)
    first = await schema.execute(
        CREATE_SHARE_LINK,
        variable_values={"tripId": trip_id, "permission": "VIEWER"},
        context_value=auth_context,
    )
    second = await schema.execute(
        CREATE_SHARE_LINK,
        variable_values={"tripId": trip_id, "permission": "VIEWER"},
        context_value=auth_context,
    )
    first_id = first.data["createShareLink"]["id"]
    second_token = second.data["createShareLink"]["token"]

    first_revoke = await schema.execute(
        REVOKE_SHARE_LINK,
        variable_values={"tripId": trip_id, "linkId": first_id},
        context_value=auth_context,
    )
    repeat_revoke = await schema.execute(
        REVOKE_SHARE_LINK,
        variable_values={"tripId": trip_id, "linkId": first_id},
        context_value=auth_context,
    )

    assert first_revoke.data["revokeShareLink"] is True
    # Revoking again is a no-op, not an error.
    assert repeat_revoke.data["revokeShareLink"] is False

    # The other viewer link is untouched.
    preview = await schema.execute(
        SHARE_INVITE_PREVIEW, variable_values={"token": second_token}, context_value=auth_context
    )
    assert preview.errors is None
    assert preview.data["shareInvitePreview"]["valid"] is True


async def test_non_owner_cannot_manage_share_links(session, auth_context, other_user):
    trip_id = await _create_trip(auth_context)
    other_context = make_context(session, other_user)

    result = await schema.execute(
        CREATE_SHARE_LINK,
        variable_values={"tripId": trip_id, "permission": "VIEWER"},
        context_value=other_context,
    )

    assert result.errors is not None
    assert "Trip not found" in result.errors[0].message


async def test_share_invite_preview_works_without_auth(context, auth_context):
    trip_id = await _create_trip(auth_context)
    link_result = await schema.execute(
        CREATE_SHARE_LINK,
        variable_values={"tripId": trip_id, "permission": "EDITOR"},
        context_value=auth_context,
    )
    token = link_result.data["createShareLink"]["token"]

    preview = await schema.execute(
        SHARE_INVITE_PREVIEW, variable_values={"token": token}, context_value=context
    )

    assert preview.errors is None
    assert preview.data["shareInvitePreview"] == {
        "valid": True,
        "tripTitle": "Japan",
        "permission": "EDITOR",
    }


async def test_share_invite_preview_invalid_token(context):
    preview = await schema.execute(
        SHARE_INVITE_PREVIEW, variable_values={"token": "does-not-exist"}, context_value=context
    )

    assert preview.errors is None
    assert preview.data["shareInvitePreview"]["valid"] is False


async def test_accept_viewer_invite_grants_read_but_not_write(session, auth_context, other_user):
    trip_id = await _create_trip(auth_context)
    link_result = await schema.execute(
        CREATE_SHARE_LINK,
        variable_values={"tripId": trip_id, "permission": "VIEWER"},
        context_value=auth_context,
    )
    token = link_result.data["createShareLink"]["token"]

    other_context = make_context(session, other_user)
    accept_result = await schema.execute(
        ACCEPT_SHARE_INVITE, variable_values={"token": token}, context_value=other_context
    )
    assert accept_result.errors is None
    assert accept_result.data["acceptShareInvite"]["title"] == "Japan"

    trip_result = await schema.execute(
        TRIP_QUERY, variable_values={"id": trip_id}, context_value=other_context
    )
    assert trip_result.errors is None
    assert trip_result.data["trip"]["isOwner"] is False
    assert trip_result.data["trip"]["myPermission"] == "VIEWER"
    # Non-owners can't see the collaborator list, even their own trip.
    assert trip_result.data["trip"]["collaborators"] == []

    add_day_result = await schema.execute(
        ADD_DAY,
        variable_values={"tripId": trip_id, "date": "2026-04-02"},
        context_value=other_context,
    )
    assert add_day_result.errors is not None
    assert "Trip not found" in add_day_result.errors[0].message


async def test_accept_editor_invite_grants_write_access(session, auth_context, other_user):
    trip_id = await _create_trip(auth_context)
    link_result = await schema.execute(
        CREATE_SHARE_LINK,
        variable_values={"tripId": trip_id, "permission": "EDITOR"},
        context_value=auth_context,
    )
    token = link_result.data["createShareLink"]["token"]

    other_context = make_context(session, other_user)
    await schema.execute(
        ACCEPT_SHARE_INVITE, variable_values={"token": token}, context_value=other_context
    )

    add_day_result = await schema.execute(
        ADD_DAY,
        variable_values={"tripId": trip_id, "date": "2026-04-02"},
        context_value=other_context,
    )
    assert add_day_result.errors is None


async def test_my_trips_includes_shared_trips(session, auth_context, other_user):
    trip_id = await _create_trip(auth_context)
    link_result = await schema.execute(
        CREATE_SHARE_LINK,
        variable_values={"tripId": trip_id, "permission": "VIEWER"},
        context_value=auth_context,
    )
    token = link_result.data["createShareLink"]["token"]

    other_context = make_context(session, other_user)
    await schema.execute(
        ACCEPT_SHARE_INVITE, variable_values={"token": token}, context_value=other_context
    )

    my_trips_result = await schema.execute(
        "query { myTrips { title } }", context_value=other_context
    )
    assert my_trips_result.errors is None
    assert [t["title"] for t in my_trips_result.data["myTrips"]] == ["Japan"]


async def test_owner_can_remove_and_update_collaborator(session, auth_context, other_user):
    trip_id = await _create_trip(auth_context)
    link_result = await schema.execute(
        CREATE_SHARE_LINK,
        variable_values={"tripId": trip_id, "permission": "VIEWER"},
        context_value=auth_context,
    )
    token = link_result.data["createShareLink"]["token"]

    other_context = make_context(session, other_user)
    await schema.execute(
        ACCEPT_SHARE_INVITE, variable_values={"token": token}, context_value=other_context
    )

    update_result = await schema.execute(
        UPDATE_COLLABORATOR_PERMISSION,
        variable_values={
            "tripId": trip_id,
            "userId": str(other_user.id),
            "permission": "EDITOR",
        },
        context_value=auth_context,
    )
    assert update_result.errors is None
    assert update_result.data["updateCollaboratorPermission"]["permission"] == "EDITOR"

    add_day_result = await schema.execute(
        ADD_DAY,
        variable_values={"tripId": trip_id, "date": "2026-04-02"},
        context_value=other_context,
    )
    assert add_day_result.errors is None

    remove_result = await schema.execute(
        REMOVE_COLLABORATOR,
        variable_values={"tripId": trip_id, "userId": str(other_user.id)},
        context_value=auth_context,
    )
    assert remove_result.data["removeCollaborator"] is True

    trip_after_removal = await schema.execute(
        TRIP_QUERY, variable_values={"id": trip_id}, context_value=other_context
    )
    assert trip_after_removal.data["trip"] is None


async def test_accept_share_invite_enforces_max_collaborators(session, auth_context):
    trip_id = await _create_trip(auth_context)
    link_result = await schema.execute(
        CREATE_SHARE_LINK,
        variable_values={"tripId": trip_id, "permission": "VIEWER"},
        context_value=auth_context,
    )
    token = link_result.data["createShareLink"]["token"]

    async def accept_as_new_user(index):
        new_user = UserModel(email=f"guest{index}@example.com", password_hash=hash_password("password123"))
        session.add(new_user)
        await session.commit()
        return await schema.execute(
            ACCEPT_SHARE_INVITE,
            variable_values={"token": token},
            context_value=make_context(session, new_user),
        )

    # The trip's owner doesn't count towards the cap, so all 10 slots go to guests.
    for index in range(10):
        result = await accept_as_new_user(index)
        assert result.errors is None, result.errors

    over_the_limit = await accept_as_new_user(10)
    assert over_the_limit.errors is not None
    assert "maximum of 10 collaborators" in over_the_limit.errors[0].message
