# Cellar module
# Handles cellar, cellar wines, and related models

from src.cellar.api import router as cellar_router
from src.cellar.service import (
    add_wine_to_cellar,
    create_cellar,
    delete_cellar,
    get_cellar,
    get_cellar_statistics,
    get_cellar_wine,
    get_cellar_wines,
    get_cellar_wines_by_user_wine,
    get_cellars,
    remove_wine_from_cellar,
    update_cellar,
    update_cellar_wine,
)

__all__ = [
    "cellar_router",
    "add_wine_to_cellar",
    "create_cellar",
    "delete_cellar",
    "remove_wine_from_cellar",
    "get_cellar",
    "get_cellar_statistics",
    "get_cellar_wine",
    "get_cellar_wines",
    "get_cellar_wines_by_user_wine",
    "get_cellars",
    "update_cellar",
    "update_cellar_wine",
]
