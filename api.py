from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import joblib
import re

# Import your existing ML pipeline classes
from gujarati_nlp_system import ModelTrainer, GujaratiPreprocessor, SummarizerTranslatorPipeline

app = FastAPI(title="GujSankshep AI API", description="Backend for Gujarati News Intelligence & Translation Hub")

# Configure CORS to allow the React (Next.js) frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # You can restrict this to your Vercel URL later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for caching
trainer = None
preprocessor = None
pipeline = None
# Removed global threshold in favor of dynamic threshold

@app.on_event("startup")
def load_models():
    """Loads the pre-trained models into memory on server start."""
    global trainer, preprocessor, pipeline
    model_path = "gujarati_models.joblib"
    
    print("Initializing NLP System...")
    preprocessor = GujaratiPreprocessor()
    pipeline = SummarizerTranslatorPipeline()
    trainer = ModelTrainer()
    
    if os.path.exists(model_path):
        print(f"Loading ML models from {model_path}...")
        trainer.load_models(model_path)
        print("Models successfully loaded into memory!")
    else:
        print("ERROR: No pre-trained model found! Please run gujarati_nlp_system.py first to train the models.")

class InferenceRequest(BaseModel):
    text: str
    threshold: float = 0.60

@app.post("/api/analyze")
def analyze_text(req: InferenceRequest):
    if not trainer or not trainer.best_model_name:
        return {"error": "Models are not loaded on the server."}
        
    raw_text = req.text
    if not raw_text.strip():
        return {"error": "Text is empty."}

    best_model = trainer.best_model_name
    
    def apply_tech_override(text: str, current_cat: str, current_conf: float):
        if current_cat.lower() == "tech":
            return current_cat, current_conf
            
        english_tech_pattern = r'\b(ai|gpu|cpu|api|app|software|tech|cyber)\b'
        gujarati_keywords = [
            "આર્ટિફિશિયલ", "ઇન્ટેલિજન્સ", "સોફ્ટવેર", "ટેક્નોલોજી", 
            "સ્માર્ટફોન", "ઇન્ટરનેટ", "ડેટા", "સાયબર", "અલ્ગોરિધમ", "એપ્લિકેશન", 
            "ચેટબોટ", "મશીન લર્નિંગ", "રોબોટિક્સ", "ક્લાઉડ", "કોમ્પ્યુટર", "એઆઈ"
        ]
        
        text_lower = text.lower()
        if re.search(english_tech_pattern, text_lower):
            return "tech", 0.95
            
        for kw in gujarati_keywords:
            if kw in text_lower:
                return "tech", 0.95
                
        return current_cat, current_conf
    
    # 1. Main Prediction using the Best Model
    predicted_category, confidence = trainer.predict(best_model, raw_text, preprocessor)
    
    # Apply modern tech keyword override
    predicted_category, confidence = apply_tech_override(raw_text, predicted_category, confidence)
    
    if confidence < req.threshold:
        predicted_category = "others"
        
    # 2. Extract Summary and Translate to English
    summary, translation = pipeline.summarize_and_translate(raw_text)
    
    # 3. Generate Predictions from the other 3 models (for the comparison expander)
    other_models = []
    for name in trainer.models:
        if name != best_model:
            pred, conf = trainer.predict(name, raw_text, preprocessor)
            pred, conf = apply_tech_override(raw_text, pred, conf)
            final_pred = "others" if conf < req.threshold else pred
            other_models.append({
                "modelName": name,
                "prediction": final_pred,
                "confidence": conf,
                "accuracy": trainer.metrics[name]['Accuracy']
            })
            
    return {
        "bestModel": best_model,
        "bestModelAccuracy": trainer.metrics[best_model]['Accuracy'],
        "predictedCategory": predicted_category,
        "confidence": confidence,
        "summary": summary,
        "translation": translation,
        "otherModels": other_models
    }

@app.get("/api/metrics")
def get_metrics():
    """Returns the performance metrics for Tab 2 (Model Performance)."""
    if not trainer or not trainer.metrics:
        return {"error": "Models are not loaded."}
        
    metrics_list = []
    for name, data in trainer.metrics.items():
        metrics_list.append({
            "name": name,
            "accuracy": data["Accuracy"],
            "precision": data["Precision"],
            "recall": data["Recall"],
            "f1Score": data["F1-Score"]
        })
        
    return {
        "metrics": metrics_list,
        "bestModel": trainer.best_model_name
    }
