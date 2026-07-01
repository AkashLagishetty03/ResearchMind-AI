"""
dependencies.py — FastAPI dependency that extracts and validates the JWT from
the Authorization header, returning the current authenticated User object.
"""
import logging
from typing import Optional

from fastapi import Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.auth.auth_utils import decode_access_token
from app.database.db import get_db
from app.models.models import User

logger = logging.getLogger(__name__)

# HTTPBearer reads the "Authorization: Bearer <token>" header automatically.
# auto_error=False lets us return a custom 401 instead of FastAPI's default.
_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    token_query: Optional[str] = Query(None, alias="token"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Extract the JWT from the Authorization header (or ?token= query param for
    SSE EventSource connections which cannot set custom headers), verify it,
    and return the corresponding User row.

    Raises HTTP 401 if the token is missing, malformed, or expired.
    """
    # Prefer header token; fall back to query-param token (SSE use case)
    raw_token: Optional[str] = None
    if credentials:
        raw_token = credentials.credentials
    elif token_query:
        raw_token = token_query

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(raw_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: Optional[int] = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token payload.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    token_query: Optional[str] = Query(None, alias="token"),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Like get_current_user but returns None instead of raising 401."""
    try:
        return await get_current_user(credentials=credentials, token_query=token_query, db=db)
    except HTTPException:
        return None
