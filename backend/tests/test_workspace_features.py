import pytest
from datetime import timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.core.security import create_token
from app.core.database import get_connection

client = TestClient(app)

# User 1 (Admin/Owner) and User 2 (Demo User)
USER_1_ID = 1
USER_2_ID = 2
USER_2_EMAIL = "user@vidnova.com"

token_user_1 = create_token(USER_1_ID, "access", timedelta(hours=1))
token_user_2 = create_token(USER_2_ID, "access", timedelta(hours=1))

headers_user_1 = {"Authorization": f"Bearer {token_user_1}"}
headers_user_2 = {"Authorization": f"Bearer {token_user_2}"}


def test_soft_delete_and_restore_and_permanent_delete():
    # 1. Create a project with User 1
    create_res = client.post(
        "/api/projects",
        json={"name": "Test Soft Delete Project", "description": "Testing trash queue"},
        headers=headers_user_1,
    )
    assert create_res.status_code == 201
    proj_id = create_res.json()["id"]

    # 2. Check that it appears in scope="all"
    res_all = client.get("/api/projects?scope=all", headers=headers_user_1)
    assert res_all.status_code == 200
    ids = [p["id"] for p in res_all.json()]
    assert proj_id in ids

    # 3. Soft delete the project (move to trash)
    del_res = client.delete(f"/api/projects/{proj_id}", headers=headers_user_1)
    assert del_res.status_code == 204

    # 4. Verify project is NO LONGER in scope="all"
    res_all_after = client.get("/api/projects?scope=all", headers=headers_user_1)
    ids_after = [p["id"] for p in res_all_after.json()]
    assert proj_id not in ids_after

    # 5. Verify project IS in scope="trash"
    res_trash = client.get("/api/projects?scope=trash", headers=headers_user_1)
    assert res_trash.status_code == 200
    trash_ids = [p["id"] for p in res_trash.json()]
    assert proj_id in trash_ids
    trashed_proj = next(p for p in res_trash.json() if p["id"] == proj_id)
    assert trashed_proj["deleted_at"] is not None

    # 6. Restore the project from trash
    restore_res = client.post(f"/api/projects/{proj_id}/restore", headers=headers_user_1)
    assert restore_res.status_code == 200
    restored_data = restore_res.json()
    assert restored_data["deleted_at"] is None
    assert restored_data["status"] == "active"

    # 7. Verify it is back in scope="all" and gone from scope="trash"
    res_all_restored = client.get("/api/projects?scope=all", headers=headers_user_1)
    assert proj_id in [p["id"] for p in res_all_restored.json()]
    res_trash_after = client.get("/api/projects?scope=trash", headers=headers_user_1)
    assert proj_id not in [p["id"] for p in res_trash_after.json()]

    # 8. Soft delete again, then permanently delete
    client.delete(f"/api/projects/{proj_id}", headers=headers_user_1)
    perm_del_res = client.delete(f"/api/projects/{proj_id}/permanent", headers=headers_user_1)
    assert perm_del_res.status_code == 204

    # 9. Verify completely gone
    res_trash_final = client.get("/api/projects?scope=trash", headers=headers_user_1)
    assert proj_id not in [p["id"] for p in res_trash_final.json()]


def test_favorite_toggle_and_scope():
    # 1. Create a project
    create_res = client.post(
        "/api/projects",
        json={"name": "Test Favorite Project", "description": "Testing favorites"},
        headers=headers_user_1,
    )
    assert create_res.status_code == 201
    proj_id = create_res.json()["id"]

    # 2. Toggle favorite ON
    fav_res_1 = client.post(f"/api/projects/{proj_id}/favorite", headers=headers_user_1)
    assert fav_res_1.status_code == 200
    assert fav_res_1.json()["is_favorite"] is True

    # 3. Check scope="favorites"
    res_fav = client.get("/api/projects?scope=favorites", headers=headers_user_1)
    assert res_fav.status_code == 200
    fav_ids = [p["id"] for p in res_fav.json()]
    assert proj_id in fav_ids

    # 4. Toggle favorite OFF
    fav_res_2 = client.post(f"/api/projects/{proj_id}/favorite", headers=headers_user_1)
    assert fav_res_2.status_code == 200
    assert fav_res_2.json()["is_favorite"] is False

    # 5. Check scope="favorites" again
    res_fav_after = client.get("/api/projects?scope=favorites", headers=headers_user_1)
    assert proj_id not in [p["id"] for p in res_fav_after.json()]

    # Clean up
    client.delete(f"/api/projects/{proj_id}/permanent", headers=headers_user_1)


