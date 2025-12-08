
import requests
import json
import time

def test_simulation():
    url = "http://localhost:8000/simulate"
    
    payload = {
        "trainOverrides": [
            {
                "trainId": "TRN_10001",
                "priority": 1,
                "maxSpeed": 120
            }
        ],
        "globalSettings": {
            "weather": "Rain",
            "loopUsagePenalty": 1000
        }
    }
    
    print("Sending simulation request...")
    try:
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            print("✓ Simulation successful!")
            print(f"Status: {result.get('status')}")
            print(f"Objective Value: {result.get('objective_value')}")
            
            # Verify overrides
            # We can't easily verify internal state, but we can check if the result makes sense
            # e.g. if TRN_10001 has less delay due to higher priority
            
            schedule = result.get('schedule', {})
            if 'TRN_10001' in schedule:
                print("✓ TRN_10001 found in schedule")
                print(f"TRN_10001 Priority in result: {schedule['TRN_10001']['priority']}")
                if schedule['TRN_10001']['priority'] == 1:
                     print("✓ Priority override confirmed")
                else:
                     print("✗ Priority override failed")
            else:
                print("✗ TRN_10001 not found in schedule")
                
        else:
            print(f"✗ Request failed with status {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"✗ Connection failed: {e}")

if __name__ == "__main__":
    # Wait for server to start
    time.sleep(2)
    test_simulation()
