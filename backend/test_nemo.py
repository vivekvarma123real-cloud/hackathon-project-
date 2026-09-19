import sys
import os

print("Starting test_nemo.py")
try:
    print("Importing torch...")
    import torch
    print("Torch imported successfully.")
except Exception as e:
    print(f"Error importing torch: {e}")

try:
    print("Importing nemo.collections.asr...")
    import nemo.collections.asr as nemo_asr
    print("nemo.collections.asr imported successfully.")
except Exception as e:
    print(f"Error importing nemo.collections.asr: {e}")

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "indicconformer")
model_path = os.path.join(MODEL_DIR, "model.nemo")
if os.path.exists(model_path):
    print(f"Loading model from {model_path}...")
    try:
        asr_model = nemo_asr.models.EncDecHybridRNNTCTCModel.restore_from(model_path, strict=False)
        print("Model loaded successfully.")
    except Exception as e:
        print(f"Error loading model: {e}")
else:
    print(f"Model path does not exist: {model_path}")
