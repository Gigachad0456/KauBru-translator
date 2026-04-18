from app import app
from models.user import User
from extensions import db
from werkzeug.security import generate_password_hash

with app.app_context():
    admin = User.query.filter_by(role="admin").first()

    if admin:
        admin.password = generate_password_hash("admin123")
        print("Admin updated:", admin.username)
    else:
        admin = User(
            username="admin",
            email="admin@test.com",
            password=generate_password_hash("admin123"),
            role="admin"
        )
        db.session.add(admin)
        print("Admin created")

    db.session.commit()