from flask import Blueprint, request, jsonify
from models.word import Word
from models.analytics import Analytics
from extensions import db
import re

api = Blueprint('api', __name__)

def clean_text(text):
    return re.sub(r'[^\w\s]', '', text.lower()).strip()

@api.route("/add-word", methods=["POST"])
def add_word():
    data = request.get_json()

    clean_english = clean_text(data["english"])

    existing = Word.query.filter_by(english=clean_english).first()
    if existing:
        return jsonify({"error": "Word already exists"}), 400

    word = Word(
        english=clean_english,
        reang=data["reang"]
    )

    db.session.add(word)
    db.session.commit()

    return jsonify({"message": "Added"})

@api.route('/translate/sentence')
def translate_sentence():
    text = request.args.get('text', '')

    if not text:
        return jsonify({"error": "No text"}), 400

    tokens = text.lower().split()
    translated = []
    i = 0

    while i < len(tokens):
        matched = False
        # Try longest phrase match first (greedy)
        for length in range(len(tokens) - i, 0, -1):
            phrase = " ".join(tokens[i:i + length])
            result = Word.query.filter_by(english=phrase).first()
            if result:
                translated.append(result.reang)
                i += length
                matched = True
                break
        if not matched:
            # No match — keep original word
            translated.append(tokens[i])
            i += 1

    # Update analytics
    analytics = Analytics.query.first()
    if not analytics:
        analytics = Analytics(total_translations=0, total_words=0)
        db.session.add(analytics)

    analytics.total_translations += 1
    db.session.commit()

    print("Translation count:", analytics.total_translations)

    return jsonify({
        "translated": " ".join(translated)
    })

@api.route('/words')
def get_words():
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '', type=str)

    query = Word.query

    if search:
        query = query.filter(Word.english.ilike(f"%{search}%"))

    pagination = query.paginate(page=page, per_page=10)

    return jsonify({
        "words": [
            {
                "id": w.id,
                "english": w.english,
                "reang": w.reang
            } for w in pagination.items
        ],
        "total_pages": pagination.pages,
        "current_page": pagination.page
    })
    
@api.route('/delete-word/<int:id>', methods=["DELETE"])
def delete_word(id):
    word = Word.query.get(id)

    if not word:
        return jsonify({"error": "Not found"}), 404

    db.session.delete(word)
    db.session.commit()

    return jsonify({"message": "Deleted"})

@api.route('/update-word/<int:id>', methods=["PUT"])
def update_word(id):
    data = request.get_json()

    word = Word.query.get(id)

    if not word:
        return jsonify({"error": "Not found"}), 404

    word.english = data["english"]
    word.reang = data["reang"]

    db.session.commit()

    return jsonify({"message": "Updated"})