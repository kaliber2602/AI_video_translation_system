import requests
import json

BASE_URL = "http://localhost:8000"

def test_edit_config():
    print("=== Testing Subtitle Edit Config Normalization & Persistence ===")

    # 1. Login
    login_res = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "yugi.thang@gmail.com", "password": "Lol2602@"},
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] 1. Logged in successfully")

    # 2. Get video
    vids_res = requests.get(f"{BASE_URL}/api/videos/", headers=headers)
    assert vids_res.status_code == 200, f"List videos failed: {vids_res.text}"
    vids = vids_res.json()
    if isinstance(vids, dict):
        vids = vids.get("videos", vids.get("data", []))
    assert len(vids) > 0, "No videos found"
    video_id = vids[0]["id"]
    print(f"[PASS] 2. Using video_id={video_id}")

    # 3. Save custom subtitle styling with snake_case
    custom_style = {
        "font_name": "Be Vietnam Pro",
        "font_size": 32,
        "primary_color": "#FFD700",
        "outline_color": "#1E293B",
        "max_lines": 1,
        "effect": "karaoke",
        "aspect_ratio": "9:16",
        "alignment": "left",
        "position_y": 72.5,
        "line_spacing": 1.4,
    }
    segments = [
        {"start": 0.0, "end": 2.0, "text": "Testing config", "translated_text": "Kiểm tra cấu hình chữ vàng", "speaker": "SPEAKER_00"},
        {"start": 2.0, "end": 4.5, "text": "Line two edit", "translated_text": "Dòng thứ hai đã sửa", "speaker": "SPEAKER_00"}
    ]

    put_res = requests.put(
        f"{BASE_URL}/api/videos/{video_id}/subtitles/vi/segments",
        headers=headers,
        json={
            "segments": segments,
            "style": custom_style,
            "subtitle_mask": {"enabled": True, "x": 10, "y": 850, "width": 1000, "height": 120, "mask_type": "blur"},
            "overlay_config": {"ticker_text": "Tin tức nóng trực tiếp 24/7"}
        }
    )
    assert put_res.status_code == 200, f"PUT failed: {put_res.text}"
    put_data = put_res.json()
    assert put_data["status"] == "updated"
    cfg = put_data.get("config", {})
    assert cfg.get("font_name") == "Be Vietnam Pro" or cfg.get("fontName") == "Be Vietnam Pro", f"Font name not preserved: {cfg}"
    assert cfg.get("font_size") == 32 or cfg.get("fontSize") == 32, f"Font size not preserved: {cfg}"
    assert cfg.get("primary_color") == "#FFD700" or cfg.get("primaryColor") == "#FFD700", f"Primary color not preserved: {cfg}"
    assert cfg.get("max_lines") == 1 or cfg.get("maxLines") == 1, f"Max lines not preserved: {cfg}"
    assert cfg.get("effect") == "karaoke", f"Effect not preserved: {cfg}"
    assert cfg.get("aspect_ratio") == "9:16" or cfg.get("aspectRatio") == "9:16", f"Aspect ratio not preserved: {cfg}"
    assert cfg.get("position_y") == 72.5 or cfg.get("positionY") == 72.5, f"Position Y not preserved: {cfg}"
    print("[PASS] 3. PUT segments with snake_case style saved and normalized config correctly")

    # 4. GET segments & verify config is loaded accurately
    get_res = requests.get(f"{BASE_URL}/api/videos/{video_id}/subtitles/vi/segments", headers=headers)
    assert get_res.status_code == 200, f"GET failed: {get_res.text}"
    get_data = get_res.json()
    get_cfg = get_data.get("config", {})
    assert get_cfg.get("font_name") == "Be Vietnam Pro" and get_cfg.get("fontName") == "Be Vietnam Pro", f"GET font_name mismatch: {get_cfg}"
    assert get_cfg.get("font_size") == 32 and get_cfg.get("fontSize") == 32, f"GET font_size mismatch: {get_cfg}"
    assert get_cfg.get("primary_color") == "#FFD700" and get_cfg.get("primaryColor") == "#FFD700", f"GET primary_color mismatch: {get_cfg}"
    assert get_cfg.get("aspect_ratio") == "9:16" and get_cfg.get("aspectRatio") == "9:16", f"GET aspect_ratio mismatch: {get_cfg}"
    assert get_cfg.get("position_y") == 72.5 and get_cfg.get("positionY") == 72.5, f"GET position_y mismatch: {get_cfg}"
    assert get_data.get("subtitle_mask", {}).get("enabled") is True, f"Mask not loaded: {get_data.get('subtitle_mask')}"
    assert get_data.get("overlay_config", {}).get("ticker_text") == "Tin tức nóng trực tiếp 24/7", f"Ticker not loaded: {get_data.get('overlay_config')}"
    print("[PASS] 4. GET subtitle segments retrieved exact saved configuration with both snake_case and camelCase")

    # 5. Non-destructive partial update (e.g. quick text edit without sending style)
    updated_segments = [
        {"start": 0.0, "end": 2.0, "text": "Testing config", "translated_text": "Bản dịch mới nhanh", "speaker": "SPEAKER_00"},
        {"start": 2.0, "end": 4.5, "text": "Line two edit", "translated_text": "Dòng thứ hai đã sửa", "speaker": "SPEAKER_00"}
    ]
    quick_put_res = requests.put(
        f"{BASE_URL}/api/videos/{video_id}/subtitles/vi/segments",
        headers=headers,
        json={"segments": updated_segments}  # No style parameter!
    )
    assert quick_put_res.status_code == 200, f"Quick PUT failed: {quick_put_res.text}"
    quick_cfg = quick_put_res.json().get("config", {})
    # Verify the custom Be Vietnam Pro / 32 / #FFD700 was NOT overwritten with Montserrat / 22 / #FFFFFF!
    assert quick_cfg.get("font_name") == "Be Vietnam Pro" or quick_cfg.get("fontName") == "Be Vietnam Pro", f"Style was wiped on partial update! {quick_cfg}"
    assert quick_cfg.get("font_size") == 32 or quick_cfg.get("fontSize") == 32, f"Font size was wiped on partial update! {quick_cfg}"
    assert quick_cfg.get("primary_color") == "#FFD700", f"Primary color was wiped on partial update! {quick_cfg}"
    print("[PASS] 5. Partial update preserved existing custom styling without wiping to defaults")

    print("\nALL SUBTITLE EDIT CONFIG VERIFICATION TESTS PASSED SUCCESSFULLY! [OK]")

if __name__ == "__main__":
    test_edit_config()
