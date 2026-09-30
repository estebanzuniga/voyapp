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

CREATE_STOP_CATEGORY = """
mutation($tripId: ID!, $name: String!, $emoji: String!) {
  createStopCategory(tripId: $tripId, name: $name, emoji: $emoji) { id name emoji }
}
"""

UPDATE_STOP_CATEGORY = """
mutation($id: ID!, $name: String!, $emoji: String!) {
  updateStopCategory(id: $id, name: $name, emoji: $emoji) { id name emoji }
}
"""

DELETE_STOP_CATEGORY = """
mutation($id: ID!) {
  deleteStopCategory(id: $id)
}
"""

ADD_STOP = """
mutation($dayId: ID, $cityId: ID, $categoryId: ID, $name: String!, $location: LocationInput!) {
  addStop(dayId: $dayId, cityId: $cityId, categoryId: $categoryId, name: $name, location: $location) {
    id
    categoryId
  }
}
"""

UPDATE_STOP = """
mutation($id: ID!, $name: String!, $location: LocationInput!, $categoryId: ID) {
  updateStop(id: $id, name: $name, location: $location, categoryId: $categoryId) {
    id
    categoryId
  }
}
"""

DUPLICATE_STOP = """
mutation($id: ID!) {
  duplicateStop(id: $id) { id categoryId }
}
"""

DELETE_TRIP = """
mutation($id: ID!) {
  deleteTrip(id: $id)
}
"""

