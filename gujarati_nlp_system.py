import pandas as pd
import numpy as np
import os
import requests
import re
import sys
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
from sklearn.calibration import CalibratedClassifierCV
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import joblib

# Required libraries: pandas, numpy, scikit-learn, transformers, torch, requests
# To install: pip install pandas numpy scikit-learn transformers torch requests

class DatasetLoader:
    def __init__(self, train_path="train.csv", test_path="valid.csv"):
        self.train_path = train_path
        self.test_path = test_path
        
        # Auto-detect if user extracted test.csv instead of valid.csv
        if not os.path.exists(self.test_path) and os.path.exists("test.csv"):
            self.test_path = "test.csv"
            
    def load_data(self):
        if not os.path.exists(self.train_path):
            raise FileNotFoundError(f"Error: Required dataset file '{self.train_path}' is missing in the current directory.")
        if not os.path.exists(self.test_path):
            raise FileNotFoundError(f"Error: Required dataset file '{self.test_path}' is missing in the current directory.")
            
        print(f"Loading {self.train_path} and {self.test_path} into pandas...")
        train_df = pd.read_csv(self.train_path)
        test_df = pd.read_csv(self.test_path)
        
        train_df = self._standardize_columns(train_df)
        test_df = self._standardize_columns(test_df)
        
        labels = train_df['label'].unique()
        print(f"Extracted Unique Categories: {', '.join([str(l) for l in labels])}")
        
        return train_df, test_df
        
    def _standardize_columns(self, df):
        # Find label column
        label_col = None
        for col in df.columns:
            if str(col).lower() in ['label', 'category', 'class', 'target']:
                label_col = col
                break
        
        if not label_col:
            raise ValueError("Could not find a label column (e.g., 'label', 'category').")
            
        # Find text column
        text_col = None
        for col in df.columns:
            if str(col).lower() in ['text', 'headline', 'content', 'article', 'news']:
                text_col = col
                break
                
        # If no explicit text column found, pick the first one that is not the label
        if not text_col:
            for col in df.columns:
                if col != label_col:
                    text_col = col
                    break
                    
        if not text_col:
            raise ValueError("Could not find a text column.")
            
        return df.rename(columns={label_col: 'label', text_col: 'text'})

class GujaratiPreprocessor:
    def __init__(self):
        # A simple list of common Gujarati stopwords.
        self.stopwords = set([
            'અને', 'કે', 'પણ', 'છે', 'આ', 'તે', 'માટે', 'જો', 'તો', 'થી', 'પર', 'માં', 'સાથે',
            'એક', 'કરી', 'રહ્યા', 'હોય', 'કરવા', 'આવે', 'હતો', 'હતી', 'હતા', 'નથી', 'રહ્યો',
            'જે', 'તેમજ', 'અથવા', 'વડે', 'દ્વારા', 'પાસે', 'પછી', 'પહેલા', 'ઉપર', 'નીચે'
        ])
        # Common Gujarati suffixes for stemming.
        self.suffixes = ['માં', 'ની', 'નો', 'ના', 'ને', 'થી', 'ઓ', 'એ']
        
    def normalize(self, text):
        # Keep only Gujarati characters and spaces
        text = str(text)
        text = re.sub(r'[^\u0A80-\u0AFF\s]', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text
        
    def tokenize(self, text):
        return text.split()
        
    def remove_stopwords(self, tokens):
        return [t for t in tokens if t not in self.stopwords]
        
    def rule_based_stemming(self, tokens):
        stemmed = []
        for word in tokens:
            for suffix in self.suffixes:
                if word.endswith(suffix) and len(word) > len(suffix) + 1:
                    word = word[:-len(suffix)]
                    break  # Remove at most one suffix
            stemmed.append(word)
        return stemmed
        
    def preprocess(self, text):
        norm = self.normalize(text)
        tokens = self.tokenize(norm)
        tokens = self.remove_stopwords(tokens)
        tokens = self.rule_based_stemming(tokens)
        return " ".join(tokens)

class ModelTrainer:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=5000)
        self.models = {
            "Multinomial Naive Bayes": MultinomialNB(),
            "Logistic Regression": LogisticRegression(max_iter=1000),
            "Linear SVC": CalibratedClassifierCV(LinearSVC(max_iter=1000, dual=False)),
            "Random Forest": RandomForestClassifier(n_estimators=100, n_jobs=-1, random_state=42)
        }
        self.best_model_name = None
        self.metrics = {}
        
    def save_models(self, filepath):
        data = {
            'vectorizer': self.vectorizer,
            'models': self.models,
            'metrics': self.metrics,
            'best_model_name': self.best_model_name
        }
        joblib.dump(data, filepath)
        
    def load_models(self, filepath):
        data = joblib.load(filepath)
        self.vectorizer = data['vectorizer']
        self.models = data['models']
        self.metrics = data['metrics']
        self.best_model_name = data['best_model_name']
        
    def train_and_evaluate(self, train_text, train_labels, test_text, test_labels):
        print("Vectorizing text data...")
        X_train = self.vectorizer.fit_transform(train_text)
        X_test = self.vectorizer.transform(test_text)
        
        print("Training models...")
        best_acc = 0
        for name, model in self.models.items():
            print(f"Training {name}...")
            model.fit(X_train, train_labels)
            preds = model.predict(X_test)
            
            acc = accuracy_score(test_labels, preds)
            prec = precision_score(test_labels, preds, average='weighted', zero_division=0)
            rec = recall_score(test_labels, preds, average='weighted', zero_division=0)
            f1 = f1_score(test_labels, preds, average='weighted', zero_division=0)
            
            self.metrics[name] = {
                'Accuracy': acc,
                'Precision': prec,
                'Recall': rec,
                'F1-Score': f1,
                'report': classification_report(test_labels, preds, zero_division=0)
            }
            
            if acc > best_acc:
                best_acc = acc
                self.best_model_name = name
                
    def predict(self, model_name, raw_text, preprocessor):
        processed = preprocessor.preprocess(raw_text)
        vec = self.vectorizer.transform([processed])
        
        model = self.models[model_name]
        
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(vec)[0]
            max_prob = max(probs)
            pred_idx = list(probs).index(max_prob)
            pred = model.classes_[pred_idx]
            confidence = max_prob
        else:
            pred = model.predict(vec)[0]
            confidence = 1.0
            
        return pred, confidence
        
