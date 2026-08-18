from app.schema import schema
from tests.conftest import make_context

CREATE_TRIP = """
mutation($title: String!, $start: Date!, $end: Date!) {
  createTrip(title: $title, startDate: $start, endDate: $end) { id title }
}
"""

TRIP_QUERY = """
query($id: ID!) {
  trip(id: $id) { id title }
}
"""

UPDATE_TRIP = """
mutation($id: ID!, $title: String!, $start: Date!, $end: Date!) {
  updateTrip(id: $id, title: $title, startDate: $start, endDate: $end) {
    id title startDate endDate
    days { date }
  }
}
"""

DELETE_TRIP = """
mutation($id: ID!) {
  deleteTrip(id: $id)
}
"""

ADD_DAY = """
mutation($tripId: ID!, $date: Date!) {
  addDay(tripId: $tripId, date: $date) { id }
}
"""

ADD_STOP = """
mutation($dayId: ID!, $name: String!, $location: LocationInput!) {
  addStop(dayId: $dayId, name: $name, location: $location) { id }
}
"""

LOCATION = {"lat": 35.0, "lng": 139.0}


async def test_create_trip_requires_auth(context):
    result = await schema.execute(
        CREATE_TRIP,
        variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
        context_value=context,
    )

    assert result.errors is not None
    assert "Not authenticated" in result.errors[0].message


async def test_create_trip_and_fetch_via_my_trips(auth_context):
    create_result = await schema.execute(
        CREATE_TRIP,
        variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
        context_value=auth_context,
    )
    assert create_result.errors is None

    list_result = await schema.execute(
        "query { myTrips { title } }",
        context_value=auth_context,
    )
    assert list_result.errors is None
    assert [t["title"] for t in list_result.data["myTrips"]] == ["Japan"]


async def test_trip_query_returns_owned_trip(auth_context):
    create_result = await schema.execute(
        CREATE_TRIP,
        variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
        context_value=auth_context,
    )
    trip_id = create_result.data["createTrip"]["id"]

    result = await schema.execute(
        TRIP_QUERY, variable_values={"id": trip_id}, context_value=auth_context
    )

    assert result.errors is None
    assert result.data["trip"]["title"] == "Japan"


async def test_trip_query_hides_other_users_trip(session, auth_context, other_user):
    create_result = await schema.execute(
        CREATE_TRIP,
        variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
        context_value=auth_context,
    )
    trip_id = create_result.data["createTrip"]["id"]

    other_context = make_context(session, other_user)
    result = await schema.execute(
        TRIP_QUERY, variable_values={"id": trip_id}, context_value=other_context
    )

    assert result.errors is None
    assert result.data["trip"] is None


async def test_trip_query_nonexistent_id_returns_none(auth_context):
    result = await schema.execute(
        TRIP_QUERY, variable_values={"id": "999999"}, context_value=auth_context
    )

    assert result.errors is None
    assert result.data["trip"] is None


async def test_update_trip_changes_title_and_dates(auth_context):
    trip_id = (
        await schema.execute(
            CREATE_TRIP,
            variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
            context_value=auth_context,
        )
    ).data["createTrip"]["id"]

    result = await schema.execute(
        UPDATE_TRIP,
        variable_values={"id": trip_id, "title": "Japan Trip", "start": "2026-04-02", "end": "2026-04-09"},
        context_value=auth_context,
    )

    assert result.errors is None
    trip = result.data["updateTrip"]
    assert trip["title"] == "Japan Trip"
    assert trip["startDate"] == "2026-04-02"
    assert trip["endDate"] == "2026-04-09"


async def test_update_trip_rejects_blank_title(auth_context):
    trip_id = (
        await schema.execute(
            CREATE_TRIP,
            variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
            context_value=auth_context,
        )
    ).data["createTrip"]["id"]

    result = await schema.execute(
        UPDATE_TRIP,
        variable_values={"id": trip_id, "title": "   ", "start": "2026-04-01", "end": "2026-04-10"},
        context_value=auth_context,
    )

    assert result.errors is not None
    assert "Trip title is required" in result.errors[0].message


async def test_update_trip_rejects_end_before_start(auth_context):
    trip_id = (
        await schema.execute(
            CREATE_TRIP,
            variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
            context_value=auth_context,
        )
    ).data["createTrip"]["id"]

    result = await schema.execute(
        UPDATE_TRIP,
        variable_values={"id": trip_id, "title": "Japan", "start": "2026-04-10", "end": "2026-04-01"},
        context_value=auth_context,
    )

    assert result.errors is not None
    assert "Start date must be before end date" in result.errors[0].message


async def test_update_trip_rejects_other_users_trip(session, auth_context, other_user):
    trip_id = (
        await schema.execute(
            CREATE_TRIP,
            variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
            context_value=auth_context,
        )
    ).data["createTrip"]["id"]

    other_context = make_context(session, other_user)
    result = await schema.execute(
        UPDATE_TRIP,
        variable_values={"id": trip_id, "title": "Hijacked", "start": "2026-04-01", "end": "2026-04-10"},
        context_value=other_context,
    )

    assert result.errors is not None
    assert "Trip not found" in result.errors[0].message


