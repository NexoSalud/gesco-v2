"""Global exception handlers for FastAPI."""

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all: returns 500 with type info instead of raw traceback."""
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Error interno del servidor",
            "type": type(exc).__name__,
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """422: validation errors with field details."""
    errors = []
    for err in exc.errors():
        errors.append({
            "loc": " → ".join(str(l) for l in err.get("loc", [])),
            "msg": err.get("msg", ""),
            "type": err.get("type", ""),
        })
    return JSONResponse(
        status_code=422,
        content={"detail": "Error de validación", "errors": errors},
    )


async def http_exception_handler(request: Request, exc: HTTPException):
    """Custom HTTP exceptions: pass through status and detail."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )
