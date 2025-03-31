from datetime import date
from uuid import UUID, uuid4

import pytest

from src.cellar import service
from src.cellar.schemas import (
    CellarCreate,
    CellarListParams,
    CellarUpdate,
    CellarWineCreate,
    CellarWineListParams,
    CellarWineUpdate,
)


@pytest.fixture
async def test_cellar(supabase, test_user):
    """Create a test cellar"""
    cellar_data = CellarCreate(
        name="Test Service Cellar", sections=["Rack A", "Rack B"], user_id=test_user
    )

    cellar = await service.create_cellar(cellar_data, supabase)

    yield cellar

    # Clean up - delete the test cellar
    await service.delete_cellar(cellar.id, supabase)


@pytest.fixture
async def test_wine(supabase):
    """Create a test wine"""
    from src.wines import service as wine_service
    from src.wines.schemas import WineCreate

    wine_data = WineCreate(
        name="Test Service Wine",
        winery="Test Winery Service",
        vintage=2018,
        type="red",
        varietal="Pinot Noir",
    )

    wine = await wine_service.create_wine(wine_data, supabase)

    yield wine

    # Clean up - delete the test wine
    await wine_service.delete_wine(wine.id, supabase)


@pytest.fixture
async def test_cellar_wine(supabase, test_cellar, test_wine):
    """Create a test cellar wine entry"""
    cellar_wine_data = CellarWineCreate(
        cellar_id=test_cellar.id,
        wine_id=test_wine.id,
        quantity=2,
        purchase_price=35.99,
        purchase_date=date(2023, 3, 15),
        section="Rack A",
        size="750ml",
        status="in_stock",
    )

    cellar_wine = await service.add_wine_to_cellar(cellar_wine_data, supabase)

    yield cellar_wine

    # No need to clean up as this will be deleted when the cellar is deleted


async def test_get_cellars(supabase, test_cellar, test_user):
    """Test getting cellars with optional filtering"""
    # Test without filter
    all_cellars = await service.get_cellars(None, supabase)
    assert all_cellars.total > 0

    # There should be at least one cellar with our test cellar's ID
    found = False
    for cellar in all_cellars.items:
        if cellar.id == test_cellar.id:
            found = True
            break
    assert found

    # Test with user_id filter
    params = CellarListParams(user_id=test_user)
    user_cellars = await service.get_cellars(params, supabase)
    assert user_cellars.total > 0

    # All returned cellars should belong to the user
    for cellar in user_cellars.items:
        assert str(cellar.user_id) == str(test_user)


async def test_get_cellar(supabase, test_cellar):
    """Test getting a cellar by ID"""
    cellar = await service.get_cellar(test_cellar.id, supabase)
    assert cellar is not None
    assert cellar.id == test_cellar.id
    assert cellar.name == test_cellar.name
    assert cellar.sections == test_cellar.sections
    assert cellar.user_id == test_cellar.user_id


async def test_get_cellar_not_found(supabase):
    """Test getting a non-existent cellar"""
    non_existent_id = uuid4()
    cellar = await service.get_cellar(non_existent_id, supabase)
    assert cellar is None


async def test_create_cellar(supabase, test_user):
    """Test creating a cellar"""
    cellar_data = CellarCreate(
        name="New Service Cellar", sections=["Floor", "Top Shelf"], user_id=test_user
    )

    cellar = await service.create_cellar(cellar_data, supabase)
    assert cellar is not None
    assert cellar.name == cellar_data.name
    assert cellar.sections == cellar_data.sections
    assert str(cellar.user_id) == str(cellar_data.user_id)
    assert isinstance(cellar.id, UUID)

    # Clean up
    await service.delete_cellar(cellar.id, supabase)


async def test_update_cellar(supabase, test_cellar):
    """Test updating a cellar"""
    update_data = CellarUpdate(
        name="Updated Service Cellar", sections=["New Rack", "Wine Fridge"]
    )

    updated = await service.update_cellar(test_cellar.id, update_data, supabase)
    assert updated is not None
    assert updated.name == update_data.name
    assert updated.sections == update_data.sections
    assert updated.id == test_cellar.id
    assert updated.user_id == test_cellar.user_id


async def test_update_cellar_not_found(supabase):
    """Test updating a non-existent cellar"""
    non_existent_id = uuid4()
    update_data = CellarUpdate(name="This should fail")

    updated = await service.update_cellar(non_existent_id, update_data, supabase)
    assert updated is None


async def test_delete_cellar(supabase, test_user):
    """Test deleting a cellar"""
    # First create a cellar
    cellar_data = CellarCreate(name="Cellar to Delete in Service", user_id=test_user)

    cellar = await service.create_cellar(cellar_data, supabase)
    assert cellar is not None

    # Then delete it
    success = await service.delete_cellar(cellar.id, supabase)
    assert success is True

    # Verify it's gone
    cellar = await service.get_cellar(cellar.id, supabase)
    assert cellar is None


async def test_delete_cellar_not_found(supabase):
    """Test deleting a non-existent cellar"""
    non_existent_id = uuid4()
    success = await service.delete_cellar(non_existent_id, supabase)
    assert success is False


