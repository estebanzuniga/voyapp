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

CREATE_CITY = """
mutation($tripId: ID!, $name: String!) {
  createCity(tripId: $tripId, name: $name) { id name }
}
"""

RENAME_CITY = """
mutation($id: ID!, $name: String!) {
  renameCity(id: $id, name: $name) { id name }
}
"""

DELETE_CITY = """
mutation($id: ID!) {
  deleteCity(id: $id)
}
"""

SET_DAY_CITY = """
mutation($dayId: ID!, $cityId: ID) {
  setDayCity(dayId: $dayId, cityId: $cityId) { id cityId }
}
"""

ADD_STOP = """
mutation($dayId: ID, $cityId: ID, $name: String!, $location: LocationInput!, $startTime: Time) {
  addStop(dayId: $dayId, cityId: $cityId, name: $name, location: $location, startTime: $startTime) {
    id
    name
    orderIndex
    startTime
  }
}
"""

REORDER_STOPS = """
mutation($dayId: ID, $cityId: ID, $stopIds: [ID!]!) {
  reorderStops(dayId: $dayId, cityId: $cityId, stopIds: $stopIds) { id orderIndex }
}
"""

MOVE_STOP = """
mutation($stopId: ID!, $toIndex: Int!, $toDayId: ID, $toCityId: ID) {
  moveStop(stopId: $stopId, toIndex: $toIndex, toDayId: $toDayId, toCityId: $toCityId) {
    id
    orderIndex
    startTime
  }
}
"""

UPDATE_STOP = """
mutation($id: ID!, $name: String!, $location: LocationInput!, $startTime: Time) {
  updateStop(id: $id, name: $name, location: $location, startTime: $startTime) { id startTime }
}
"""

DUPLICATE_STOP = """
mutation($id: ID!) {
  duplicateStop(id: $id) { id orderIndex }
}
"""

DELETE_STOP = """
mutation($id: ID!) {
  deleteStop(id: $id)
}
"""

TRIP_CITIES = """
query($id: ID!) {
  trip(id: $id) {
    cities { id name stops { id name } }
    days { id cityId }
  }
}
"""

LOCATION = {"lat": 48.85, "lng": 2.35}


async def create_trip(context) -> str:
    result = await schema.execute(
        CREATE_TRIP,
        variable_values={"title": "Europe", "start": "2026-05-01", "end": "2026-05-10"},
        context_value=context,
    )
    assert result.errors is None
    return result.data["createTrip"]["id"]


async def create_trip_and_day(context) -> tuple[str, str]:
    trip_id = await create_trip(context)
    day_result = await schema.execute(
        ADD_DAY, variable_values={"tripId": trip_id, "date": "2026-05-01"}, context_value=context
    )
    assert day_result.errors is None
    return trip_id, day_result.data["addDay"]["id"]


async def create_city(context, trip_id: str, name: str = "Paris") -> str:
    result = await schema.execute(
        CREATE_CITY, variable_values={"tripId": trip_id, "name": name}, context_value=context
    )
    assert result.errors is None
    return result.data["createCity"]["id"]


# --- create/rename/delete city -------------------------------------------


async def test_create_city_requires_auth(context):
    result = await schema.execute(
        CREATE_CITY, variable_values={"tripId": "1", "name": "Paris"}, context_value=context
    )

    assert result.errors is not None
    assert "Not authenticated" in result.errors[0].message


async def test_create_city_requires_editor_access(session, auth_context, other_user):
    trip_id = await create_trip(auth_context)
    other_context = make_context(session, other_user)

    result = await schema.execute(
        CREATE_CITY, variable_values={"tripId": trip_id, "name": "Paris"}, context_value=other_context
    )

    assert result.errors is not None
    assert "Trip not found" in result.errors[0].message


async def test_create_city_rejects_blank_name(auth_context):
    trip_id = await create_trip(auth_context)

    result = await schema.execute(
        CREATE_CITY, variable_values={"tripId": trip_id, "name": "   "}, context_value=auth_context
    )

    assert result.errors is not None
    assert "City name is required" in result.errors[0].message


async def test_rename_city_changes_name(auth_context):
    trip_id = await create_trip(auth_context)
    city_id = await create_city(auth_context, trip_id)

    result = await schema.execute(
        RENAME_CITY, variable_values={"id": city_id, "name": "Paris, France"}, context_value=auth_context
    )

    assert result.errors is None
    assert result.data["renameCity"]["name"] == "Paris, France"


async def test_delete_city_succeeds_when_empty(auth_context):
    trip_id = await create_trip(auth_context)
    city_id = await create_city(auth_context, trip_id)

    result = await schema.execute(
        DELETE_CITY, variable_values={"id": city_id}, context_value=auth_context
    )

    assert result.errors is None
    assert result.data["deleteCity"] is True


