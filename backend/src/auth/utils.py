import time
from typing import Dict, Optional
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from loguru import logger

from src.core import get_supabase_client
from src.core.config import settings


class SupabaseAuth(HTTPBearer):
    """
    Custom auth dependency for Supabase JWT validation.
    Extends HTTPBearer to extract and validate the Supabase JWT from the Authorization header.
    """

    def __init__(self, auto_error: bool = True):
        """
        Initialize the auth dependency.

        Args:
            auto_error: Whether to raise an HTTPException on missing/invalid token
        """
        super(SupabaseAuth, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request) -> Dict:
        """
        Extract and validate the JWT token from the request header.

        Args:
            request: The incoming FastAPI request

        Returns:
            Dict containing user information from the token

        Raises:
            HTTPException: If the token is missing, invalid, or expired
        """
        # Log the authorization header (masked for security)
        auth_header = request.headers.get("Authorization", "")
        masked_header = (
            f"{auth_header[:15]}..." if len(auth_header) > 15 else auth_header
        )
        logger.info(f"Authorization header received: {masked_header}")

        # Get the credentials from the Authorization header
        try:
            credentials: HTTPAuthorizationCredentials = await super(
                SupabaseAuth, self
            ).__call__(request)
        except HTTPException as e:
            logger.error(
                f"Failed to extract credentials from Authorization header: {e}"
            )
            raise

        # Check if we have credentials
        if not credentials:
            logger.error("No credentials found in Authorization header")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = credentials.credentials
        logger.info(f"Token extracted from header (first 10 chars): {token[:10]}...")

        # Validate the token
        try:
            # Decode the JWT token (without verification first to extract required claims)
            unverified_payload = jwt.decode(token, options={"verify_signature": False})
            logger.info(
                f"JWT decoded successfully, claims: {unverified_payload.keys()}"
            )

            # Get the JWT key ID (kid) to determine if this is a Supabase token
            if "iss" not in unverified_payload:
                logger.error("Token missing 'iss' claim")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not a valid token - missing issuer",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            issuer = unverified_payload["iss"]
            logger.info(f"Token issuer: {issuer}")

            # Construct the expected issuer URL from settings
            expected_issuer = f"{settings.SUPABASE_URL}/auth/v1"

            # Check if the issuer matches the expected Supabase Auth issuer URL
            is_valid_issuer = issuer == expected_issuer
            if not is_valid_issuer:
                logger.error(
                    f"Invalid issuer: {issuer} - Expected: {expected_issuer}"
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not a valid Supabase token",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Check if token is expired
            if "exp" in unverified_payload:
                expiration = unverified_payload["exp"]
                current_time = time.time()
                time_left = expiration - current_time
                logger.info(
                    f"Token expiration: {expiration}, current time: {current_time}, seconds left: {time_left}"
                )

                if current_time > expiration:
                    logger.error(
                        f"Token expired at {expiration}, current time is {current_time}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Token expired",
                        headers={"WWW-Authenticate": "Bearer"},
                    )

            # Extract user info from token claims
            user_id = unverified_payload.get("sub")
            logger.info(f"User ID from token: {user_id}")

            if not user_id:
                logger.error("No 'sub' claim found in token")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid user information in token",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Return the user claims
            return {
                "user_id": user_id,
                "email": unverified_payload.get("email"),
                "role": unverified_payload.get("role", "authenticated"),
            }

        except jwt.PyJWTError as e:
            logger.error(f"JWT validation error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except HTTPException as http_exc:
            # Re-raise specific HTTPExceptions (like expired, invalid issuer)
            raise http_exc
        except Exception as e:
            # Catch any other unexpected errors
            logger.error(f"Auth error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication error",
                headers={"WWW-Authenticate": "Bearer"},
            )


# Dependency to get authenticated user ID
def get_current_user(auth_data: Dict = Depends(SupabaseAuth())) -> UUID:
    """
    FastAPI dependency to extract the current user ID from auth data.

    Args:
        auth_data: The authenticated user data from the SupabaseAuth dependency

    Returns:
        UUID of the current user

    Raises:
        HTTPException: If the user ID is missing or invalid
    """
    user_id = auth_data.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token",
        )

    return UUID(user_id)


# Optional auth dependency - doesn't require auth but provides user_id if authenticated
def get_optional_user(request: Request) -> Optional[UUID]:
    """
    FastAPI dependency that provides the user ID if authenticated, but doesn't require auth.

    Args:
        request: The incoming FastAPI request

    Returns:
        UUID of the current user if authenticated, None otherwise
    """
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    try:
        token = auth_header.replace("Bearer ", "")
        # Decode the JWT token (without verification first to extract required claims)
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        logger.info(f"Unverified payload in get_optional_user: {unverified_payload}")

        # Check if the issuer is valid (used for debugging only)
        if "iss" in unverified_payload:
            issuer = unverified_payload["iss"]
            logger.info(f"Token issuer in get_optional_user: {issuer}")
            is_valid_issuer = (
                issuer.endswith("supabase.co")
                or "localhost" in issuer
                or "127.0.0.1" in issuer
            )
            if not is_valid_issuer:
                logger.warning(f"Invalid issuer in get_optional_user: {issuer}")

        user_id = unverified_payload.get("sub")
        if not user_id:
            logger.warning("No 'sub' claim found in token in get_optional_user")
            return None

        return UUID(user_id)
    except Exception as e:  # Catch specific Exception and log it
        # Log the error for debugging purposes
        logger.warning(
            f"Failed to validate token or extract user_id in get_optional_user: {e}"
        )
        # Any error means we don't have a valid user
        return None
