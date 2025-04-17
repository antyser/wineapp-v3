"""Storage utility functions for managing files in Supabase storage"""

import os
import uuid
from io import BytesIO
from typing import Optional, Tuple

import httpx
from loguru import logger

from src.core.supabase import get_supabase_client


async def upload_image(file_path: str, bucket_name: str = "images") -> Optional[str]:
    """Placeholder function for uploading images to storage"""
    return None


async def download_image(url: str, dest_path: Optional[str] = None) -> Optional[str]:
    """Placeholder function for downloading images"""
    return None


async def get_signed_url(path: str, bucket_name: str = "images") -> Optional[str]:
    """Placeholder function for getting signed URLs"""
    return None


async def delete_file(path: str, bucket_name: str = "images") -> bool:
    """Placeholder function for deleting files"""
    return True


async def upload_image(
    file_content: bytes,
    bucket_name: str = "wine-images",
    folder_path: str = "uploads",
    file_name: Optional[str] = None,
    content_type: str = "image/jpeg",
) -> Tuple[bool, Optional[str]]:
    """
    Upload an image to Supabase Storage

    Args:
        file_content: Bytes content of the file to upload
        bucket_name: Name of the storage bucket
        folder_path: Path within the bucket
        file_name: Optional file name (will generate UUID if not provided)
        content_type: Content type of the file (default: image/jpeg)

    Returns:
        Tuple of (success, url_if_successful)
    """
    try:
        # Get admin client (service role) to ensure proper permissions for storage
        client = get_supabase_client()

        # Generate a filename if not provided
        if file_name is None:
            file_name = f"{uuid.uuid4()}.jpg"

        # Make sure the folder path doesn't have a leading slash
        folder_path = folder_path.lstrip("/")

        # Create full path
        full_path = f"{folder_path}/{file_name}"

        # Check if bucket exists, create if not
        try:
            client.storage.get_bucket(bucket_name)
        except Exception:
            client.storage.create_bucket(bucket_name)
            logger.info(f"Created new storage bucket: {bucket_name}")

        # Upload the file
        result = client.storage.from_(bucket_name).upload(
            path=full_path,
            file=file_content,
            file_options={"content-type": content_type},
        )

        # Get the public URL
        public_url = client.storage.from_(bucket_name).get_public_url(full_path)

        logger.info(f"Successfully uploaded file to {bucket_name}/{full_path}")
        return True, public_url

    except Exception as e:
        logger.error(f"Error uploading file to Supabase Storage: {str(e)}")
        return False, None


async def download_image(
    image_url: str,
) -> Optional[bytes]:
    """
    Download an image from Supabase Storage or external URL

    Args:
        image_url: URL of the image to download
            Can be:
            - Full URL (https://...)
            - Supabase storage path (storage.download?path=...)
            - Bucket/path reference (bucket_name/folder/file.jpg)

    Returns:
        Bytes content of the image or None if download failed
    """
    try:
        logger.info(f"Downloading image from: {image_url}")

        if not image_url:
            logger.error("Empty image URL provided")
            return None

        client = get_supabase_client()

        # Handle different URL formats
        if image_url.startswith("http"):
            # Direct external URL
            async with httpx.AsyncClient() as http_client:
                response = await http_client.get(image_url)
                if response.status_code != 200:
                    logger.error(
                        f"Failed to download image from URL. Status: {response.status_code}"
                    )
                    return None
                return response.content

        elif image_url.startswith("storage.download"):
            # Supabase storage path - need to convert to full URL
            supabase_url = client.supabase_url
            full_url = f"{supabase_url}/{image_url}"

            async with httpx.AsyncClient() as http_client:
                response = await http_client.get(full_url)
                if response.status_code != 200:
                    logger.error(
                        f"Failed to download image from Supabase. Status: {response.status_code}"
                    )
                    return None
                return response.content

        else:
            # Assume it's a bucket/path reference
            parts = image_url.split("/", 1)
            if len(parts) < 2:
                logger.error(f"Invalid storage path format: {image_url}")
                return None

            bucket = parts[0]
            path = parts[1]

            try:
                # Download using the Supabase client
                response = client.storage.from_(bucket).download(path)
                return response
            except Exception as e:
                logger.error(f"Error downloading from Supabase Storage: {str(e)}")
                return None

    except Exception as e:
        logger.error(f"Error downloading image: {str(e)}")
        return None


async def get_signed_url(
    bucket_name: str,
    path: str,
    expires_in: int = 60,
) -> Optional[str]:
    """
    Get a signed URL for a file in Supabase Storage

    Args:
        bucket_name: Name of the storage bucket
        path: Path to the file within the bucket
        expires_in: Expiration time in seconds (default: 60)

    Returns:
        Signed URL or None if failed
    """
    try:
        client = get_supabase_client()

        # Get signed URL
        signed_url = client.storage.from_(bucket_name).create_signed_url(
            path=path, expires_in=expires_in
        )

        return signed_url
    except Exception as e:
        logger.error(f"Error creating signed URL: {str(e)}")
        return None


async def delete_file(
    bucket_name: str,
    path: str,
) -> bool:
    """
    Delete a file from Supabase Storage

    Args:
        bucket_name: Name of the storage bucket
        path: Path to the file within the bucket

    Returns:
        True if successful, False otherwise
    """
    try:
        client = get_supabase_client()

        # Delete the file
        client.storage.from_(bucket_name).remove([path])
        logger.info(f"Successfully deleted file: {bucket_name}/{path}")

        return True
    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")
        return False
