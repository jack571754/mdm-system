def get_token(client, username="admin", password="Admin@123456"):
    res = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
    )
    return res.json()["data"]["access_token"]



def test_admin_enums_crud(client, db_session):
    admin_token = get_token(client, "admin", "Admin@123456")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Create Enum
    create_res = client.post(
        "/api/v1/admin/enums",
        json={
            "domain": "product",
            "field_name": "sample_type",
            "value": "特别限定",
            "sort_order": 99,
            "is_enabled": True,
        },
        headers=headers,
    )
    assert create_res.status_code == 200
    enum_id = create_res.json()["data"]["id"]

    # List Enums
    list_res = client.get("/api/v1/admin/enums?domain=product", headers=headers)
    assert list_res.status_code == 200
    assert any(e["value"] == "特别限定" for e in list_res.json()["data"])

    # Update Enum
    upd_res = client.put(
        f"/api/v1/admin/enums/{enum_id}",
        json={"value": "特别限量版", "is_enabled": False},
        headers=headers,
    )
    assert upd_res.status_code == 200
    assert upd_res.json()["data"]["value"] == "特别限量版"

    # Delete Enum
    del_res = client.delete(f"/api/v1/admin/enums/{enum_id}", headers=headers)
    assert del_res.status_code == 200


def test_admin_users_and_configs(client, db_session):
    admin_token = get_token(client, "admin", "Admin@123456")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Create User
    new_user_res = client.post(
        "/api/v1/admin/users",
        json={
            "username": "new_ops",
            "password": "Password123!",
            "role": "operator",
            "is_enabled": True,
        },
        headers=headers,
    )
    assert new_user_res.status_code == 200
    user_id = new_user_res.json()["data"]["id"]

    # List Users
    users_res = client.get("/api/v1/admin/users", headers=headers)
    assert users_res.status_code == 200
    assert any(u["username"] == "new_ops" for u in users_res.json()["data"])

    # Update User Status
    toggle_res = client.put(f"/api/v1/admin/users/{user_id}", json={"is_enabled": False}, headers=headers)
    assert toggle_res.status_code == 200
    assert toggle_res.json()["data"]["is_enabled"] is False

    # Configs
    cfg_res = client.put(
        "/api/v1/admin/configs/source_priority",
        json={"value": ["数仓同步", "Excel导入", "API推送", "手工维护"]},
        headers=headers,
    )
    assert cfg_res.status_code == 200
    assert cfg_res.json()["data"]["value"][1] == "Excel导入"
