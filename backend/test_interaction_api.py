"""
Interaction API Test Script

This script demonstrates how to use the interaction endpoints.
It uses the test user from seed.sql to authenticate and perform interactions.

Usage:
    python test_interaction_api.py
"""

import asyncio
import json
from uuid import UUID

import httpx

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "password123"
TEST_WINE_ID = "11111111-1111-1111-1111-111111111111"  # Test Red Wine from seed.sql


async def main():
    """Main test function"""
    async with httpx.AsyncClient() as client:
        # 1. Login to get an access token
        login_response = await client.post(
            "http://localhost:54321/auth/v1/token?grant_type=password",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            headers={
                "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
            },
        )

        if login_response.status_code != 200:
            print(f"Login failed: {login_response.status_code}")
            print(login_response.text)
            return

        token_data = login_response.json()
        access_token = token_data["access_token"]

        # Set auth header for subsequent requests
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        # 2. Get current interactions for our test wine
        get_interaction_response = await client.get(
            f"{BASE_URL}/interactions/wine/{TEST_WINE_ID}",
            headers=headers,
        )

        if get_interaction_response.status_code == 200:
            current_interaction = get_interaction_response.json()
            print("Current interaction:")
            print(json.dumps(current_interaction, indent=2))
        elif get_interaction_response.status_code == 404:
            print("No existing interaction found for this wine")
        else:
            print(f"Error getting interaction: {get_interaction_response.status_code}")
            print(get_interaction_response.text)

        # 3. Toggle 'liked' status
        toggle_liked_response = await client.post(
            f"{BASE_URL}/interactions/wine/{TEST_WINE_ID}/toggle/liked",
            headers=headers,
        )

        if toggle_liked_response.status_code == 200:
            updated_interaction = toggle_liked_response.json()
            print("\nAfter toggling 'liked':")
            print(json.dumps(updated_interaction, indent=2))
        else:
            print(f"Error toggling liked: {toggle_liked_response.status_code}")
            print(toggle_liked_response.text)

        # 4. Rate the wine
        rate_response = await client.post(
            f"{BASE_URL}/interactions/wine/{TEST_WINE_ID}/rate?rating=4.5",
            headers=headers,
        )

        if rate_response.status_code == 200:
            rated_interaction = rate_response.json()
            print("\nAfter rating:")
            print(json.dumps(rated_interaction, indent=2))
        else:
            print(f"Error rating wine: {rate_response.status_code}")
            print(rate_response.text)

        # 5. Toggle 'wishlist' status
        toggle_wishlist_response = await client.post(
            f"{BASE_URL}/interactions/wine/{TEST_WINE_ID}/toggle/wishlist",
            headers=headers,
        )

        if toggle_wishlist_response.status_code == 200:
            final_interaction = toggle_wishlist_response.json()
            print("\nAfter toggling 'wishlist':")
            print(json.dumps(final_interaction, indent=2))
        else:
            print(f"Error toggling wishlist: {toggle_wishlist_response.status_code}")
            print(toggle_wishlist_response.text)


if __name__ == "__main__":
    asyncio.run(main())
