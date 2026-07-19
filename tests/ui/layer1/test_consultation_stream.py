import time
from collections.abc import Callable

import allure
import pytest
from playwright.sync_api import Page, expect

from tests.ui.pages.consultation_page import ConsultationPage


pytestmark = pytest.mark.layer1


def _mock_state(page: Page) -> dict:
    response = page.request.get("http://127.0.0.1:3000/__e2e/state")
    assert response.ok, "读取 Layer 1 Mock 状态失败"
    return response.json()


def _wait_for_mock_state(
    page: Page, predicate: Callable[[dict], bool], timeout: float = 5
) -> dict:
    deadline = time.monotonic() + timeout
    state = _mock_state(page)
    while time.monotonic() < deadline:
        if predicate(state):
            return state
        time.sleep(0.1)
        state = _mock_state(page)
    raise AssertionError(f"Mock 状态未在 {timeout} 秒内满足条件：{state}")


@allure.title("SSE 回复在连接结束前增量显示")
def test_sse_reply_is_rendered_incrementally(consultation_page: ConsultationPage) -> None:
    consultation_page.send("增量回复")

    ai_reply = consultation_page.latest_ai_reply
    expect(ai_reply).to_contain_text("第一段")
    expect(ai_reply).not_to_contain_text("第二段")
    expect(ai_reply).to_contain_text("第一段第二段")


@allure.title("跨数据块的 SSE 事件和中文字符仍能完整解析")
def test_split_sse_event_preserves_chinese_characters(
    consultation_page: ConsultationPage,
) -> None:
    consultation_page.send("拆分中文")

    consultation_page.expect_latest_reply("中文完整")


@allure.title("连续触发发送只创建一次流式请求")
def test_double_click_creates_only_one_stream_request(
    consultation_page: ConsultationPage, page: Page
) -> None:
    consultation_page.message_input.fill("慢速回复")
    box = consultation_page.send_button.bounding_box()
    assert box is not None, "发送按钮不可见"

    page.mouse.dblclick(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    expect(page.get_by_text("已经生成的部分")).to_be_visible()

    state = _mock_state(page)
    assert len(state["aiRequests"]) == 1
    expect(page.get_by_text("慢速回复", exact=True)).to_have_count(1)


@allure.title("正常结束后恢复发送状态并仅保存一次完整回复")
def test_normal_completion_restores_input_and_saves_once(
    consultation_page: ConsultationPage, page: Page
) -> None:
    consultation_page.send("普通回复")

    consultation_page.expect_latest_reply("完整回复")
    expect(consultation_page.message_input).to_be_enabled()

    state = _mock_state(page)
    assert state["aiSaves"] == [{"senderType": 2, "content": "完整回复"}]


@allure.title("用户可以停止生成并保留已收到的回复")
def test_user_can_stop_generation_without_saving_partial_reply(
    consultation_page: ConsultationPage, page: Page
) -> None:
    consultation_page.send("慢速回复")

    expect(page.get_by_text("已经生成的部分")).to_be_visible()
    consultation_page.stop_generation()

    expect(page.get_by_text("已经生成的部分")).to_be_visible()
    expect(page.get_by_text("已停止生成")).to_be_visible()
    expect(consultation_page.message_input).to_be_enabled()
    consultation_page.message_input.fill("下一条消息")
    expect(consultation_page.send_button).to_be_enabled()

    state = _wait_for_mock_state(
        page,
        lambda current: current["closedStreams"] == 1 and not current["aiSaves"],
    )
    assert state["closedStreams"] == 1
    assert state["aiSaves"] == []


@allure.title("中断回复不会进入下一轮上下文且可以继续发送")
def test_aborted_reply_is_excluded_from_next_context(
    consultation_page: ConsultationPage, page: Page
) -> None:
    consultation_page.send("慢速回复")
    expect(page.get_by_text("已经生成的部分")).to_be_visible()
    consultation_page.stop_generation()

    consultation_page.send("检查上下文")

    consultation_page.expect_latest_reply("上下文干净")


@allure.title("上游断流后显示错误并恢复发送状态")
def test_unexpected_eof_restores_send_state_without_saving(
    consultation_page: ConsultationPage, page: Page
) -> None:
    consultation_page.send("异常断流")

    expect(page.locator(".error-message")).to_contain_text("流式响应意外中断")
    expect(consultation_page.message_input).to_be_enabled()
    consultation_page.message_input.fill("可以重试")
    expect(consultation_page.send_button).to_be_enabled()

    assert _mock_state(page)["aiSaves"] == []


@allure.title("JSON 业务错误可恢复且页面离开会关闭流式请求")
def test_business_error_recovers_and_navigation_closes_stream(
    consultation_page: ConsultationPage, page: Page
) -> None:
    consultation_page.send("业务错误")

    expect(page.locator(".error-message")).to_contain_text("模拟业务错误")
    expect(consultation_page.message_input).to_be_enabled()

    consultation_page.send("慢速回复")
    expect(page.get_by_text("已经生成的部分")).to_be_visible()
    consultation_page.go_home()

    state = _wait_for_mock_state(page, lambda current: current["closedStreams"] == 1)
    assert state["closedStreams"] == 1
