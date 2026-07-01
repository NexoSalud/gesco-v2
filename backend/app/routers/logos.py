"""Router para gestion de logos de documentos (DOCX)."""
import os
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from app.config import settings
router = APIRouter(prefix="/api/v1/config/logos", tags=["Configuracion - Logos"])
ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp"}
LOGO_DIR = os.path.join(settings.upload_dir, "logos")
LEFT_PATH = os.path.join(LOGO_DIR, "logo_left.png")
RIGHT_PATH = os.path.join(LOGO_DIR, "logo_right.png")

def _ensure_logo_dir():
    os.makedirs(LOGO_DIR, exist_ok=True)

@router.post("")
async def upload_logos(logo_left: UploadFile | None = File(None), logo_right: UploadFile | None = File(None)):
    _ensure_logo_dir()
    uploaded = []
    if logo_left is not None:
        if logo_left.content_type not in ALLOWED_TYPES:
            raise HTTPException(400, "logo_left debe ser PNG, JPEG o WebP")
        with open(LEFT_PATH, "wb") as f:
            f.write(await logo_left.read())
        uploaded.append("logo_left")
    if logo_right is not None:
        if logo_right.content_type not in ALLOWED_TYPES:
            raise HTTPException(400, "logo_right debe ser PNG, JPEG o WebP")
        with open(RIGHT_PATH, "wb") as f:
            f.write(await logo_right.read())
        uploaded.append("logo_right")
    if not uploaded:
        raise HTTPException(400, "Debe enviar al menos un archivo (logo_left y/o logo_right)")
    return {"ok": True, "subidos": uploaded}

@router.get("")
async def get_logos():
    _ensure_logo_dir()
    result = {}
    if os.path.exists(LEFT_PATH):
        result["logo_left"] = "/api/v1/config/logos/logo_left"
    if os.path.exists(RIGHT_PATH):
        result["logo_right"] = "/api/v1/config/logos/logo_right"
    return result

@router.get("/logo_left")
async def get_logo_left():
    _ensure_logo_dir()
    if not os.path.exists(LEFT_PATH):
        raise HTTPException(404, "Logo izquierdo no encontrado")
    return FileResponse(LEFT_PATH, media_type="image/png")

@router.get("/logo_right")
async def get_logo_right():
    _ensure_logo_dir()
    if not os.path.exists(RIGHT_PATH):
        raise HTTPException(404, "Logo derecho no encontrado")
    return FileResponse(RIGHT_PATH, media_type="image/png")