async def test_get_cellar_wines(supabase, test_cellar, test_cellar_wine):
    """Test getting wines in a cellar with optional filtering"""
    params = CellarWineListParams(cellar_id=test_cellar.id)

    result = await service.get_cellar_wines(params, supabase)
    assert result.total > 0

    # Check that our test cellar wine is in the list
    found = False
    for cellar_wine in result.items:
        if cellar_wine.id == test_cellar_wine.id:
            found = True
            # Check wine details are included
            assert isinstance(cellar_wine.wine, dict)
            break
    assert found

    # Test filtering by section
    section_params = CellarWineListParams(
        cellar_id=test_cellar.id, section=test_cellar_wine.section
    )
    section_results = await service.get_cellar_wines(section_params, supabase)
    assert section_results.total > 0

    # All returned wines should be in the specified section
    for cellar_wine in section_results.items:
        assert cellar_wine.section == test_cellar_wine.section


async def test_get_cellar_wine(supabase, test_cellar_wine):
    """Test getting a cellar wine by ID"""
    cellar_wine = await service.get_cellar_wine(test_cellar_wine.id, supabase)
    assert cellar_wine is not None
    assert cellar_wine.id == test_cellar_wine.id
    assert cellar_wine.cellar_id == test_cellar_wine.cellar_id
    assert cellar_wine.wine_id == test_cellar_wine.wine_id
    assert isinstance(cellar_wine.wine, dict)


async def test_get_cellar_wine_not_found(supabase):
    """Test getting a non-existent cellar wine"""
    non_existent_id = uuid4()
    cellar_wine = await service.get_cellar_wine(non_existent_id, supabase)
    assert cellar_wine is None


async def test_add_wine_to_cellar(supabase, test_cellar, test_wine):
    """Test adding a wine to a cellar"""
    cellar_wine_data = CellarWineCreate(
        cellar_id=test_cellar.id,
        wine_id=test_wine.id,
        quantity=4,
        purchase_price=22.50,
        size="375ml",
        status="in_stock",
    )

    cellar_wine = await service.add_wine_to_cellar(cellar_wine_data, supabase)
    assert cellar_wine is not None
    assert cellar_wine.cellar_id == cellar_wine_data.cellar_id
    assert cellar_wine.wine_id == cellar_wine_data.wine_id
    assert cellar_wine.quantity == cellar_wine_data.quantity
    assert cellar_wine.purchase_price == cellar_wine_data.purchase_price
    assert cellar_wine.size == cellar_wine_data.size
    assert isinstance(cellar_wine.id, (str, UUID))
    assert isinstance(cellar_wine.wine, dict)


async def test_add_wine_to_nonexistent_cellar(supabase, test_wine):
    """Test adding a wine to a non-existent cellar"""
    non_existent_id = uuid4()

    cellar_wine_data = CellarWineCreate(
        cellar_id=non_existent_id, wine_id=test_wine.id, quantity=1
    )

    with pytest.raises(ValueError):
        await service.add_wine_to_cellar(cellar_wine_data, supabase)


async def test_update_cellar_wine(supabase, test_cellar_wine):
    """Test updating a cellar wine"""
    update_data = CellarWineUpdate(quantity=10, purchase_price=45.99, status="reserved")

    updated = await service.update_cellar_wine(
        test_cellar_wine.id, update_data, supabase
    )
    assert updated is not None
    assert updated.quantity == update_data.quantity
    assert updated.purchase_price == update_data.purchase_price
    assert updated.status == update_data.status
    assert updated.id == test_cellar_wine.id
    assert updated.cellar_id == test_cellar_wine.cellar_id
    assert updated.wine_id == test_cellar_wine.wine_id


async def test_update_cellar_wine_not_found(supabase):
    """Test updating a non-existent cellar wine"""
    non_existent_id = uuid4()
    update_data = CellarWineUpdate(quantity=99)

    updated = await service.update_cellar_wine(non_existent_id, update_data, supabase)
    assert updated is None


async def test_remove_wine_from_cellar(supabase, test_cellar, test_wine):
    """Test removing a wine from a cellar"""
    # First add a wine to the cellar
    cellar_wine_data = CellarWineCreate(
        cellar_id=test_cellar.id, wine_id=test_wine.id, quantity=1
    )

    cellar_wine = await service.add_wine_to_cellar(cellar_wine_data, supabase)
    assert cellar_wine is not None

    # Then remove it
    success = await service.remove_wine_from_cellar(cellar_wine.id, supabase)
    assert success is True

    # Verify it's gone
    cellar_wine = await service.get_cellar_wine(cellar_wine.id, supabase)
    assert cellar_wine is None


async def test_remove_wine_from_cellar_not_found(supabase):
    """Test removing a non-existent cellar wine"""
    non_existent_id = uuid4()
    success = await service.remove_wine_from_cellar(non_existent_id, supabase)
    assert success is False


async def test_get_cellar_statistics(supabase, test_cellar, test_cellar_wine):
    """Test getting cellar statistics"""
    stats = await service.get_cellar_statistics(test_cellar.id, supabase)
    assert stats is not None
    assert stats.total_bottles > 0

    # Verify value calculation
    expected_value = test_cellar_wine.quantity * test_cellar_wine.purchase_price
    assert stats.total_value == expected_value

    # Verify we have at least one entry in the breakdown statistics
    assert (
        len(stats.bottles_by_type) > 0
        or len(stats.bottles_by_region) > 0
        or len(stats.bottles_by_vintage) > 0
    )