def test_project_sharing_and_scope():
    # 1. User 1 creates project
    create_res = client.post(
        "/api/projects",
        json={"name": "Test Shared Project", "description": "Collaborative project"},
        headers=headers_user_1,
    )
    assert create_res.status_code == 201
    proj_id = create_res.json()["id"]

    # 2. User 1 shares project with User 2 as "editor"
    share_res = client.post(
        f"/api/projects/{proj_id}/members",
        json={"email": USER_2_EMAIL, "role": "editor"},
        headers=headers_user_1,
    )
    assert share_res.status_code == 201
    member_data = share_res.json()
    assert member_data["email"] == USER_2_EMAIL
    assert member_data["role"] == "editor"
    assert member_data["status"] == "accepted"
    member_id = member_data["id"]

    # 3. User 2 checks scope="shared"
    res_shared = client.get("/api/projects?scope=shared", headers=headers_user_2)
    assert res_shared.status_code == 200
    shared_projects = res_shared.json()
    assert proj_id in [p["id"] for p in shared_projects]
    shared_proj = next(p for p in shared_projects if p["id"] == proj_id)
    assert shared_proj["is_shared"] is True
    assert shared_proj["my_role"] == "editor"

    # 4. User 1 updates User 2 role to "viewer"
    update_member_res = client.put(
        f"/api/projects/{proj_id}/members/{member_id}",
        json={"role": "viewer"},
        headers=headers_user_1,
    )
    assert update_member_res.status_code == 200
    assert update_member_res.json()["role"] == "viewer"

    # 5. User 1 removes User 2 from project
    remove_res = client.delete(
        f"/api/projects/{proj_id}/members/{member_id}",
        headers=headers_user_1,
    )
    assert remove_res.status_code == 204

    # 6. User 2 checks scope="shared" again -> should no longer appear
    res_shared_after = client.get("/api/projects?scope=shared", headers=headers_user_2)
    assert proj_id not in [p["id"] for p in res_shared_after.json()]

    # Clean up
    client.delete(f"/api/projects/{proj_id}/permanent", headers=headers_user_1)


def test_empty_trash():
    # 1. Create two projects with User 1
    p1 = client.post("/api/projects", json={"name": "Trash P1"}, headers=headers_user_1).json()["id"]
    p2 = client.post("/api/projects", json={"name": "Trash P2"}, headers=headers_user_1).json()["id"]

    # 2. Soft delete both
    client.delete(f"/api/projects/{p1}", headers=headers_user_1)
    client.delete(f"/api/projects/{p2}", headers=headers_user_1)

    # 3. Verify both in trash
    res_trash = client.get("/api/projects?scope=trash", headers=headers_user_1)
    assert p1 in [p["id"] for p in res_trash.json()]
    assert p2 in [p["id"] for p in res_trash.json()]

    # 4. Call empty trash
    empty_res = client.delete("/api/projects/trash/empty", headers=headers_user_1)
    assert empty_res.status_code == 200
    assert empty_res.json()["deleted_count"] >= 2

    # 5. Verify trash is now empty of these projects
    res_trash_after = client.get("/api/projects?scope=trash", headers=headers_user_1)
    assert p1 not in [p["id"] for p in res_trash_after.json()]
    assert p2 not in [p["id"] for p in res_trash_after.json()]
