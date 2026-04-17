from itsdangerous import URLSafeTimedSerializer
from flask import current_app

def generate_verification_token(email: str) -> str:
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    return serializer.dumps(email, salt='email-verification-salt')

def verify_token(token: str, expiration: int = 3600) -> str:
    """Verifies the token and returns the email if valid, or None if invalid/expired."""
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        email = serializer.loads(token, salt='email-verification-salt', max_age=expiration)
        return email
    except Exception:
        return None
