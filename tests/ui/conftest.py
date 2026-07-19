from __future__ import annotations

import os
import shutil
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

import allure
import pytest
from playwright.sync_api import Page

from tests.ui.pages.consultation_page import ConsultationPage
from tests.ui.support.database import DatabaseClient, TEST_DATABASE_NAME


REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = REPO_ROOT / "ai-vue"
SUPPORT_DIR = REPO_ROOT / "tests" / "ui" / "support"
BASE_URL = "http://127.0.0.1:4173"
LAYER_MARKERS = {"layer1", "layer2", "layer3"}


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    selected_layer = config.option.markexpr.strip()
    if selected_layer not in LAYER_MARKERS:
        raise pytest.UsageError(
            "请显式选择一个测试层级：pytest -m layer1、pytest -m layer2，"
            "或 RUN_REAL_LLM=1 pytest -m layer3"
        )

    for item in items:
        if item.get_closest_marker(selected_layer) is None:
            item.add_marker(pytest.mark.skip(reason=f"当前仅运行 {selected_layer}"))


def _wait_for_http(url: str, timeout: float = 30) -> None:
    deadline = time.monotonic() + timeout
    last_error: Exception | None = None
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    while time.monotonic() < deadline:
        try:
            with opener.open(url, timeout=2) as response:
                if response.status < 500:
                    return
        except (OSError, urllib.error.URLError) as error:
            last_error = error
        time.sleep(0.25)
    raise RuntimeError(f"等待服务超时：{url}") from last_error


def _start_process(
    command: list[str],
    cwd: Path,
    log_name: str,
    env_overrides: dict[str, str] | None = None,
) -> tuple[subprocess.Popen, object]:
    log_dir = REPO_ROOT / "test-results" / "ui" / "processes"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = (log_dir / log_name).open("w", encoding="utf-8")
    process = subprocess.Popen(
        command,
        cwd=cwd,
        env={
            **os.environ,
            "NO_PROXY": "127.0.0.1,localhost",
            **(env_overrides or {}),
        },
        stdout=log_file,
        stderr=subprocess.STDOUT,
    )
    return process, log_file


def _stop_process(process: subprocess.Popen, log_file: object) -> None:
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
    log_file.close()


