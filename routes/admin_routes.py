from flask import Blueprint, render_template, jsonify
from models.analytics import Analytics
from models.word import Word
from services.decorators import admin_required

admin = Blueprint('admin', __name__)

@admin.route('/admin')
@admin_required
def admin_page():
    return render_template('admin.html')

@admin.route('/admin/stats')
@admin_required
def stats():
    analytics = Analytics.query.first()

    total_words = Word.query.count()  # 🔥 REAL COUNT

    return jsonify({
        "translations": analytics.total_translations if analytics else 0,
        "words": total_words
    })
    
@admin.route('/admin/chart')
@admin_required
def chart_data():
    return jsonify({
        "labels": ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "data": [5, 10, 7, 15, 20]
    })