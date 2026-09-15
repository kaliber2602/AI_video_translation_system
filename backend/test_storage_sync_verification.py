import requests
import json

BASE_URL = "http://localhost:8000"

def run():
    print("=== Testing Storage Synchronization & Quota Breakdown ===")
    # 1. Login
    login_res = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "yugi.thang@gmail.com", "password": "Lol2602@"},
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] 1. Authentication successful")

    # 2. Test GET /api/subscriptions/storage/breakdown
    r_bd = requests.get(f"{BASE_URL}/api/subscriptions/storage/breakdown", headers=headers)
    assert r_bd.status_code == 200, f"GET /storage/breakdown failed: {r_bd.text}"
    bd = r_bd.json()
    plan = bd['plan']
    print(f"[PASS] 2. GET /storage/breakdown: {plan['name']} - used_bytes={plan['used_bytes']} ({plan['used_gb']} GB)")

    # Breakdown by type
    print("      Storage allocation breakdown:")
    for t in bd['storage_by_type']:
        print(f"        * {t['key']} ({t['label']}): {t['size_formatted']} ({t['percentage']}%)")

    # Assert rendered dubbed video and audio tracks are detected
    dubbed_item = next((t for t in bd['storage_by_type'] if t['key'] == 'dubbed_video'), None)
    audio_item = next((t for t in bd['storage_by_type'] if t['key'] == 'audio_track'), None)
    source_item = next((t for t in bd['storage_by_type'] if t['key'] == 'source_video'), None)

    assert dubbed_item is not None and dubbed_item['size_bytes'] > 0, "dubbed_video should not be 0"
    assert audio_item is not None and audio_item['size_bytes'] > 0, "audio_track should not be 0"
    assert source_item is not None and source_item['size_bytes'] > 0, "source_video should not be 0"
    print(f"[PASS] 3. Verified rendered dubbed video ({dubbed_item['size_formatted']}), audio tracks ({audio_item['size_formatted']}), and source ({source_item['size_formatted']}) are non-zero")

    # Assert largest files ranking
    largest = bd['largest_files']
    assert len(largest) >= 4, f"Expected at least 4 files in largest_files, got {len(largest)}"
    print(f"[PASS] 4. Largest files ranked ({len(largest)} items):")
    for idx, f in enumerate(largest[:5]):
        print(f"        #{idx+1}: {f['filename']} - {f['resource_type']} - {f['size_formatted']}")

    # 3. Test GET /api/subscriptions/quota
    r_q = requests.get(f"{BASE_URL}/api/subscriptions/quota", headers=headers)
    assert r_q.status_code == 200, f"GET /quota failed: {r_q.text}"
    q = r_q.json()
    quota_storage = q['storage']
    print(f"[PASS] 5. GET /quota: used_bytes={quota_storage['used_bytes']}, total_bytes={quota_storage['total_bytes']}")
    
    # Assert quota used_bytes is in sync with breakdown used_bytes (within 5% difference due to intermediate cache files)
    ratio = abs(quota_storage['used_bytes'] - plan['used_bytes']) / max(plan['used_bytes'], 1)
    assert ratio < 0.05, f"Storage quota and breakdown out of sync: {quota_storage['used_bytes']} vs {plan['used_bytes']}"
    print(f"[PASS] 6. Quota and Storage Breakdown are synchronized! Difference ratio: {ratio:.4f}")

    # 4. Test Project Assets Explorer endpoint
    r_proj = requests.get(f"{BASE_URL}/api/projects", headers=headers)
    assert r_proj.status_code == 200
    projs = r_proj.json()
    if projs:
        proj_id = projs[0]['id']
        r_assets = requests.get(f"{BASE_URL}/api/projects/{proj_id}/assets", headers=headers)
        assert r_assets.status_code == 200
        asset_data = r_assets.json()
        print(f"[PASS] 7. Project {proj_id} assets total: {asset_data['total_files']} files, total_size={asset_data['total_size_bytes']} bytes")
        assert asset_data['total_size_bytes'] > 0, "Asset explorer size should be > 0"

    print("\nALL STORAGE SYNCHRONIZATION TESTS PASSED! [OK]")

if __name__ == '__main__':
    run()
