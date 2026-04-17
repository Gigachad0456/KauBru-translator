from flask import Blueprint, request, jsonify, g
from models.word import Word
from models.analytics import Analytics
from extensions import db
import re
from services.decorators import api_login_required, api_admin_required

api = Blueprint('api', __name__)

def clean_text(text):
    return re.sub(r'[^\w\s]', '', text.lower()).strip()

@api.route("/add-word", methods=["POST"])
@api_login_required
def add_word():
    data = request.get_json()
    clean_english = clean_text(data["english"])

    existing = Word.query.filter_by(english=clean_english).first()
    if existing:
        return jsonify({"error": "Word already exists"}), 400

    is_approved = True if getattr(g, 'user', None) and g.user.role == 'admin' else False

    word = Word(
        english=clean_english,
        reang=data["reang"],
        user_id=g.user.id if getattr(g, 'user', None) else None,
        is_approved=is_approved
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
            result = Word.query.filter_by(english=phrase, is_approved=True).first()
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

    return jsonify({
        "translated": " ".join(translated)
    })

@api.route('/words')
def get_words():
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '', type=str)
    owner = request.args.get('owner', '', type=str)

    query = Word.query

    if owner == 'me' and getattr(g, 'user', None):
        query = query.filter_by(user_id=g.user.id)
    elif owner == 'pending' and getattr(g, 'user', None) and g.user.role == 'admin':
        query = query.filter_by(is_approved=False)

    if search:
        query = query.filter(Word.english.ilike(f"%{search}%"))

    pagination = query.paginate(page=page, per_page=10)

    return jsonify({
        "words": [
            w.to_dict() for w in pagination.items
        ],
        "total_pages": pagination.pages,
        "current_page": pagination.page
    })
    
@api.route('/delete-word/<int:id>', methods=["DELETE"])
@api_login_required
def delete_word(id):
    word = Word.query.get(id)

    if not word:
        return jsonify({"error": "Not found"}), 404

    if getattr(g, 'user', None) and g.user.role != 'admin' and word.user_id != g.user.id:
        return jsonify({"error": "Unauthorized"}), 403

    db.session.delete(word)
    db.session.commit()

    return jsonify({"message": "Deleted"})

@api.route('/update-word/<int:id>', methods=["PUT"])
@api_login_required
def update_word(id):
    data = request.get_json()

    word = Word.query.get(id)

    if not word:
        return jsonify({"error": "Not found"}), 404

    if getattr(g, 'user', None) and g.user.role != 'admin' and word.user_id != g.user.id:
        return jsonify({"error": "Unauthorized"}), 403

    word.english = data["english"]
    word.reang = data["reang"]

    db.session.commit()

    return jsonify({"message": "Updated"})

@api.route('/approve-word/<int:id>', methods=["POST"])
@api_admin_required
def approve_word(id):
    word = Word.query.get(id)
    if not word:
        return jsonify({"error": "Not found"}), 404
        
    word.is_approved = True
    db.session.commit()
    
    return jsonify({"message": "Approved"})

@api.route('/reject-word/<int:id>', methods=["POST"])
@api_admin_required
def reject_word(id):
    word = Word.query.get(id)
    if not word:
        return jsonify({"error": "Not found"}), 404
        
    db.session.delete(word)
    db.session.commit()
    
    return jsonify({"message": "Rejected"})