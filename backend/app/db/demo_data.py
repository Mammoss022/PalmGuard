"""Reserved identities for synthetic fixtures, excluded from real survey statistics."""
from sqlalchemy import select
from app.models.user import User

DEMO_DOMAIN = "@demo.palmguard.invalid"


def real_users():
    return ~User.email.endswith(DEMO_DOMAIN)


def real_user_ids():
    return select(User.id).where(real_users())
