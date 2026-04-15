import pytest
import requests
from datetime import datetime, timedelta, timezone

class TestPayments:
    """Payment endpoint tests"""

    @pytest.fixture(scope="class")
    def test_ride_id(self, base_url, api_client, admin_token):
        """Create a test ride for payment testing"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        flight_time = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        ride_data = {
            "origin_lat": 51.5074,
            "origin_lng": -0.1278,
            "origin_address": "London, UK",
            "airport_code": "LHR",
            "airport_name": "London Heathrow",
            "flight_time": flight_time
        }
        response = api_client.post(f"{base_url}/api/rides", json=ride_data, headers=headers)
        assert response.status_code == 200
        return response.json()["ride_id"]

    def test_create_checkout_session(self, base_url, api_client, admin_token, test_ride_id):
        """Test POST /api/payments/create-checkout"""
        try:
            headers = {"Authorization": f"Bearer {admin_token}"}
            checkout_data = {
                "ride_id": test_ride_id,
                "origin_url": base_url
            }
            
            response = api_client.post(
                f"{base_url}/api/payments/create-checkout",
                json=checkout_data,
                headers=headers
            )
            print(f"Create checkout status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            print(f"Checkout response keys: {data.keys()}")
            assert "checkout_url" in data, "Response should contain checkout_url"
            assert "session_id" in data, "Response should contain session_id"
            assert data["checkout_url"].startswith("http"), "checkout_url should be a valid URL"
            print(f"✓ Create checkout passed - Session ID: {data['session_id']}")
        except Exception as e:
            print(f"✗ Create checkout failed: {str(e)}")
            raise

    def test_create_checkout_no_auth(self, base_url, test_ride_id):
        """Test POST /api/payments/create-checkout without auth"""
        try:
            # Use fresh session without cookies
            fresh_client = requests.Session()
            fresh_client.headers.update({"Content-Type": "application/json"})
            checkout_data = {
                "ride_id": test_ride_id,
                "origin_url": base_url
            }
            
            response = fresh_client.post(
                f"{base_url}/api/payments/create-checkout",
                json=checkout_data
            )
            print(f"Create checkout no auth status: {response.status_code}")
            assert response.status_code == 401, f"Expected 401, got {response.status_code}"
            print("✓ Unauthenticated checkout correctly rejected")
        except Exception as e:
            print(f"✗ No auth test failed: {str(e)}")
            raise