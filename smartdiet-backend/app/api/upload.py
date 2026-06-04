import uuid
import os
from fastapi import APIRouter, UploadFile, File, Depends
from fastapi.responses import JSONResponse

from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(tags=["upload"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/api/v1/upload")
async def upload_file(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    ext = os.path.splitext(file.filename or ".jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    url = f"/uploads/{filename}"
    return JSONResponse({"url": url, "filename": filename})
