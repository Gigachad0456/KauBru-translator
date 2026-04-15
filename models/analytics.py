from extensions import db

class Analytics(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    total_translations = db.Column(db.Integer, default=0)
    total_words = db.Column(db.Integer, default=0)