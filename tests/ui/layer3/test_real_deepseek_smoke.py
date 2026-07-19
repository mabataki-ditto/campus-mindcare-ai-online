import allure
import pytest
from playwright.sync_api import Page, TimeoutError as PlaywrightTimeoutError, expect

from tests.ui.pages.consultation_page import ConsultationPage
from tests.ui.support.database import DatabaseClient


pytestmark = pytest.mark.layer3

EXTERNAL_FAILURE_MARKERS = (
    "DeepSeek API 请求失败: 401",
    "DeepSeek API 请求失败: 402",
    "DeepSeek API 请求失败: 403",
    "DeepSeek API 请求失败: 429",
    "DeepSeek API 请求失败: 5",
    "fetch failed",
    "network",
    "timeout",
)


def _guard_state(page: Page) -> dict:
    response = page.request.get("http://127.0.0.1:3200/__test/state")
    assert response.ok, "读取 DeepSeek 请求保护器状态失败"
    return response.json()


@allure.title("真实 DeepSeek 流式回复可完成并写入测试数据库")
def test_real_deepseek_stream_smoke(
    consultation_page: ConsultationPage,
    test_database: DatabaseClient,
    page: Page,
) -> None:
    question = "请只用一句纯文本（不要使用 Markdown）介绍一个简单的放松方法。"
    consultation_page.send(question)

    expect(page.get_by_text(question, exact=True)).to_be_visible(timeout=10_000)
    expect(consultation_page.latest_ai_reply).not_to_contain_text(
        "您好！我是曼波",
        timeout=10_000,
    )
    try:
        expect(consultation_page.message_input).to_be_enabled(timeout=90_000)
    except PlaywrightTimeoutError:
        guard_state = _guard_state(page)
        if guard_state["upstreamFailed"] or not guard_state["upstreamCompleted"]:
            pytest.skip("真实 DeepSeek 90 秒内未完成响应，标记为外部环境阻塞")
        pytest.fail("DeepSeek 上游已经完成，但前端未在 90 秒内恢复发送状态")
    error_message = page.locator(".error-message")
    if error_message.count() and error_message.is_visible():
        error_text = error_message.inner_text().strip()
        guard_state = _guard_state(page)
        if guard_state["blockedChatRequests"]:
            pytest.fail("产品尝试发起多次真实聊天请求，第二次已被测试代理阻断")
        if guard_state["upstreamFailed"]:
            pytest.skip("真实 DeepSeek 上游流传输失败，标记为外部环境阻塞")
        if any(marker.lower() in error_text.lower() for marker in EXTERNAL_FAILURE_MARKERS):
            pytest.skip(f"真实 DeepSeek 环境阻塞：{error_text}")
        pytest.fail(f"产品未能完成真实 DeepSeek 对话：{error_text}")

    reply_text = consultation_page.latest_ai_reply_content.inner_text().strip()
    assert reply_text, "真实 DeepSeek 返回了空回复"
    guard_state = _guard_state(page)
    assert guard_state["forwardedRequests"] == 1
    assert guard_state["blockedChatRequests"] == 0

    test_database.wait_until(
        lambda database: len(database.messages_for()) == 2,
        timeout=15,
    )
    messages = test_database.messages_for()
    assert messages[0] == {"senderType": 1, "content": question}
    assert messages[1]["senderType"] == 2
    assert messages[1]["content"].strip() == reply_text, "UI 完整回复与数据库记录不一致"
