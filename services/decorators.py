from functools import wraps
from flask import session, redirect, url_for, flash, jsonify, g

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            flash("Please log in to access this page.", "error")
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            flash("Please log in to access this page.", "error")
            return redirect(url_for('auth.login'))
        if not g.user or g.user.role != 'admin':
            flash("You do not have permission to access the admin panel.", "error")
            return redirect(url_for('main.dashboard'))
        return f(*args, **kwargs)
    return decorated_function

def api_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Unauthorized access. Please log in."}), 401
        return f(*args, **kwargs)
    return decorated_function

def api_admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session or not getattr(g, "user", None) or g.user.role != "admin":
            return jsonify({"error": "Admin access required."}), 403
        return f(*args, **kwargs)
    return decorated_function
