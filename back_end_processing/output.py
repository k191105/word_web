from gensim.models import KeyedVectors
import os
import spacy
nlp = spacy.load("en_core_web_sm")

# Function to determine the primary POS tag in WordNet format
def get_wordnet_pos(word):
    doc = nlp(word)
    spacy_pos_tag = doc[0].pos_  # Get the spaCy POS tag for the first token
    print(f"spaCy POS tag for '{word}': {spacy_pos_tag}")
    return spacy_pos_tag


# Function to load models
def load_models():
    # Construct the path to the model files
    model_google_news_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'word2vec-google-news-300_trimmed.model')
    model_oxford_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'word2vec_model_oxford.model')
    

    # Attempt to load the models
    try:
        model_google_news = KeyedVectors.load(model_google_news_path, mmap='r')
        model_oxford = KeyedVectors.load(model_oxford_path, mmap='r')  # Ensure this loads KeyedVectors
        models = {'google_news': model_google_news, 'oxford': model_oxford.wv}  # Corrected to use .wv for Word2Vec models
        print("Models loaded successfully.")
        return models
    except Exception as e:
        print("Failed to load models:", e)
        raise

def find_weighted_similar_words(target_word, models, topn=12):
    pos = get_wordnet_pos(target_word)
    print(f"Finding similar words for '{target_word}' with POS: {pos}")

    # Generate similar words from both models
    oxford_results = models['oxford'].most_similar(target_word, topn=topn) if target_word in models['oxford'].key_to_index else []
    google_news_results = models['google_news'].most_similar(target_word, topn=topn) if target_word in models['google_news'].key_to_index else []
    # print(f"oxford_results: {oxford_results}")
    # print(f"google reults: {google_news_results}")
    # Combine results based on POS
    if pos in ["ADJ", "VERB", "ADV"]:
        long_list = oxford_results + google_news_results
        print("Using Oxford")
    else:  # For nouns
        long_list = google_news_results + oxford_results
        print("Using Google")

    # print("Initial long_list created with combined results.")
    # print(long_list)
    # Deduplicate and adjust scores
    seen_words = set()
    adjusted_long_list = []
    for word, similarity in long_list:
        if word not in seen_words:
            seen_words.add(word)
            adjusted_long_list.append((word, similarity))
        else:
            # Adjust similarity score for first occurrence
            for i, (adj_word, adj_similarity) in enumerate(adjusted_long_list):
                if adj_word == word:
                    adjusted_long_list[i] = (adj_word, adj_similarity * 1.16)
                    break

    # Create medium_list by removing misspellings, plurals, and low scores
    medium_list = [word for word in adjusted_long_list if word[1] >= 0.6]

    # Cut to short_list and sort
    short_list = sorted(medium_list[:10], key=lambda x: x[1], reverse=True)


    # Adjust scores to spread between 0.75 and 1
    min_score, max_score = short_list[-1][1], short_list[0][1]
    range_min, range_max = 0.8, 1.0

    def adjust_score(score):
        # Normalize score to 0-1 then scale to new range
        return range_min + ((score - min_score) / (max_score - min_score)) * (range_max - range_min)

    sorted_adjusted_results = [(word, adjust_score(similarity)) for word, similarity in short_list]

    for word, similarity in sorted_adjusted_results:
        print(f'{word}: {similarity}')

    return sorted_adjusted_results

# Example usage
if __name__ == "__main__":
    models = load_models()
    similar_words = find_weighted_similar_words('cheese', models)