class SummarizerTranslatorPipeline:
    def __init__(self):
        # We initialize this lazily inside __init__. The model will be downloaded on first use.
        print("Initializing local translation model (NLLB-200)...")
        print("Note: The model weights (~1.2GB) will download on first run.")
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            self.tokenizer = AutoTokenizer.from_pretrained("facebook/nllb-200-distilled-600M", src_lang="guj_Gujr")
            self.model = AutoModelForSeq2SeqLM.from_pretrained("facebook/nllb-200-distilled-600M")
        
    def extractive_summary(self, text, num_sentences=3):
        # Basic word frequency summarizer
        # Split by Gujarati punctuation mark '।' or standard '.' or '?' or '!'
        sentences = re.split(r'[.!?।]', str(text))
        sentences = [s.strip() for s in sentences if len(s.strip()) > 5]
        
        if len(sentences) <= num_sentences:
            return "। ".join(sentences) + ("।" if len(sentences) > 0 else "")
            
        words = re.sub(r'[^\u0A80-\u0AFF\s]', ' ', text).split()
        word_freq = {}
        for w in words:
            word_freq[w] = word_freq.get(w, 0) + 1
            
        max_freq = max(word_freq.values()) if word_freq else 1
        for w in word_freq:
            word_freq[w] = word_freq[w] / max_freq
            
        sent_scores = []
        for i, sent in enumerate(sentences):
            sent_words = re.sub(r'[^\u0A80-\u0AFF\s]', ' ', sent).split()
            score = sum([word_freq.get(w, 0) for w in sent_words])
            sent_scores.append((score, i, sent))
            
        sent_scores.sort(reverse=True, key=lambda x: x[0])
        top_sentences = sent_scores[:num_sentences]
        top_sentences.sort(key=lambda x: x[1]) # Preserve original order
        
        return "। ".join([s[2] for s in top_sentences]) + "।"
        
    def summarize_and_translate(self, raw_text):
        summary = self.extractive_summary(raw_text)
        try:
            inputs = self.tokenizer(summary, return_tensors="pt")
            translated_tokens = self.model.generate(
                **inputs, 
                forced_bos_token_id=self.tokenizer.convert_tokens_to_ids("eng_Latn"), 
                max_length=512
            )
            translation = self.tokenizer.batch_decode(translated_tokens, skip_special_tokens=True)[0]
        except Exception as e:
            translation = f"Translation failed: {e}"
        return summary, translation

