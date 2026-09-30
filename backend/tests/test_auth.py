def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_login_success(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Admin@123456"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
    assert "access_token" in data["data"]
    assert data["data"]["user"]["username"] == "admin"
    assert data["data"]["user"]["role"] == "admin"


def test_login_wrong_password(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "WrongPassword"},
    )
    assert response.status_code == 400
    data = response.json()
    assert "用户名或密码错误" in data["message"]


def test_login_disabled_user(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "disabled", "password": "Disabled@123"},
    )
    assert response.status_code == 403
    data = response.json()
    assert "禁用" in data["message"]


def test_get_current_user_me(client):
    # 1. Login to get token
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username": "operator", "password": "Operator@123456"},
    )
    token = login_resp.json()["data"]["access_token"]

    # 2. Get profile
    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    user_info = me_resp.json()["data"]
    assert user_info["username"] == "operator"
    assert user_info["role"] == "operator"


def test_get_me_unauthorized(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
