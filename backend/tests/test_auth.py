import pytest
import requests
import time

class TestAuth:
    """Authentication endpoint tests"""

    def test_register_new_user(self, base_url, api_client):
        """Test user registration with new user"""
        try:
            timestamp = int(time.time())
            test_user = {
                "name": "Test User",
                "email": f"TEST_user_{timestamp}@example.com",
                "password": "testpass123"
            }
            
            response = api_client.post(f"{base_url}/api/auth/register", json=test_user)
            print(f"Register status: {response.status_code}")
            
            if response.status_code == 400:
                print(f"Registration failed (user may exist): {response.json()}")
                pytest.skip("User already exists")
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            print(f"Register response keys: {data.keys()}")
            assert "id" in data, "Response should contain user id"
            assert "email" in data, "Response should contain email"
            assert "access_token" in data, "Response should contain access_token"
            assert data["email"] == test_user["email"].lower(), "Email should match (lowercased)"
            print(f"✓ Registration passed - User ID: {data['id']}")
        except Exception as e:
            print(f"✗ Registration failed: {str(e)}")
            raise

    def test_login_admin(self, base_url, api_client, admin_credentials):
        """Test login with admin credentials"""
        try:
            response = api_client.post(f"{base_url}/api/auth/login", json=admin_credentials)
            print(f"Login status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            print(f"Login response keys: {data.keys()}")
            assert "id" in data, "Response should contain user id"
            assert "email" in data, "Response should contain email"
            assert "access_token" in data, "Response should contain access_token"
            assert "role" in data, "Response should contain role"
            assert data["email"] == admin_credentials["email"], "Email should match"
            assert data["role"] == "admin", "Role should be admin"
            print(f"✓ Login passed - User: {data['email']}, Role: {data['role']}")
        except Exception as e:
            print(f"✗ Login failed: {str(e)}")
            raise

    def test_login_invalid_credentials(self, base_url, api_client):
        """Test login with invalid credentials"""
        try:
            invalid_creds = {"email": "invalid@example.com", "password": "wrongpass"}
            response = api_client.post(f"{base_url}/api/auth/login", json=invalid_creds)
            print(f"Invalid login status: {response.status_code}")
            assert response.status_code == 401, f"Expected 401, got {response.status_code}"
            print("✓ Invalid credentials correctly rejected")
        except Exception as e:
            print(f"✗ Invalid credentials test failed: {str(e)}")
            raise

    def test_get_current_user(self, base_url, api_client, admin_token):
        """Test GET /api/auth/me with valid token"""
        try:
            headers = {"Authorization": f"Bearer {admin_token}"}
            response = api_client.get(f"{base_url}/api/auth/me", headers=headers)
            print(f"Get current user status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            print(f"Current user data: {data}")
            assert "email" in data, "Response should contain email"
            assert "name" in data, "Response should contain name"
            assert data["email"] == "admin@aeroshare.com", "Email should be admin"
            print(f"✓ Get current user passed - {data['email']}")
        except Exception as e:
            print(f"✗ Get current user failed: {str(e)}")
            raise

    def test_get_current_user_no_token(self, base_url):
        """Test GET /api/auth/me without token"""
        try:
            # Use fresh session without cookies
            fresh_client = requests.Session()
            fresh_client.headers.update({"Content-Type": "application/json"})
            response = fresh_client.get(f"{base_url}/api/auth/me")
            print(f"No token status: {response.status_code}")
            assert response.status_code == 401, f"Expected 401, got {response.status_code}"
            print("✓ Unauthenticated request correctly rejected")
        except Exception as e:
            print(f"✗ No token test failed: {str(e)}")
            raise