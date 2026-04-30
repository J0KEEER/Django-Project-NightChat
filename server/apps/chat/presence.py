from django.core.cache import cache
from django.conf import settings

PRESENCE_KEY_PREFIX = "presence:"
PRESENCE_TIMEOUT = 60  # seconds

def set_user_online(user_id):
    """Mark a user as online in Redis with a TTL."""
    key = f"{PRESENCE_KEY_PREFIX}{user_id}"
    cache.set(key, "online", timeout=PRESENCE_TIMEOUT)

def set_user_offline(user_id):
    """Explicitly mark a user as offline by deleting their presence key."""
    key = f"{PRESENCE_KEY_PREFIX}{user_id}"
    cache.delete(key)

def is_user_online(user_id):
    """Check if a user is currently online."""
    key = f"{PRESENCE_KEY_PREFIX}{user_id}"
    return cache.get(key) == "online"

def get_online_users(user_ids):
    """Given a list of user IDs, return a list of those who are online."""
    keys = [f"{PRESENCE_KEY_PREFIX}{uid}" for uid in user_ids]
    results = cache.get_many(keys)
    online_ids = []
    for key, value in results.items():
        if value == "online":
            # Extract user_id from key
            uid = key.split(":")[-1]
            online_ids.append(uid)
    return online_ids
