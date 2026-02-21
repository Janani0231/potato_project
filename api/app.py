from fastapi import FastAPI, UploadFile, File
import numpy as np
from PIL import Image
import requests
import io

app = FastAPI()

# ✅ FIXED: Class names must match the exact alphabetical order TensorFlow used during training.
# Confirmed from notebook output: ['Potato___Early_blight', 'Potato___Late_blight', 'Potato___healthy']
CLASS_NAMES = [
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy"
]

TF_URL = "http://localhost:8501/v1/models/potato:predict"

def preprocess(img):
    # 1. Resize to match model input shape
    img = img.resize((224, 224))

    # 2. Convert PIL image to numpy array (pixels in range [0, 255])
    img_array = np.array(img)

    # 3. Cast to float32
    img_array = img_array.astype("float32")

    # 4. The model's built-in Lambda(preprocess_input) layer handles normalization.
    #    We send raw [0, 255] values — no manual normalization needed here.

    # 5. Add batch dimension → shape: (1, 224, 224, 3)
    img_expanded = np.expand_dims(img_array, axis=0)

    return img_expanded


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    image_bytes = await file.read()
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    arr = preprocess(img)

    print("\n--- INPUT DEBUG INFO ---")
    print(f"Shape: {arr.shape}, Min: {np.min(arr):.2f}, Max: {np.max(arr):.2f}, Mean: {np.mean(arr):.2f}")
    print("------------------------\n")

    data = {"instances": arr.tolist()}
    response = requests.post(TF_URL, json=data)

    if response.status_code != 200:
        return {"error": "Model server returned an error", "details": response.text}

    response_json = response.json()

    if "predictions" in response_json:
        preds = np.array(response_json["predictions"])
    elif "outputs" in response_json:
        preds = np.array(response_json["outputs"])
    else:
        print(f"Unexpected response format: {response_json}")
        return {"error": "Unexpected response format from model server", "response": str(response_json)}

    # Ensure shape is (batch_size, num_classes)
    if len(preds.shape) == 1:
        preds = preds.reshape(1, -1)

    class_id = int(np.argmax(preds[0]))
    confidence = float(np.max(preds[0]))

    print(f"Class probabilities:")
    for i, name in enumerate(CLASS_NAMES):
        print(f"  {name}: {preds[0][i]:.4f}")
    print(f"→ Predicted: {CLASS_NAMES[class_id]} (index {class_id}, confidence {confidence:.4f})\n")

    return {
        "class": CLASS_NAMES[class_id],
        "confidence": confidence,
        "all_predictions": {CLASS_NAMES[i]: float(preds[0][i]) for i in range(len(CLASS_NAMES))}
    }