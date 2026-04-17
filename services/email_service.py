import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email(to_email: str, subject: str, html_body: str):
    smtp_server = os.environ.get("SMTP_SERVER")
    smtp_port = os.environ.get("SMTP_PORT")
    smtp_user = os.environ.get("SMTP_USERNAME")
    smtp_pass = os.environ.get("SMTP_PASSWORD")

    if not all([smtp_server, smtp_port, smtp_user, smtp_pass]):
        print(f"\n--- MOCK EMAIL TO {to_email} ---")
        print(f"Subject: {subject}")
        print(html_body)
        print("---------------------------------\n")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_user
        msg["To"] = to_email

        part = MIMEText(html_body, "html")
        msg.attach(part)

        # assuming TLS
        server = smtplib.SMTP(smtp_server, int(smtp_port))
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, to_email, msg.as_string())
        server.quit()
    except Exception as e:
        print(f"Failed to send email: {e}")

def send_verification_email(email: str, verification_link: str):
    subject = "Verify Your Reang Translator Account"
    body = f"""
    <h2>Welcome to Reang Translator</h2>
    <p>Please click the link below to verify your email address:</p>
    <a href="{verification_link}">{verification_link}</a>
    """
    send_email(email, subject, body)

def send_password_reset_email(email: str, reset_link: str):
    subject = "Reset Your Reang Translator Password"
    body = f"""
    <h2>Password Reset</h2>
    <p>Please click the link below to reset your password:</p>
    <a href="{reset_link}">{reset_link}</a>
    <p>If you did not request this, please ignore this email.</p>
    """
    send_email(email, subject, body)
