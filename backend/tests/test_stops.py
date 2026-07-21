from app.schema import schema
from tests.conftest import make_context

CREATE_TRIP = """
mutation($title: String!, $start: Date!, $end: Date!) {
  createTrip(title: $title, startDate: $start, endDate: $end) { id }
}
"""

ADD_DAY = """
mutation($tripId: ID!, $date: Date!) {
  addDay(tripId: $tripId, date: $date) { id }
}
"""

ADD_STOP = """
mutation($dayId: ID!, $name: String!, $location: LocationInput!) {
  addStop(dayId: $dayId, name: $name, location: $location) { id name orderIndex }
}
"""

REORDER_STOPS = """
mutation($dayId: ID!, $stopIds: [ID!]!) {
  reorderStops(dayId: $dayId, stopIds: $stopIds) { id orderIndex }
}
"""

DELETE_STOP = """
mutation($id: ID!) {
  deleteStop(id: $id)
}
"""

LOCATION = {"lat": 35.6, "lng": 139.7}


async def create_trip_and_day(context) -> str:
    trip_result = await schema.execute(
        CREATE_TRIP,
        variable_values={"title": "Japan", "start": "2026-04-01", "end": "2026-04-10"},
        context_value=context,
    )
    assert trip_result.errors is None
    trip_id = trip_result.data["createTrip"]["id"]

    day_result = await schema.execute(
        ADD_DAY, variable_values={"tripId": trip_id, "date": "2026-04-01"}, context_value=context
    )
    assert day_result.errors is None
    return day_result.data["addDay"]["id"]


async def add_stop(context, day_id: str, name: str) -> dict:
    result = await schema.execute(
        ADD_STOP,
        variable_values={"dayId": day_id, "name": name, "location": LOCATION},
        context_value=context,
    )
    assert result.errors is None
    return result.data["addStop"]


async def test_add_stop_requires_auth(context):
    result = await schema.execute(
        ADD_STOP,
        variable_values={"dayId": "1", "name": "Shibuya", "location": LOCATION},
        context_value=context,
    )

    assert result.errors is not None
    assert "Not authenticated" in result.errors[0].message


async def test_add_stop_rejects_other_users_day(session, auth_context, other_user):
    day_id = await create_trip_and_day(auth_context)

    other_context = make_context(session, other_user)
    result = await schema.execute(
        ADD_STOP,
        variable_values={"dayId": day_id, "name": "Shibuya", "location": LOCATION},
        context_value=other_context,
    )

    assert result.errors is not None
    assert "Day not found" in result.errors[0].message


async def test_order_index_reuses_gap_after_delete_stop(auth_context):
    day_id = await create_trip_and_day(auth_context)

    stops = [await add_stop(auth_context, day_id, name) for name in ("Shibuya", "Shinjuku", "Ueno")]
    assert [s["orderIndex"] for s in stops] == [0, 1, 2]

    delete_result = await schema.execute(
        DELETE_STOP, variable_values={"id": stops[1]["id"]}, context_value=auth_context
    )
    assert delete_result.errors is None
    assert delete_result.data["deleteStop"] is True

    new_stop = await add_stop(auth_context, day_id, "Akihabara")
    assert new_stop["orderIndex"] == 3


async def test_reorder_stops_rewrites_order_index(auth_context):
    day_id = await create_trip_and_day(auth_context)
    stops = [await add_stop(auth_context, day_id, name) for name in ("Shibuya", "Shinjuku", "Ueno")]
    stop_ids = [s["id"] for s in stops]

    result = await schema.execute(
        REORDER_STOPS,
        variable_values={"dayId": day_id, "stopIds": list(reversed(stop_ids))},
        context_value=auth_context,
    )

    assert result.errors is None
    assert [s["id"] for s in result.data["reorderStops"]] == list(reversed(stop_ids))
    assert [s["orderIndex"] for s in result.data["reorderStops"]] == [0, 1, 2]


async def test_reorder_stops_rejects_mismatched_ids(auth_context):
    day_id = await create_trip_and_day(auth_context)
    stops = [await add_stop(auth_context, day_id, name) for name in ("Shibuya", "Shinjuku")]
    stop_ids = [s["id"] for s in stops]

    result = await schema.execute(
        REORDER_STOPS,
        variable_values={"dayId": day_id, "stopIds": [stop_ids[0]]},
        context_value=auth_context,
    )

    assert result.errors is not None
    assert "stopIds must match the day's current stops exactly" in result.errors[0].message


async def test_delete_stop_rejects_other_users_stop(session, auth_context, other_user):
    day_id = await create_trip_and_day(auth_context)
    stop = await add_stop(auth_context, day_id, "Shibuya")

    other_context = make_context(session, other_user)
    result = await schema.execute(
        DELETE_STOP, variable_values={"id": stop["id"]}, context_value=other_context
    )

    assert result.errors is not None
    assert "Stop not found" in result.errors[0].message