async def test_delete_city_blocked_when_a_day_is_assigned(auth_context):
    trip_id, day_id = await create_trip_and_day(auth_context)
    city_id = await create_city(auth_context, trip_id)
    await schema.execute(
        SET_DAY_CITY, variable_values={"dayId": day_id, "cityId": city_id}, context_value=auth_context
    )

    result = await schema.execute(
        DELETE_CITY, variable_values={"id": city_id}, context_value=auth_context
    )

    assert result.errors is not None
    assert "move or remove them first" in result.errors[0].message


async def test_delete_city_blocked_when_it_has_stops(auth_context):
    trip_id = await create_trip(auth_context)
    city_id = await create_city(auth_context, trip_id)
    await schema.execute(
        ADD_STOP,
        variable_values={"cityId": city_id, "name": "Le Comptoir", "location": LOCATION},
        context_value=auth_context,
    )

    result = await schema.execute(
        DELETE_CITY, variable_values={"id": city_id}, context_value=auth_context
    )

    assert result.errors is not None
    assert "move or remove them first" in result.errors[0].message


# --- set_day_city ----------------------------------------------------------


async def test_set_day_city_assigns_and_clears(auth_context):
    trip_id, day_id = await create_trip_and_day(auth_context)
    city_id = await create_city(auth_context, trip_id)

    assign_result = await schema.execute(
        SET_DAY_CITY, variable_values={"dayId": day_id, "cityId": city_id}, context_value=auth_context
    )
    assert assign_result.errors is None
    assert assign_result.data["setDayCity"]["cityId"] == city_id

    clear_result = await schema.execute(
        SET_DAY_CITY, variable_values={"dayId": day_id, "cityId": None}, context_value=auth_context
    )
    assert clear_result.errors is None
    assert clear_result.data["setDayCity"]["cityId"] is None


async def test_set_day_city_rejects_city_from_another_trip(auth_context):
    _, day_id = await create_trip_and_day(auth_context)
    other_trip_id = await create_trip(auth_context)
    other_trip_city_id = await create_city(auth_context, other_trip_id)

    result = await schema.execute(
        SET_DAY_CITY,
        variable_values={"dayId": day_id, "cityId": other_trip_city_id},
        context_value=auth_context,
    )

    assert result.errors is not None
    assert "City not found" in result.errors[0].message


# --- city-scoped stops (recommendations) -----------------------------------


async def test_add_stop_to_city_omits_start_time(auth_context):
    trip_id = await create_trip(auth_context)
    city_id = await create_city(auth_context, trip_id)

    result = await schema.execute(
        ADD_STOP,
        variable_values={"cityId": city_id, "name": "Le Comptoir", "location": LOCATION},
        context_value=auth_context,
    )

    assert result.errors is None
    assert result.data["addStop"]["startTime"] is None


async def test_add_stop_rejects_start_time_on_a_city_stop(auth_context):
    trip_id = await create_trip(auth_context)
    city_id = await create_city(auth_context, trip_id)

    result = await schema.execute(
        ADD_STOP,
        variable_values={
            "cityId": city_id,
            "name": "Le Comptoir",
            "location": LOCATION,
            "startTime": "19:00:00",
        },
        context_value=auth_context,
    )

    assert result.errors is not None
    assert "can't have a start time" in result.errors[0].message


async def test_add_stop_rejects_both_day_and_city(auth_context):
    trip_id, day_id = await create_trip_and_day(auth_context)
    city_id = await create_city(auth_context, trip_id)

    result = await schema.execute(
        ADD_STOP,
        variable_values={
            "dayId": day_id,
            "cityId": city_id,
            "name": "Le Comptoir",
            "location": LOCATION,
        },
        context_value=auth_context,
    )

    assert result.errors is not None
    assert "exactly one of a day or a city" in result.errors[0].message


async def test_add_stop_rejects_neither_day_nor_city(auth_context):
    result = await schema.execute(
        ADD_STOP,
        variable_values={"name": "Le Comptoir", "location": LOCATION},
        context_value=auth_context,
    )

    assert result.errors is not None
    assert "exactly one of a day or a city" in result.errors[0].message


async def test_update_stop_rejects_start_time_on_existing_city_stop(auth_context):
    trip_id = await create_trip(auth_context)
    city_id = await create_city(auth_context, trip_id)
    add_result = await schema.execute(
        ADD_STOP,
        variable_values={"cityId": city_id, "name": "Le Comptoir", "location": LOCATION},
        context_value=auth_context,
    )
    stop_id = add_result.data["addStop"]["id"]

    result = await schema.execute(
        UPDATE_STOP,
        variable_values={
            "id": stop_id,
            "name": "Le Comptoir",
            "location": LOCATION,
            "startTime": "19:00:00",
        },
        context_value=auth_context,
    )

    assert result.errors is not None
    assert "can't have a start time" in result.errors[0].message