class CLIController:
    def __init__(self, loader, preprocessor, trainer, pipeline):
        self.loader = loader
        self.preprocessor = preprocessor
        self.trainer = trainer
        self.pipeline = pipeline
        self.confidence_threshold = 0.60
        
    def run(self):
        while True:
            print("\n=========================================")
            print("GUJARATI NEWS MULTI-MODEL NLP SYSTEM")
            print("=========================================")
            print("1. View Performance Metrics of All Models")
            print("2. Validate Test Data Across All Models")
            print("3. Test on New Gujarati News Text (Real-Time Inference)")
            print(f"4. Change Confidence Threshold (Current: {self.confidence_threshold*100:.0f}%)")
            print("5. Exit")
            print("-----------------------------------------")
            choice = input("Select an option (1-5): ")
            
            if choice == '1':
                self.view_metrics()
            elif choice == '2':
                self.validate_test_data()
            elif choice == '3':
                self.real_time_inference()
            elif choice == '4':
                self.change_threshold()
            elif choice == '5':
                print("Exiting the system. Goodbye!")
                break
            else:
                print("Invalid choice. Please try again.")
                
    def change_threshold(self):
        try:
            val = input(f"Enter new confidence threshold (e.g., 60 for 60%): ")
            new_threshold = float(val) / 100.0
            if 0.0 <= new_threshold <= 1.0:
                self.confidence_threshold = new_threshold
                print(f"Confidence threshold updated to {self.confidence_threshold*100:.0f}%")
            else:
                print("Invalid range. Please enter a value between 0 and 100.")
        except ValueError:
            print("Invalid input. Please enter a valid number.")
                
    def view_metrics(self):
        if not self.trainer.metrics:
            print("Models are not trained yet.")
            return
            
        print("\n--- Model Performance Metrics ---")
        print(f"{'Model':<25} | {'Accuracy':<10} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10}")
        print("-" * 75)
        for name, metrics in self.trainer.metrics.items():
            print(f"{name:<25} | {metrics['Accuracy']:<10.4f} | {metrics['Precision']:<10.4f} | {metrics['Recall']:<10.4f} | {metrics['F1-Score']:<10.4f}")
        print("-" * 75)
        print(f"BEST MODEL: {self.trainer.best_model_name} (Accuracy: {self.trainer.metrics[self.trainer.best_model_name]['Accuracy']:.4f})")
        
    def validate_test_data(self):
        if not self.trainer.metrics:
            print("Models are not trained yet.")
            return
            
        print("\n--- Validation on Test Data ---")
        for name, metrics in self.trainer.metrics.items():
            print(f"\nModel: {name}")
            print(f"Accuracy: {metrics['Accuracy']:.4f}, Precision: {metrics['Precision']:.4f}, Recall: {metrics['Recall']:.4f}")
            print(metrics['report'])
            
    def real_time_inference(self):
        if not self.trainer.metrics:
            print("Models are not trained yet.")
            return
            
        print("\n--- Test on New Gujarati News Text ---")
        print("Paste your Gujarati news article below (Enter an empty line or type 'END' on a new line to finish):")
        lines = []
        while True:
            try:
                line = input()
            except EOFError:
                break
            if line.strip().upper() == 'END' or line.strip() == '':
                break
            lines.append(line)
            
        raw_text = "\n".join(lines).strip()
        if not raw_text:
            print("No text provided.")
            return
            
        best_model = self.trainer.best_model_name
        predicted_category, confidence = self.trainer.predict(best_model, raw_text, self.preprocessor)
        
        if confidence < self.confidence_threshold:
            predicted_category = "others"
        
        print("\nGenerating summary and translation...")
        summary, translation = self.pipeline.summarize_and_translate(raw_text)
        
        print("\n" + "="*40)
        print("INFERENCE RESULTS")
        print("="*40)
        print(f"Predicted Category: {predicted_category} (Confidence: {confidence*100:.2f}%)")
        print(f"Best Model Used: {best_model} (Test Accuracy: {self.trainer.metrics[best_model]['Accuracy']:.4f})")
        print("\n--- Gujarati Summary (3-4 Sentences) ---")
        print(summary)
        print("\n--- English Translated Summary ---")
        print(translation)
        print("="*40)
        
        while True:
            print("\nSub-Menu:")
            print("3.1 See prediction results of ALL OTHER 3 models for this exact article")
            print("3.2 Go back to Main Menu")
            sub_choice = input("Select an option (3.1/3.2): ")
            
            if sub_choice == '3.1':
                print("\n--- Predictions from Other Models ---")
                for name in self.trainer.models:
                    if name != best_model:
                        pred, conf = self.trainer.predict(name, raw_text, self.preprocessor)
                        final_pred = "others" if conf < self.confidence_threshold else pred
                        print(f"{name:<25}: {final_pred} (Confidence: {conf*100:.2f}%, Model Test Accuracy: {self.trainer.metrics[name]['Accuracy']:.4f})")
            elif sub_choice == '3.2':
                break
            else:
                print("Invalid choice. Enter 3.1 or 3.2.")

def main():
    print("Initializing Gujarati NLP System...")
    
    preprocessor = GujaratiPreprocessor()
    trainer = ModelTrainer()
    pipeline = SummarizerTranslatorPipeline()
    loader = None
    
    model_path = "gujarati_models.joblib"
    
    if os.path.exists(model_path):
        print(f"\nFound pre-trained model checkpoint '{model_path}'.")
        print("Loading models from disk (skipping training)...")
        try:
            trainer.load_models(model_path)
        except Exception as e:
            print(f"Failed to load models from '{model_path}': {e}")
            return
    else:
        print("\nNo pre-trained model found. Checking for local datasets to train...")
        loader = DatasetLoader()
        try:
            train_df, test_df = loader.load_data()
        except Exception as e:
            print(f"Initialization failed during data loading: {e}")
            print(f"To train the models for the first time, please ensure datasets are in the directory.")
            return
            
        print("Preprocessing data...")
        # Process train and test texts
        train_df['processed_text'] = train_df['text'].astype(str).apply(preprocessor.preprocess)
        test_df['processed_text'] = test_df['text'].astype(str).apply(preprocessor.preprocess)
        
        trainer.train_and_evaluate(
            train_df['processed_text'], train_df['label'],
            test_df['processed_text'], test_df['label']
        )
        
        print(f"Saving trained models to '{model_path}'...")
        trainer.save_models(model_path)
    
    cli = CLIController(loader, preprocessor, trainer, pipeline)
    cli.run()

if __name__ == "__main__":
    main()
