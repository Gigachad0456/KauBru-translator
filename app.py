from flask import Flask, g, session
from config import Config
from extensions import db

# import routes
from routes.main_routes import main
from routes.admin_routes import admin
from routes.api_routes import api
from routes.auth_routes import auth

from models.analytics import Analytics
from models.user import User


app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

# register routes
app.register_blueprint(main)
app.register_blueprint(admin)
app.register_blueprint(api)
app.register_blueprint(auth)

@app.before_request
def load_current_user():
    user_id = session.get("user_id")
    g.user = db.session.get(User, user_id) if user_id else None

@app.context_processor
def inject_current_user():
    return {"current_user": getattr(g, "user", None)}

with app.app_context():
    db.drop_all()
    db.create_all()

    # init analytics
    if not Analytics.query.first():
        db.session.add(Analytics())
        db.session.commit()
        

if __name__ == "__main__":
    app.run(debug=False)