TRIP_STOP_CATEGORIES = """
query($id: ID!) {
  trip(id: $id) {
    stopCategories { id name emoji }
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


async def create_stop_category(context, trip_id: str, name: str = "Food", emoji: str = "🍽️") -> str:
    result = await schema.execute(
        CREATE_STOP_CATEGORY,
        variable_values={"tripId": trip_id, "name": name, "emoji": emoji},
        context_value=context,
    )
    assert result.errors is None
    return result.data["createStopCategory"]["id"]


# --- create/update/delete stop category -------------------------------------


async def test_create_stop_category_requires_auth(context):
    result = await schema.execute(
        CREATE_STOP_CATEGORY,
        variable_values={"tripId": "1", "name": "Food", "emoji": "🍽️"},
        context_value=context,
    )

    assert result.errors is not None
    assert "Not authenticated" in result.errors[0].message


async def test_create_stop_category_requires_editor_access(session, auth_context, other_user):
    trip_id = await create_trip(auth_context)
    other_context = make_context(session, other_user)

    result = await schema.execute(
        CREATE_STOP_CATEGORY,
        variable_values={"tripId": trip_id, "name": "Food", "emoji": "🍽️"},
        context_value=other_context,
    )

    assert result.errors is not None
    assert "Trip not found" in result.errors[0].message


async def test_create_stop_category_rejects_blank_name(auth_context):
    trip_id = await create_trip(auth_context)

    result = await schema.execute(
        CREATE_STOP_CATEGORY,
        variable_values={"tripId": trip_id, "name": "   ", "emoji": "🍽️"},
        context_value=auth_context,
    )

    assert result.errors is not None
    assert "Category name is required" in result.errors[0].message


async def test_create_stop_category_rejects_blank_emoji(auth_context):
    trip_id = await create_trip(auth_context)

    result = await schema.execute(
        CREATE_STOP_CATEGORY,
        variable_values={"tripId": trip_id, "name": "Food", "emoji": "  "},
        context_value=auth_context,
    )

    assert result.errors is not None
    assert "Category emoji is required" in result.errors[0].message


async def test_update_stop_category_changes_name_and_emoji(auth_context):
    trip_id = await create_trip(auth_context)
    category_id = await create_stop_category(auth_context, trip_id)

    result = await schema.execute(
        UPDATE_STOP_CATEGORY,
        variable_values={"id": category_id, "name": "Restaurants", "emoji": "🍕"},
        context_value=auth_context,
    )

    assert result.errors is None
    assert result.data["updateStopCategory"]["name"] == "Restaurants"
    assert result.data["updateStopCategory"]["emoji"] == "🍕"


async def test_delete_stop_category_succeeds_when_unused(auth_context):
    trip_id = await create_trip(auth_context)
    category_id = await create_stop_category(auth_context, trip_id)

    result = await schema.execute(
        DELETE_STOP_CATEGORY, variable_values={"id": category_id}, context_value=auth_context
    )

    assert result.errors is None
    assert result.data["deleteStopCategory"] is True


async def test_delete_stop_category_blocked_when_assigned_to_a_stop(auth_context):
    trip_id = await create_trip(auth_context)
    city_id = await create_city(auth_context, trip_id)
    category_id = await create_stop_category(auth_context, trip_id)
    await schema.execute(
        ADD_STOP,
        variable_values={
            "cityId": city_id,
            "categoryId": category_id,
            "name": "Le Comptoir",
            "location": LOCATION,
        },
        context_value=auth_context,
    )

    result = await schema.execute(
        DELETE_STOP_CATEGORY, variable_values={"id": category_id}, context_value=auth_context
    )

    assert result.errors is not None
    assert "remove it from them first" in result.errors[0].message


# --- categorizing stops (addStop / updateStop) ------------------------------


async def test_add_stop_with_category(auth_context):
    trip_id = await create_trip(auth_context)
    city_id = await create_city(auth_context, trip_id)
    category_id = await create_stop_category(auth_context, trip_id)

    result = await schema.execute(
        ADD_STOP,
        variable_values={
            "cityId": city_id,
            "categoryId": category_id,
            "name": "Le Comptoir",
            "location": LOCATION,
        },
        context_value=auth_context,
    )

    assert result.errors is None
    assert result.data["addStop"]["categoryId"] == category_id


async def test_add_stop_rejects_category_from_another_trip(auth_context):
    trip_id, day_id = await create_trip_and_day(auth_context)
    other_trip_id = await create_trip(auth_context)
    other_trip_category_id = await create_stop_category(auth_context, other_trip_id)

    result = await schema.execute(
        ADD_STOP,
        variable_values={
            "dayId": day_id,
            "categoryId": other_trip_category_id,
            "name": "Louvre",
            "location": LOCATION,
        },
        context_value=auth_context,
    )

    assert result.errors is not None
    assert "Category not found" in result.errors[0].message


async def test_update_stop_sets_and_clears_category(auth_context):
    trip_id, day_id = await create_trip_and_day(auth_context)
    category_id = await create_stop_category(auth_context, trip_id)
    add_result = await schema.execute(
        ADD_STOP,
        variable_values={"dayId": day_id, "name": "Louvre", "location": LOCATION},
        context_value=auth_context,
    )
    stop_id = add_result.data["addStop"]["id"]

    set_result = await schema.execute(
        UPDATE_STOP,
        variable_values={
            "id": stop_id,
            "name": "Louvre",
            "location": LOCATION,
            "categoryId": category_id,
        },
        context_value=auth_context,
    )
    assert set_result.errors is None
    assert set_result.data["updateStop"]["categoryId"] == category_id

    clear_result = await schema.execute(
        UPDATE_STOP,
        variable_values={"id": stop_id, "name": "Louvre", "location": LOCATION, "categoryId": None},
        context_value=auth_context,
    )
    assert clear_result.errors is None
    assert clear_result.data["updateStop"]["categoryId"] is None


async def test_duplicate_stop_carries_over_category(auth_context):
    trip_id = await create_trip(auth_context)
    city_id = await create_city(auth_context, trip_id)
    category_id = await create_stop_category(auth_context, trip_id)
    add_result = await schema.execute(
        ADD_STOP,
        variable_values={
            "cityId": city_id,
            "categoryId": category_id,
            "name": "Le Comptoir",
            "location": LOCATION,
        },
        context_value=auth_context,
    )
    stop_id = add_result.data["addStop"]["id"]

    result = await schema.execute(
        DUPLICATE_STOP, variable_values={"id": stop_id}, context_value=auth_context
    )

    assert result.errors is None
    assert result.data["duplicateStop"]["categoryId"] == category_id


# --- delete_trip cascade -----------------------------------------------------


async def test_delete_trip_with_categories_and_categorized_stops(auth_context):
    trip_id = await create_trip(auth_context)
    city_id = await create_city(auth_context, trip_id)
    category_id = await create_stop_category(auth_context, trip_id)
    await schema.execute(
        ADD_STOP,
        variable_values={
            "cityId": city_id,
            "categoryId": category_id,
            "name": "Le Comptoir",
            "location": LOCATION,
        },
        context_value=auth_context,
    )

    result = await schema.execute(
        DELETE_TRIP, variable_values={"id": trip_id}, context_value=auth_context
    )

    assert result.errors is None
    assert result.data["deleteTrip"] is True
