import pytest
import requests

class TestHealth:
    """Health check endpoint tests"""

    def test_health_check(self, base_url, api_client):
        """Test API health check endpoint"""
        try:
            response = api_client.get(f"{base_url}/api/")
            print(f"Health check status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            print(f"Health check response: {data}")
            assert "message" in data, "Response should contain 'message' field"
            assert "AeroShare" in data["message"], "Message should mention AeroShare"
            print("✓ Health check passed")
        except Exception as e:
            print(f"✗ Health check failed: {str(e)}")
            raise