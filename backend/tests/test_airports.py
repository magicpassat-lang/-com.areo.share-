import pytest
import requests

class TestAirports:
    """Airport endpoint tests"""

    def test_get_airports(self, base_url, api_client):
        """Test GET /api/airports returns list of airports"""
        try:
            response = api_client.get(f"{base_url}/api/airports")
            print(f"Get airports status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            print(f"Number of airports: {len(data)}")
            assert isinstance(data, list), "Response should be a list"
            assert len(data) > 0, "Should return at least one airport"
            
            # Check first airport structure
            airport = data[0]
            print(f"First airport: {airport}")
            assert "code" in airport, "Airport should have code"
            assert "name" in airport, "Airport should have name"
            assert "lat" in airport, "Airport should have latitude"
            assert "lng" in airport, "Airport should have longitude"
            assert "country" in airport, "Airport should have country"
            
            # Check for specific airports
            codes = [a["code"] for a in data]
            assert "LHR" in codes, "Should include London Heathrow"
            assert "JFK" in codes, "Should include New York JFK"
            print(f"✓ Get airports passed - {len(data)} airports found")
        except Exception as e:
            print(f"✗ Get airports failed: {str(e)}")
            raise