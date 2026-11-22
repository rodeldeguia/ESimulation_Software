from flask import Flask, request, jsonify
import spacy

app = Flask(__name__)
# Use the medium model if you have it for better accuracy, otherwise sm is fine
nlp = spacy.load("en_core_web_sm") 

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return jsonify({"error": "No text provided"}), 400

    doc = nlp(text)
    
    tokens = []
    for token in doc:
        # spaCy sometimes misses morphology on pronouns, so we manually fallback
        is_sing = "Sing" in token.morph.get("Number", []) or token.text.lower() in ['i', 'he', 'she', 'it', 'myself', 'himself', 'herself', 'itself']
        is_plur = "Plur" in token.morph.get("Number", []) or token.text.lower() in ['we', 'they', 'us', 'them', 'ourselves', 'themselves']
        
        tokens.append({
            "id": token.i,               # <--- CRITICAL: Token Index
            "text": token.text,
            "lemma": token.lemma_,
            "pos": token.pos_,
            "dep": token.dep_,
            "head": token.head.text,
            "head_index": token.head.i,  # <--- CRITICAL: Head Token Index
            "is_singular": is_sing,
            "is_plural": is_plur
        })
        
    return jsonify({"tokens": tokens})

if __name__ == '__main__':
    print("Loading spaCy model and starting server on port 5001...")
    app.run(port=5001, debug=False) # Keep False for production/client use