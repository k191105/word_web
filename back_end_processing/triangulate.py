import os
from gensim.models import KeyedVectors
import numpy as np

def load_model(model_path):
    try:
        model = KeyedVectors.load(model_path, mmap='r')
        print("Model loaded successfully.")
        return model
    except Exception as e:
        print(f"Failed to load model: {e}")
        return None

def triangulate_words_enhanced(model, words, weights, topn=20):
 
    assert len(words) == len(weights), "Words and weights length mismatch"
    
    weighted_vectors = []
    for word, weight in zip(words, weights):
        try:
            vector = model[word] * weight
            weighted_vectors.append(vector)
        except KeyError:
            print(f"Word '{word}' not in the model's vocabulary.")
    
    if not weighted_vectors:
        return "No valid weighted vectors were generated from the input words."
    
    centroid = np.mean(weighted_vectors, axis=0)

    centroid = centroid / np.linalg.norm(centroid)
    
    closest_words = model.similar_by_vector(centroid, topn=topn)
    # Filter out the initial words from the results
    filtered_words = [word for word, similarity in closest_words if word not in words]

    # Return only up to `topn` results to maintain the expected list size
    return filtered_words[:topn]

if __name__ == "__main__":
    model_google_news_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'word2vec-google-news-300_trimmed.model')
    model = load_model(model_google_news_path)
    
    if model:
        words = ['bad', 'unusual', 'rare', 'obscure']
        weights = [0.6, 0.2, 0.1, 0.1]  
        top_words = triangulate_words_enhanced(model, words, weights, topn=20)
        print("Top 20 triangulated words:", top_words)
