from typing import Optional
from uuid import UUID

from loguru import logger
from pydantic import EmailStr
from supabase import Client

from src.auth.models import User
from src.core.supabase import get_supabase_client


async def get_user_by_email(
    email: str, client: Optional[Client] = None
) -> Optional[User]:
    """
    Get a user by email address

    Args:
        email: Email address of the user
        client: Supabase client (optional, will use default if not provided)

    Returns:
        User if found, None otherwise
    """
    if client is None:
        client = get_supabase_client()

    try:
        # Use a raw SQL query to access the auth.users table
        query = f"SELECT * FROM auth.users WHERE email = '{email}'"
        response = client.rpc("execute_sql", {"query": query}).execute()

        if not response.data or len(response.data) == 0:
            logger.warning(f"No user found with email: {email}")
            return None

        # Convert the response data to a User object
        user_data = response.data[0]
        return User.model_validate(user_data)

    except Exception as e:
        logger.error(f"Error getting user by email: {str(e)}")
        return None


async def delete_user_by_id(user_id: UUID, client: Optional[Client] = None) -> bool:
    """
    Delete a user by their ID using the admin client.

    Args:
        user_id: The UUID of the user to delete.
        client: Supabase client (optional, will use default if not provided).

    Returns:
        True if deletion was successful, False otherwise.
    """
    if client is None:
        client = get_supabase_client() # Ensure this returns an admin client if needed

    try:
        # Note: Ensure the client used here has admin privileges
        await client.auth.admin.delete_user(user_id=str(user_id))
        logger.info(f"Successfully deleted user with ID: {user_id}")
        return True
    except Exception as e:
        logger.error(f"Error deleting user with ID {user_id}: {str(e)}")
        return False
