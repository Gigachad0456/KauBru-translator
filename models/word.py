from extensions import db

class Word(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    english = db.Column(db.String(100), unique=True, nullable=False)
    reang = db.Column(db.String(100), nullable=False)

    def to_dict(self):
        return {
            "english": self.english,
            "reang": self.reang
        }