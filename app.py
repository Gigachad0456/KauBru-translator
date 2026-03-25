from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
import json
import re
import os

app = Flask(__name__)


app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL") or "postgresql://localhost/reang_db"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
class Word(db.Model):
   id = db.Column(db.Integer, primary_key=True)
   english = db.Column(db.String(100), unique=True, nullable=False)
   reang = db.Column(db.String(100), nullable=False)
   
   def to_dict(self):
      return {
         "english": self.english, 
         "reang": self.reang
         }
      

with open('data/words.json') as f:
    words = json.load(f)
    

    
def clean_text(text):
    return re.sub(r'[^\w\s]', '', text.lower()).strip()

@app.route('/')
def index():
   return render_template('index.html')

@app.route("/add-word", methods=["POST"])
def add_word():
    data = request.get_json()

    if not data or "english" not in data or "reang" not in data:
        return jsonify({"error": "Invalid input"}), 400

    existing = Word.query.filter_by(
        english=clean_text(data["english"])
    ).first()

    if existing:
        return jsonify({"error": "Word already exists"}), 400

    word = Word(
        english=clean_text(data["english"]),
        reang=data["reang"]
    )

    db.session.add(word)
    db.session.commit()

    return jsonify({"message": "Added"})
 
   
@app.route('/translate/en_to_re')
def en_to_re():
   word = clean_text(request.args.get('word'))

   result = Word.query.filter_by(english=word).first()
   if result:
      return jsonify(result.to_dict())
   else:
      return jsonify({"error": "word not found"}), 404
   
@app.route('/translate/re_to_en')
def re_to_en():
   word = clean_text(request.args.get('word'))

   result = Word.query.filter_by(reang=word).first()
   if result:
      return jsonify(result.to_dict())
   else:
      return jsonify({"error": "word not found"}), 404

@app.route('/translate/sentence')
def translate_sentence():
    sentence = request.args.get('text')

    if not sentence:
        return jsonify({"error": "No sentence provided"}), 400

    cleaned_sentence = clean_text(sentence)

    # 🔥 full sentence match
    full_match = Word.query.filter(
        Word.english.ilike(cleaned_sentence)
    ).first()

    if full_match:
        return jsonify({"translated": full_match.reang})

    # fallback word-by-word
    words_list = cleaned_sentence.split()
    translated = []

    for w in words_list:
        result = Word.query.filter(Word.english.ilike(w)).first()
        if result:
            translated.append(result.reang)
        else:
            translated.append(w)

    return jsonify({"translated": " ".join(translated)})

with app.app_context():
   db.create_all()
   for w in words:
      clean_english = clean_text(w['english'])   # ✅ clean here

      existing_words = Word.query.filter_by(english=clean_english).first()
      if not existing_words:
         word = Word(
             english=clean_english,   # ✅ use cleaned
             reang=w['reang']
         )
         db.session.add(word)
   db.session.commit()
   
if __name__ == "__main__":
    app.run(debug=True)
