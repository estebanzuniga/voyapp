from app.schema import schema
from tests.conftest import make_context

CREATE_TRIP = """
mutation($title: String!, $start: Date!, $end: Date!) {
  createTrip(title: $title, startDate: $start, endDate: $end) { id }
}
"""

ADD_DAY = """
mutation($tripId: ID!, $date: Date!) {
  addDay(tripId: $tripId, date: $date) { id date }
}
"""

TRIP_DAYS = """
query($id: ID!) {
  trip(id: $id) { days { date } }
}
"""

DELETE_DAY = """
mutation($id: ID!) {
  deleteDay(id: $id)
}
"""


async def create_trip(context) -> str:
    result = await schema.execute(
        CREATE_TRIP,
        variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
        context_value=context,
    )
    assert result.errors is None
    return result.data["createTrip"]["id"]


async def test_add_day_requires_auth(context):
    result = await schema.execute(
        ADD_DAY, variable_values={"tripId": "1", "date": "2026-04-01"}, context_value=context
    )

    assert result.errors is not None
    assert "Not authenticated" in result.errors[0].message


async def test_add_day_rejects_other_users_trip(session, auth_context, other_user):
    trip_id = await create_trip(auth_context)

    other_context = make_context(session, other_user)
    result = await schema.execute(
        ADD_DAY,
        variable_values={"tripId": trip_id, "date": "2026-04-01"},
        context_value=other_context,
    )

    assert result.errors is not None
    assert "Trip not found" in result.errors[0].message


async def test_add_day_rejects_duplicate_date(auth_context):
    trip_id = await create_trip(auth_context)

    first = await schema.execute(
        ADD_DAY, variable_values={"tripId": trip_id, "date": "2026-04-01"}, context_value=auth_context
    )
    assert first.errors is None

    duplicate = await schema.execute(
        ADD_DAY, variable_values={"tripId": trip_id, "date": "2026-04-01"}, context_value=auth_context
    )
    assert duplicate.errors is not None
    assert "already has a day for that date" in duplicate.errors[0].message


async def test_add_day_allows_same_date_on_different_trips(auth_context):
    first_trip_id = await create_trip(auth_context)
    second_trip_id = await create_trip(auth_context)

    first = await schema.execute(
        ADD_DAY, variable_values={"tripId": first_trip_id, "date": "2026-04-01"}, context_value=auth_context
    )
    second = await schema.execute(
        ADD_DAY, variable_values={"tripId": second_trip_id, "date": "2026-04-01"}, context_value=auth_context
    )
    assert first.errors is None
    assert second.errors is None


async def test_days_are_returned_in_calendar_order_not_add_order(auth_context):
    trip_id = await create_trip(auth_context)

    # Add April 1st and 3rd first, then fill in the 2nd afterwards - it
    # should show up *between* them, not appended after the 3rd just
    # because it was added last.
    for day_date in ("2026-04-01", "2026-04-03", "2026-04-02"):
        result = await schema.execute(
            ADD_DAY, variable_values={"tripId": trip_id, "date": day_date}, context_value=auth_context
        )
        assert result.errors is None

    trip_result = await schema.execute(TRIP_DAYS, variable_values={"id": trip_id}, context_value=auth_context)
    assert trip_result.errors is None
    assert [day["date"] for day in trip_result.data["trip"]["days"]] == [
        "2026-04-01",
        "2026-04-02",
        "2026-04-03",
    ]


async def test_delete_day_rejects_other_users_day(session, auth_context, other_user):
    trip_id = await create_trip(auth_context)
    add_result = await schema.execute(
        ADD_DAY, variable_values={"tripId": trip_id, "date": "2026-04-01"}, context_value=auth_context
    )
    day_id = add_result.data["addDay"]["id"]

    other_context = make_context(session, other_user)
    result = await schema.execute(
        DELETE_DAY, variable_values={"id": day_id}, context_value=other_context
    )

    assert result.errors is not None
    assert "Day not found" in result.errors[0].message