async def test_reorder_city_stops(auth_context):
    trip_id = await create_trip(auth_context)
    city_id = await create_city(auth_context, trip_id)
    stop_ids = []
    for name in ("A", "B"):
        result = await schema.execute(
            ADD_STOP,
            variable_values={"cityId": city_id, "name": name, "location": LOCATION},
            context_value=auth_context,
        )
        stop_ids.append(result.data["addStop"]["id"])

    result = await schema.execute(
        REORDER_STOPS,
        variable_values={"cityId": city_id, "stopIds": list(reversed(stop_ids))},
        context_value=auth_context,
    )

    assert result.errors is None
    assert [s["id"] for s in result.data["reorderStops"]] == list(reversed(stop_ids))


async def test_duplicate_city_stop_stays_in_city(auth_context):
    trip_id = await create_trip(auth_context)
    city_id = await create_city(auth_context, trip_id)
    add_result = await schema.execute(
        ADD_STOP,
        variable_values={"cityId": city_id, "name": "Le Comptoir", "location": LOCATION},
        context_value=auth_context,
    )
    stop_id = add_result.data["addStop"]["id"]

    dup_result = await schema.execute(
        DUPLICATE_STOP, variable_values={"id": stop_id}, context_value=auth_context
    )
    assert dup_result.errors is None

    trip_result = await schema.execute(
        TRIP_CITIES, variable_values={"id": trip_id}, context_value=auth_context
    )
    assert len(trip_result.data["trip"]["cities"][0]["stops"]) == 2


async def test_delete_city_stop(auth_context):
    trip_id = await create_trip(auth_context)
    city_id = await create_city(auth_context, trip_id)
    add_result = await schema.execute(
        ADD_STOP,
        variable_values={"cityId": city_id, "name": "Le Comptoir", "location": LOCATION},
        context_value=auth_context,
    )
    stop_id = add_result.data["addStop"]["id"]

    result = await schema.execute(
        DELETE_STOP, variable_values={"id": stop_id}, context_value=auth_context
    )
    assert result.errors is None
    assert result.data["deleteStop"] is True


# --- promote/demote via move_stop ------------------------------------------


async def test_move_stop_from_day_to_city_clears_start_time(auth_context):
    trip_id, day_id = await create_trip_and_day(auth_context)
    city_id = await create_city(auth_context, trip_id)
    add_result = await schema.execute(
        ADD_STOP,
        variable_values={
            "dayId": day_id,
            "name": "Louvre",
            "location": LOCATION,
            "startTime": "10:00:00",
        },
        context_value=auth_context,
    )
    stop_id = add_result.data["addStop"]["id"]
    assert add_result.data["addStop"]["startTime"] == "10:00:00"

    result = await schema.execute(
        MOVE_STOP,
        variable_values={"stopId": stop_id, "toIndex": 0, "toCityId": city_id},
        context_value=auth_context,
    )

    assert result.errors is None
    assert result.data["moveStop"]["startTime"] is None


async def test_move_stop_from_city_to_day(auth_context):
    trip_id, day_id = await create_trip_and_day(auth_context)
    city_id = await create_city(auth_context, trip_id)
    add_result = await schema.execute(
        ADD_STOP,
        variable_values={"cityId": city_id, "name": "Louvre", "location": LOCATION},
        context_value=auth_context,
    )
    stop_id = add_result.data["addStop"]["id"]

    result = await schema.execute(
        MOVE_STOP,
        variable_values={"stopId": stop_id, "toIndex": 0, "toDayId": day_id},
        context_value=auth_context,
    )

    assert result.errors is None

    trip_result = await schema.execute(
        TRIP_CITIES, variable_values={"id": trip_id}, context_value=auth_context
    )
    assert trip_result.data["trip"]["cities"][0]["stops"] == []


async def test_move_stop_rejects_both_targets(auth_context):
    trip_id, day_id = await create_trip_and_day(auth_context)
    city_id = await create_city(auth_context, trip_id)
    add_result = await schema.execute(
        ADD_STOP,
        variable_values={"dayId": day_id, "name": "Louvre", "location": LOCATION},
        context_value=auth_context,
    )
    stop_id = add_result.data["addStop"]["id"]

    result = await schema.execute(
        MOVE_STOP,
        variable_values={"stopId": stop_id, "toIndex": 0, "toDayId": day_id, "toCityId": city_id},
        context_value=auth_context,
    )

    assert result.errors is not None
    assert "exactly one of a day or a city" in result.errors[0].message


# --- viewer-permission access -----------------------------------------------


async def test_city_stop_mutations_reject_stranger(session, auth_context, other_user):
    trip_id = await create_trip(auth_context)
    city_id = await create_city(auth_context, trip_id)

    other_context = make_context(session, other_user)
    result = await schema.execute(
        ADD_STOP,
        variable_values={"cityId": city_id, "name": "Le Comptoir", "location": LOCATION},
        context_value=other_context,
    )

    assert result.errors is not None
    assert "City not found" in result.errors[0].message
