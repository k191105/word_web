from flask import Flask, request, jsonify, send_from_directory
from .output import find_weighted_similar_words, load_models ## Change to .output for deployment, output for local
import os
import threading
from .triangulate import triangulate_words_enhanced, load_model


app = Flask(__name__, static_folder='../front_end')

models = None

def load_models_async():
    global models
    models = load_models()
    print("Models loaded successfully.")
    

# Load the models asynchronously when the server starts
threading.Thread(target=load_models_async).start()

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(app.static_folder, path)


@app.route('/triangulate', methods=['POST'])
def triangulate():
    data = request.json
    words = data.get('words', [])
    weights = data.get('weights', [])

    # Validate input
    if not words or not weights or len(words) != len(weights):
        return jsonify({"error": "Invalid input: words and weights must be provided and match in length"}), 400

    # Load your Word2Vec model (consider doing this once at app initialization if it's resource-intensive)
    model_google_news_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'word2vec-google-news-300_trimmed.model')
    model = load_model(model_google_news_path)
    
    if not model:
        return jsonify({"error": "Failed to load the model"}), 500

    try:
        # Ensure weights are floats, as they might be sent as strings
        weights = [float(weight) for weight in weights]
        similar_words = triangulate_words_enhanced(model, words, weights, topn=20)
        return jsonify(similar_words)
    except Exception as e:
        # Handle errors more gracefully in production code
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)

@app.route('/get_graph', methods=['POST'])
def get_graph():
    if models is None:
        return jsonify({"error": "Models are still loading. Please wait..."}), 503  # 503 Service Unavailable

    data = request.json
    word = data.get('word')

    # Validate the input
    if not word:
        return jsonify({"error": "No word provided"}), 400

    # Find similar words
    similar_words = find_weighted_similar_words(word, models)

    # Check if similar words are found
    if not similar_words:
        return jsonify({"error": "Word not found in any models"}), 404

    return jsonify({"similar_words": similar_words})

if __name__ == '__main__':
    app.run(debug=True)
