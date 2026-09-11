from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    environment: str = Field(default="production")


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    prefix: str
    secret: Optional[str] = None
    createdDate: str
    lastUsed: str
    environment: str


class IntegrationAppResponse(BaseModel):
    id: str
    name: str
    category: str
    description: str
    connected: bool
    accountEmail: Optional[str] = None
    iconName: str
    badge: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class IntegrationUpdate(BaseModel):
    is_connected: bool
    account_email: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
