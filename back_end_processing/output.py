from gensim.models import KeyedVectors
import os
import spacy
nlp = spacy.load("en_core_web_sm")

def get_wordnet_pos(word):
    doc = nlp(word)
    spacy_pos_tag = doc[0].pos_  
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

def normalize_scores(results, min_val, max_val):
    if not results:  # Check if the results list is empty
        return []

    # Extract just the similarity scores from the results
    scores = [similarity for _, similarity in results]

    # Find the current min and max scores
    min_score, max_score = min(scores), max(scores)

    # Normalize scores to fall between min_val and max_val
    normalized_results = []
    for word, similarity in results:
        # Avoid division by zero if all scores are the same
        if min_score == max_score:
            normalized_score = min_val
        else:
            # Normalize the score
            normalized_score = min_val + ((similarity - min_score) / (max_score - min_score)) * (max_val - min_val)
        normalized_results.append((word, normalized_score))

    return normalized_results


def find_weighted_similar_words(target_word, models, topn=12):
    pos = get_wordnet_pos(target_word)
    print(f"Finding similar words for '{target_word}' with POS: {pos}")
    print(pos)
    # Determine if the target word is a proper noun
    is_proper_noun = pos == 'PROPN'

    # Generate similar words from both models
    oxford_results = models['oxford'].most_similar(target_word, topn=topn) if target_word in models['oxford'].key_to_index else []
    google_news_results = models['google_news'].most_similar(target_word, topn=topn) if target_word in models['google_news'].key_to_index else []
    


    if is_proper_noun:
        google_news_results = normalize_scores(google_news_results, 0.85, 1.0)
        oxford_results = normalize_scores(oxford_results, 0.7, 0.85)

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

    # print(adjusted_long_list)
    medium_list = [word for word in adjusted_long_list if word[1] >= 0.54]
    
    # Cut to short_list and sort
    short_list = sorted(medium_list[:10], key=lambda x: x[1], reverse=True)

    min_score, max_score = short_list[-1][1], short_list[0][1]
    range_min, range_max = 0.8, 1.0

    def adjust_score(score):
        # Normalize score to 0-1 then scale to new range
        return range_min + ((score - min_score) / (max_score - min_score)) * (range_max - range_min)

    sorted_adjusted_results = [(word, adjust_score(similarity)) for word, similarity in short_list]


    # Print final results for verification
    for word, similarity in sorted_adjusted_results:
        print(f'{word}: Similarity={similarity}')

    return sorted_adjusted_results


# Example usage
if __name__ == "__main__":
    models = load_models()
    similar_words = find_weighted_similar_words('thrilled', models)