async def test_update_trip_expansion_keeps_all_days(auth_context):
    trip_id = (
        await schema.execute(
            CREATE_TRIP,
            variable_values={"title": "Japan", "start": "2026-04-02", "end": "2026-04-09"},
            context_value=auth_context,
        )
    ).data["createTrip"]["id"]
    await schema.execute(
        ADD_DAY, variable_values={"tripId": trip_id, "date": "2026-04-02"}, context_value=auth_context
    )

    result = await schema.execute(
        UPDATE_TRIP,
        variable_values={"id": trip_id, "title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
        context_value=auth_context,
    )

    assert result.errors is None
    assert [d["date"] for d in result.data["updateTrip"]["days"]] == ["2026-04-02"]


async def test_update_trip_shrink_deletes_empty_days_outside_new_range(auth_context):
    trip_id = (
        await schema.execute(
            CREATE_TRIP,
            variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
            context_value=auth_context,
        )
    ).data["createTrip"]["id"]
    # Day with no stops - outside the shrunk range, should be silently removed.
    await schema.execute(
        ADD_DAY, variable_values={"tripId": trip_id, "date": "2026-04-01"}, context_value=auth_context
    )
    # Day that stays inside the shrunk range.
    await schema.execute(
        ADD_DAY, variable_values={"tripId": trip_id, "date": "2026-04-05"}, context_value=auth_context
    )

    result = await schema.execute(
        UPDATE_TRIP,
        variable_values={"id": trip_id, "title": "Japan", "start": "2026-04-03", "end": "2026-04-10"},
        context_value=auth_context,
    )

    assert result.errors is None
    assert [d["date"] for d in result.data["updateTrip"]["days"]] == ["2026-04-05"]


async def test_update_trip_shrink_rejects_removing_a_day_with_stops(auth_context):
    trip_id = (
        await schema.execute(
            CREATE_TRIP,
            variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
            context_value=auth_context,
        )
    ).data["createTrip"]["id"]
    day_id = (
        await schema.execute(
            ADD_DAY, variable_values={"tripId": trip_id, "date": "2026-04-01"}, context_value=auth_context
        )
    ).data["addDay"]["id"]
    await schema.execute(
        ADD_STOP,
        variable_values={"dayId": day_id, "name": "Shibuya", "location": LOCATION},
        context_value=auth_context,
    )

    result = await schema.execute(
        UPDATE_TRIP,
        variable_values={"id": trip_id, "title": "Japan", "start": "2026-04-03", "end": "2026-04-10"},
        context_value=auth_context,
    )

    assert result.errors is not None
    assert "already have stops planned" in result.errors[0].message
    assert "2026-04-01" in result.errors[0].message
    # Structured so the frontend can render this in the viewer's own
    # language instead of always showing the English `message` above.
    assert result.errors[0].extensions == {"code": "TRIP_SHRINK_BLOCKED", "dates": ["2026-04-01"]}

    # Nothing should have been changed or deleted.
    check = await schema.execute(TRIP_QUERY, variable_values={"id": trip_id}, context_value=auth_context)
    assert check.data["trip"]["title"] == "Japan"


async def test_update_trip_rejects_blank_title_with_error_code(auth_context):
    trip_id = (
        await schema.execute(
            CREATE_TRIP,
            variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
            context_value=auth_context,
        )
    ).data["createTrip"]["id"]

    result = await schema.execute(
        UPDATE_TRIP,
        variable_values={"id": trip_id, "title": "   ", "start": "2026-04-01", "end": "2026-04-10"},
        context_value=auth_context,
    )

    assert result.errors is not None
    assert result.errors[0].extensions == {"code": "TRIP_TITLE_REQUIRED"}


async def test_update_trip_rejects_end_before_start_with_error_code(auth_context):
    trip_id = (
        await schema.execute(
            CREATE_TRIP,
            variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
            context_value=auth_context,
        )
    ).data["createTrip"]["id"]

    result = await schema.execute(
        UPDATE_TRIP,
        variable_values={"id": trip_id, "title": "Japan", "start": "2026-04-10", "end": "2026-04-01"},
        context_value=auth_context,
    )

    assert result.errors is not None
    assert result.errors[0].extensions == {"code": "TRIP_INVALID_DATE_RANGE"}


async def test_delete_trip_removes_trip_and_everything_under_it(auth_context):
    trip_id = (
        await schema.execute(
            CREATE_TRIP,
            variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
            context_value=auth_context,
        )
    ).data["createTrip"]["id"]
    day_id = (
        await schema.execute(
            ADD_DAY, variable_values={"tripId": trip_id, "date": "2026-04-01"}, context_value=auth_context
        )
    ).data["addDay"]["id"]
    await schema.execute(
        ADD_STOP,
        variable_values={"dayId": day_id, "name": "Shibuya", "location": LOCATION},
        context_value=auth_context,
    )

    result = await schema.execute(DELETE_TRIP, variable_values={"id": trip_id}, context_value=auth_context)

    assert result.errors is None
    assert result.data["deleteTrip"] is True

    check = await schema.execute(TRIP_QUERY, variable_values={"id": trip_id}, context_value=auth_context)
    assert check.data["trip"] is None


async def test_delete_trip_rejects_non_owner(session, auth_context, other_user):
    trip_id = (
        await schema.execute(
            CREATE_TRIP,
            variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
            context_value=auth_context,
        )
    ).data["createTrip"]["id"]

    other_context = make_context(session, other_user)
    result = await schema.execute(DELETE_TRIP, variable_values={"id": trip_id}, context_value=other_context)

    assert result.errors is not None
    assert "Trip not found" in result.errors[0].message


async def test_delete_trip_nonexistent_returns_false(auth_context):
    result = await schema.execute(
        DELETE_TRIP, variable_values={"id": "999999"}, context_value=auth_context
    )

    assert result.errors is None
    assert result.data["deleteTrip"] is False
