from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from werkzeug.security import generate_password_hash, check_password_hash
from models.user import User
from extensions import db
from services.token_utils import generate_verification_token, verify_token
from services.email_service import send_verification_email, send_password_reset_email

auth = Blueprint("auth", __name__)

@auth.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        username = request.form.get("username")
        email = request.form.get("email")
        password = request.form.get("password")

        if User.query.filter_by(username=username).first():
            flash("Username already exists", "error")
            return redirect(url_for("auth.signup"))
        
        if User.query.filter_by(email=email).first():
            flash("Email already registered", "error")
            return redirect(url_for("auth.signup"))

        hashed_password = generate_password_hash(password)
        new_user = User(username=username, email=email, password=hashed_password, is_verified=True)
        db.session.add(new_user)
        db.session.commit()

        flash("Account created! You can now log in.", "success")
        return redirect(url_for("auth.login"))

    return render_template("signup.html")

@auth.route("/verify/<token>")
def verify_email(token):
    email = verify_token(token)
    if not email:
        flash("The verification link is invalid or has expired.", "error")
        return redirect(url_for("auth.login"))
    
    user = User.query.filter_by(email=email).first()
    if user:
        if user.is_verified:
            flash("Account already verified.", "success")
        else:
            user.is_verified = True
            db.session.commit()
            flash("Your account has been successfully verified! You can now log in.", "success")
    return redirect(url_for("auth.login"))

@auth.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            
            session.permanent = True
            session["user_id"] = user.id
            if user.role == 'admin':
                return redirect(url_for("admin.admin_page"))
            else:
                return redirect(url_for("main.dashboard"))
        
        flash("Invalid username or password", "error")
    
    return render_template("login.html")

@auth.route("/logout")
def logout():
    session.pop("user_id", None)
    return redirect(url_for("main.index"))

@auth.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        email = request.form.get("email")
        user = User.query.filter_by(email=email).first()
        if user:
            token = generate_verification_token(email)
            reset_link = url_for("auth.reset_password", token=token, _external=True)
            send_password_reset_email(email, reset_link)
        
        flash("If an account with that email exists, a password reset link has been sent.", "success")
        return redirect(url_for("auth.login"))
    
    return render_template("forgot_password.html")

@auth.route("/reset-password/<token>", methods=["GET", "POST"])
def reset_password(token):
    email = verify_token(token)
    if not email:
        flash("The reset link is invalid or has expired.", "error")
        return redirect(url_for("auth.forgot_password"))
    
    if request.method == "POST":
        password = request.form.get("password")
        user = User.query.filter_by(email=email).first()
        if user:
            user.password = generate_password_hash(password)
            db.session.commit()
            flash("Your password has been updated! You can now log in.", "success")
            return redirect(url_for("auth.login"))
            
    return render_template("reset_password.html", token=token)