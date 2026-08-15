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

UPDATE_STOP = """
mutation($id: ID!, $name: String!, $location: LocationInput!) {
  updateStop(id: $id, name: $name, location: $location) { id name location { lat lng } }
}
"""

DELETE_STOP = """
mutation($id: ID!) {
  deleteStop(id: $id)
}
"""

DUPLICATE_STOP = """
mutation($id: ID!) {
  duplicateStop(id: $id) { id name orderIndex notes startTime }
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


async def test_add_stop_accepts_notes_and_start_time(auth_context):
    day_id = await create_trip_and_day(auth_context)

    result = await schema.execute(
        """
        mutation($dayId: ID!, $name: String!, $location: LocationInput!, $notes: String, $startTime: Time) {
          addStop(dayId: $dayId, name: $name, location: $location, notes: $notes, startTime: $startTime) {
            notes
            startTime
          }
        }
        """,
        variable_values={
            "dayId": day_id,
            "name": "Shibuya",
            "location": LOCATION,
            "notes": "Meet at the statue",
            "startTime": "09:30:00",
        },
        context_value=auth_context,
    )

    assert result.errors is None
    assert result.data["addStop"]["notes"] == "Meet at the statue"
    assert result.data["addStop"]["startTime"] == "09:30:00"


async def test_update_stop_changes_notes_and_start_time(auth_context):
    day_id = await create_trip_and_day(auth_context)
    stop = await add_stop(auth_context, day_id, "Shibuya")

    result = await schema.execute(
        """
        mutation($id: ID!, $name: String!, $location: LocationInput!, $notes: String, $startTime: Time) {
          updateStop(id: $id, name: $name, location: $location, notes: $notes, startTime: $startTime) {
            notes
            startTime
          }
        }
        """,
        variable_values={
            "id": stop["id"],
            "name": stop["name"],
            "location": LOCATION,
            "notes": "Bring cash",
            "startTime": "14:00:00",
        },
        context_value=auth_context,
    )

    assert result.errors is None
    assert result.data["updateStop"]["notes"] == "Bring cash"
    assert result.data["updateStop"]["startTime"] == "14:00:00"


async def test_update_stop_changes_name_and_location(auth_context):
    day_id = await create_trip_and_day(auth_context)
    stop = await add_stop(auth_context, day_id, "Shibuya")

    new_location = {"lat": 35.7, "lng": 139.8}
    result = await schema.execute(
        UPDATE_STOP,
        variable_values={"id": stop["id"], "name": "Shibuya Crossing", "location": new_location},
        context_value=auth_context,
    )

    assert result.errors is None
    assert result.data["updateStop"]["name"] == "Shibuya Crossing"
    assert result.data["updateStop"]["location"] == new_location


async def test_update_stop_requires_auth(context):
    result = await schema.execute(
        UPDATE_STOP,
        variable_values={"id": "1", "name": "Shibuya", "location": LOCATION},
        context_value=context,
    )

    assert result.errors is not None
    assert "Not authenticated" in result.errors[0].message


async def test_update_stop_rejects_other_users_stop(session, auth_context, other_user):
    day_id = await create_trip_and_day(auth_context)
    stop = await add_stop(auth_context, day_id, "Shibuya")

    other_context = make_context(session, other_user)
    result = await schema.execute(
        UPDATE_STOP,
        variable_values={"id": stop["id"], "name": "Hacked", "location": LOCATION},
        context_value=other_context,
    )

    assert result.errors is not None
    assert "Stop not found" in result.errors[0].message


async def test_delete_stop_rejects_other_users_stop(session, auth_context, other_user):
    day_id = await create_trip_and_day(auth_context)
    stop = await add_stop(auth_context, day_id, "Shibuya")

    other_context = make_context(session, other_user)
    result = await schema.execute(
        DELETE_STOP, variable_values={"id": stop["id"]}, context_value=other_context
    )

    assert result.errors is not None
    assert "Stop not found" in result.errors[0].message


async def test_duplicate_stop_inserts_copy_after_original(auth_context):
    day_id = await create_trip_and_day(auth_context)
    stops = [await add_stop(auth_context, day_id, name) for name in ("Shibuya", "Shinjuku", "Ueno")]

    result = await schema.execute(
        DUPLICATE_STOP, variable_values={"id": stops[0]["id"]}, context_value=auth_context
    )

    assert result.errors is None
    duplicate = result.data["duplicateStop"]
    assert duplicate["name"] == "Shibuya"
    assert duplicate["orderIndex"] == 1

    reorder_result = await schema.execute(
        REORDER_STOPS,
        variable_values={
            "dayId": day_id,
            "stopIds": [stops[0]["id"], duplicate["id"], stops[1]["id"], stops[2]["id"]],
        },
        context_value=auth_context,
    )
    assert reorder_result.errors is None
    assert [s["orderIndex"] for s in reorder_result.data["reorderStops"]] == [0, 1, 2, 3]


async def test_duplicate_stop_copies_notes_and_start_time(auth_context):
    day_id = await create_trip_and_day(auth_context)
    add_result = await schema.execute(
        """
        mutation($dayId: ID!, $name: String!, $location: LocationInput!, $notes: String, $startTime: Time) {
          addStop(dayId: $dayId, name: $name, location: $location, notes: $notes, startTime: $startTime) {
            id
          }
        }
        """,
        variable_values={
            "dayId": day_id,
            "name": "Shibuya",
            "location": LOCATION,
            "notes": "Meet at the statue",
            "startTime": "09:30:00",
        },
        context_value=auth_context,
    )
    assert add_result.errors is None
    stop_id = add_result.data["addStop"]["id"]

    result = await schema.execute(
        DUPLICATE_STOP, variable_values={"id": stop_id}, context_value=auth_context
    )

    assert result.errors is None
    assert result.data["duplicateStop"]["notes"] == "Meet at the statue"
    assert result.data["duplicateStop"]["startTime"] == "09:30:00"


async def test_duplicate_stop_requires_auth(context):
    result = await schema.execute(
        DUPLICATE_STOP, variable_values={"id": "1"}, context_value=context
    )

    assert result.errors is not None
    assert "Not authenticated" in result.errors[0].message


async def test_duplicate_stop_rejects_other_users_stop(session, auth_context, other_user):
    day_id = await create_trip_and_day(auth_context)
    stop = await add_stop(auth_context, day_id, "Shibuya")

    other_context = make_context(session, other_user)
    result = await schema.execute(
        DUPLICATE_STOP, variable_values={"id": stop["id"]}, context_value=other_context
    )

    assert result.errors is not None
    assert "Stop not found" in result.errors[0].message
