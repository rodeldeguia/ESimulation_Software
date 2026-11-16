from flask import Flask, request, jsonify
import spacy

app = Flask(__name__)
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
        tokens.append({
            "text": token.text,
            "lemma": token.lemma_,
            "pos": token.pos_,
            "dep": token.dep_,
            "head": token.head.text,
            "is_singular": "Sing" in token.morph.get("Number", []),
            "is_plural": "Plur" in token.morph.get("Number", [])
        })
        
    return jsonify({"tokens": tokens})

if __name__ == '__main__':
    app.run(port=5001, debug=False) # Set to False for production/client use