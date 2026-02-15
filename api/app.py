from fastapi import FastAPI, UploadFile, File
import numpy as np
from PIL import Image
import requests
import io

app = FastAPI()

CLASS_NAMES = ["healthy", "early_blight", "late_blight"]

TF_URL = "http://localhost:8501/v1/models/potato:predict"


from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

def preprocess(img):
    img = img.resize((224, 224))
    img = np.array(img)
    img = preprocess_input(img)
    return img.tolist()



@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    image_bytes = await file.read()
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    data = {"instances": [preprocess(img)]}

    response = requests.post(TF_URL, json=data)
    preds = np.array(response.json()["predictions"])

    class_id = np.argmax(preds)
    confidence = float(np.max(preds))

    return {
        "class": CLASS_NAMES[class_id],
        "confidence": confidence
    }
