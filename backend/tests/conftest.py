import pytest
import requests
import os

@pytest.fixture(scope="session")
def base_url():
    """Base URL for API testing"""
    url = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
    if not url:
        pytest.fail("EXPO_PUBLIC_BACKEND_URL environment variable not set")
    return url

@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="session")
def admin_credentials():
    """Admin credentials for testing"""
    return {
        "email": "admin@aeroshare.com",
        "password": "admin123"
    }

@pytest.fixture(scope="session")
def admin_token(base_url, api_client, admin_credentials):
    """Get admin access token"""
    response = api_client.post(
        f"{base_url}/api/auth/login",
        json=admin_credentials
    )
    if response.status_code != 200:
        pytest.fail(f"Failed to login as admin: {response.status_code} - {response.text}")
    data = response.json()
    return data.get("access_token")
