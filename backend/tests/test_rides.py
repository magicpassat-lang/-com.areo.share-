import pytest
import requests
from datetime import datetime, timedelta, timezone

class TestRides:
    """Ride endpoint tests"""

    def test_create_ride(self, base_url, api_client, admin_token):
        """Test POST /api/rides creates a ride"""
        try:
            headers = {"Authorization": f"Bearer {admin_token}"}
            
            # Create ride for tomorrow
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
            print(f"Create ride status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            print(f"Create ride response: {data}")
            assert "ride_id" in data, "Response should contain ride_id"
            assert "status" in data, "Response should contain status"
            assert data["status"] == "pending_payment", "Initial status should be pending_payment"
            
            # Verify ride was created by fetching it
            ride_id = data["ride_id"]
            get_response = api_client.get(f"{base_url}/api/rides/{ride_id}", headers=headers)
            assert get_response.status_code == 200, f"Failed to fetch created ride: {get_response.status_code}"
            
            ride_details = get_response.json()
            print(f"Fetched ride details: {ride_details}")
            assert ride_details["id"] == ride_id, "Ride ID should match"
            assert ride_details["airport_code"] == "LHR", "Airport code should match"
            assert ride_details["status"] == "pending_payment", "Status should be pending_payment"
            print(f"✓ Create ride passed - Ride ID: {ride_id}")
        except Exception as e:
            print(f"✗ Create ride failed: {str(e)}")
            raise

    def test_create_ride_no_auth(self, base_url):
        """Test POST /api/rides without authentication"""
        try:
            # Use fresh session without cookies
            fresh_client = requests.Session()
            fresh_client.headers.update({"Content-Type": "application/json"})
            flight_time = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
            ride_data = {
                "origin_lat": 51.5074,
                "origin_lng": -0.1278,
                "origin_address": "London, UK",
                "airport_code": "LHR",
                "airport_name": "London Heathrow",
                "flight_time": flight_time
            }
            
            response = fresh_client.post(f"{base_url}/api/rides", json=ride_data)
            print(f"Create ride no auth status: {response.status_code}")
            assert response.status_code == 401, f"Expected 401, got {response.status_code}"
            print("✓ Unauthenticated ride creation correctly rejected")
        except Exception as e:
            print(f"✗ No auth test failed: {str(e)}")
            raise

    def test_get_my_rides(self, base_url, api_client, admin_token):
        """Test GET /api/rides/my returns user's rides"""
        try:
            headers = {"Authorization": f"Bearer {admin_token}"}
            response = api_client.get(f"{base_url}/api/rides/my", headers=headers)
            print(f"Get my rides status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            print(f"Number of rides: {len(data)}")
            assert isinstance(data, list), "Response should be a list"
            
            if len(data) > 0:
                ride = data[0]
                print(f"First ride: {ride}")
                assert "id" in ride, "Ride should have id"
                assert "airport_code" in ride, "Ride should have airport_code"
                assert "status" in ride, "Ride should have status"
                assert "payment_status" in ride, "Ride should have payment_status"
            
            print(f"✓ Get my rides passed - {len(data)} rides found")
        except Exception as e:
            print(f"✗ Get my rides failed: {str(e)}")
            raise