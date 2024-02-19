from flask import Flask, request, jsonify, send_from_directory
from output import find_weighted_similar_words, load_models
import os
import threading

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