def _compose(command: list[str], env: dict[str, str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["docker", "compose", "-f", str(REPO_ROOT / "docker-compose.test.yml"), *command],
        cwd=REPO_ROOT,
        env={**os.environ, **env},
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
        check=False,
    )


def _start_compose(layer: str) -> dict[str, str]:
    if not TEST_DATABASE_NAME.endswith("_test"):
        raise pytest.UsageError("测试数据库名必须以 _test 结尾")

    if layer == "layer3":
        if os.getenv("RUN_REAL_LLM") != "1":
            pytest.skip("Layer 3 默认跳过；显式设置 RUN_REAL_LLM=1 后才调用真实 DeepSeek")
        api_key = _secret_from_environment_or_dotenv("DEEPSEEK_API_KEY")
        if not api_key or api_key.startswith("sk-your_"):
            pytest.skip("缺少可用的 DEEPSEEK_API_KEY，Layer 3 标记为环境阻塞")
        compose_env = {
            "TEST_DEEPSEEK_BASE_URL": "http://deepseek-guard:3200/v1",
            "TEST_DEEPSEEK_UPSTREAM_BASE_URL": _secret_from_environment_or_dotenv(
                "DEEPSEEK_BASE_URL"
            )
            or "https://api.deepseek.com/v1",
            "TEST_DEEPSEEK_API_KEY": api_key,
        }
    else:
        compose_env = {
            "TEST_DEEPSEEK_BASE_URL": "http://mock-deepseek:3100/v1",
            "TEST_DEEPSEEK_API_KEY": "ui-test-key",
        }
    cleanup = _compose(["down", "-v", "--remove-orphans"], compose_env)
    if cleanup.returncode != 0:
        raise RuntimeError(f"清理旧测试环境失败：\n{cleanup.stderr}")

    result = _compose(["up", "--build", "-d"], compose_env)
    if result.returncode != 0:
        _compose(["down", "-v", "--remove-orphans"], compose_env)
        raise RuntimeError(f"启动 {layer} 测试环境失败：\n{result.stdout}\n{result.stderr}")
    return compose_env


def _secret_from_environment_or_dotenv(key: str) -> str:
    current = os.getenv(key, "").strip()
    if current:
        return current

    for dotenv_path in (REPO_ROOT / ".env", REPO_ROOT / "ai-psychological-server" / ".env"):
        if not dotenv_path.exists():
            continue
        for raw_line in dotenv_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            name, value = line.split("=", 1)
            if name.strip() == key:
                return value.strip().strip('"\'')
    return ""


def _stop_compose(compose_env: dict[str, str], layer: str) -> None:
    log_dir = REPO_ROOT / "test-results" / "ui" / "processes"
    log_dir.mkdir(parents=True, exist_ok=True)
    logs = _compose(["logs", "--no-color"], compose_env)
    (log_dir / f"{layer}-compose.log").write_text(
        f"{logs.stdout}\n{logs.stderr}", encoding="utf-8"
    )
    _compose(["down", "-v", "--remove-orphans"], compose_env)


@pytest.fixture(scope="session", autouse=True)
def test_environment(pytestconfig: pytest.Config):
    layer = pytestconfig.option.markexpr.strip()
    node = shutil.which("node")
    if not node:
        raise pytest.UsageError("未找到 Node.js，无法启动前端和 Mock Server")

    mock_process = mock_log = None
    compose_env = None
    vite_process = vite_log = None
    proxy_target = "http://127.0.0.1:3000"

    try:
        if layer == "layer1":
            mock_process, mock_log = _start_process(
                [node, str(SUPPORT_DIR / "mock-server.cjs")],
                REPO_ROOT,
                "layer1-mock.log",
            )
            _wait_for_http("http://127.0.0.1:3000/__e2e/state")
        else:
            compose_env = _start_compose(layer)
            proxy_target = "http://127.0.0.1:3001"
            _wait_for_http("http://127.0.0.1:3001/api/health", timeout=120)

        vite_process, vite_log = _start_process(
            [
                node,
                str(FRONTEND_DIR / "node_modules" / "vite" / "bin" / "vite.js"),
                "--host",
                "127.0.0.1",
                "--port",
                "4173",
                "--strictPort",
            ],
            FRONTEND_DIR,
            f"{layer}-vite.log",
            {"VITE_API_PROXY_TARGET": proxy_target},
        )
        _wait_for_http(BASE_URL)
        yield
    finally:
        if vite_process is not None and vite_log is not None:
            _stop_process(vite_process, vite_log)
        if mock_process is not None and mock_log is not None:
            _stop_process(mock_process, mock_log)
        if compose_env is not None:
            _stop_compose(compose_env, layer)


@pytest.fixture
def test_database(pytestconfig: pytest.Config) -> DatabaseClient:
    if pytestconfig.option.markexpr.strip() == "layer1":
        pytest.skip("Layer 1 不连接数据库")
    return DatabaseClient()


@pytest.fixture(autouse=True)
def clean_test_database(pytestconfig: pytest.Config) -> None:
    if pytestconfig.option.markexpr.strip() != "layer1":
        DatabaseClient().clean_business_data()


@pytest.fixture
def consultation_page(
    page: Page,
    pytestconfig: pytest.Config,
) -> ConsultationPage:
    layer = pytestconfig.option.markexpr.strip()
    if layer == "layer1":
        reset_response = page.request.post("http://127.0.0.1:3000/__e2e/reset")
        assert reset_response.ok, "Layer 1 Mock Server 重置失败"
        token = "e2e-token"
    else:
        if layer == "layer2":
            reset_response = page.request.post("http://127.0.0.1:3100/__test/reset")
            assert reset_response.ok, "Mock DeepSeek 状态重置失败"
        login_response = page.request.post(
            "http://127.0.0.1:3001/api/user/login",
            data={"username": "student1", "password": "user123"},
        )
        assert login_response.ok, "测试用户登录请求失败"
        login_body = login_response.json()
        assert login_body["code"] == 200, f"测试用户登录失败：{login_body.get('msg')}"
        token = login_body["data"]["token"]

    consultation = ConsultationPage(page, BASE_URL)
    consultation.open(token)
    yield consultation


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item: pytest.Item, call: pytest.CallInfo):
    outcome = yield
    report = outcome.get_result()
    setattr(item, f"rep_{report.when}", report)


@pytest.fixture(autouse=True)
def attach_failure_screenshot(request: pytest.FixtureRequest):
    yield
    report = getattr(request.node, "rep_call", None)
    page = request.node.funcargs.get("page")
    if report and report.failed and page and not page.is_closed():
        allure.attach(
            page.screenshot(full_page=True),
            name="failure-screenshot",
            attachment_type=allure.attachment_type.PNG,
        )
