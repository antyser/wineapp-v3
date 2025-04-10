from datetime import datetime
from typing import Any, List
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_serializer


class DBBaseModel(BaseModel):
    """
    Base model for all database models with common serialization logic.
    Handles UUID and datetime serialization to ensure proper JSON encoding.
    """

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("id", check_fields=False)
    def serialize_id(self, id: UUID) -> str:
        """Convert UUID to string for JSON serialization"""
        return str(id)

    @field_serializer("user_id", check_fields=False)
    def serialize_user_id(self, user_id: UUID) -> str:
        """Convert user_id UUID to string for JSON serialization"""
        return str(user_id)

    @field_serializer(
        lambda self: [
            f
            for f in self.model_fields
            if isinstance(self.model_fields[f].annotation, UUID)
            or (
                hasattr(self.model_fields[f].annotation, "__origin__")
                and self.model_fields[f].annotation.__origin__ is List
                and self.model_fields[f].annotation.__args__[0] is UUID
            )
        ],
        when_used="json",
        check_fields=False,
    )
    def serialize_any_uuid(self, v: Any) -> Any:
        """Convert any UUID or List[UUID] field to string/list of strings"""
        if isinstance(v, list):
            return [str(item) if isinstance(item, UUID) else item for item in v]
        return str(v) if isinstance(v, UUID) else v

    @field_serializer("created_at", "updated_at", check_fields=False)
    def serialize_datetime(self, dt: datetime) -> str:
        """Convert datetime to ISO format string for JSON serialization"""
        return dt.isoformat() if dt else None
