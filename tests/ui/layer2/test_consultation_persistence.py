import time

import allure
import pytest
from playwright.sync_api import Page, expect

from tests.ui.pages.consultation_page import ConsultationPage
from tests.ui.support.database import DatabaseClient


pytestmark = pytest.mark.layer2


def _wait_for_slow_upstream_to_finish(page: Page, timeout: float = 8) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        response = page.request.get("http://127.0.0.1:3100/__test/state")
        assert response.ok, "读取 Mock DeepSeek 状态失败"
        if response.json()["slowResponsesFinished"] == 1:
            return
        time.sleep(0.1)
    raise AssertionError("Mock DeepSeek 慢速响应未按预期结束")


@allure.title("正常 SSE 回复完整写入测试数据库")
def test_normal_reply_is_persisted_once(
    consultation_page: ConsultationPage, test_database: DatabaseClient
) -> None:
    consultation_page.send("第二层正常回复")

    consultation_page.expect_latest_reply("第二层完整回复")
    expect(consultation_page.message_input).to_be_enabled()

    test_database.wait_until(
        lambda database: database.messages_for()
        == [
            {"senderType": 1, "content": "第二层正常回复"},
            {"senderType": 2, "content": "第二层完整回复"},
        ]
        and database.emotion_count() == 1
    )


@allure.title("主动停止后保留用户消息且不写入部分 AI 回复")
def test_stopped_reply_is_not_persisted(
    consultation_page: ConsultationPage,
    test_database: DatabaseClient,
    page: Page,
) -> None:
    consultation_page.send("第二层慢速回复")
    expect(page.get_by_text("第二层部分回复")).to_be_visible()

    consultation_page.stop_generation()

    expect(page.get_by_text("第二层部分回复")).to_be_visible()
    expect(page.get_by_text("已停止生成")).to_be_visible()
    expect(consultation_page.message_input).to_be_enabled()
    _wait_for_slow_upstream_to_finish(page)

    assert test_database.messages_for() == [
        {"senderType": 1, "content": "第二层慢速回复"}
    ]
    assert test_database.emotion_count() == 0


@allure.title("上游异常断流后恢复界面且不写入未完成 AI 回复")
def test_unexpected_eof_does_not_persist_partial_reply(
    consultation_page: ConsultationPage,
    test_database: DatabaseClient,
    page: Page,
) -> None:
    consultation_page.send("第二层异常断流")

    expect(page.locator(".error-message")).to_contain_text("流式响应意外中断")
    expect(consultation_page.message_input).to_be_enabled()

    test_database.wait_until(
        lambda database: database.messages_for()
        == [{"senderType": 1, "content": "第二层异常断流"}]
    )
    assert test_database.emotion_count() == 0


@allure.title("DeepSeek 业务错误后恢复界面且不写入错误 AI 消息")
def test_upstream_business_error_does_not_persist_ai_message(
    consultation_page: ConsultationPage,
    test_database: DatabaseClient,
    page: Page,
) -> None:
    consultation_page.send("第二层业务错误")

    expect(page.locator(".error-message")).to_contain_text("DeepSeek API 请求失败: 500")
    expect(consultation_page.message_input).to_be_enabled()

    test_database.wait_until(
        lambda database: database.messages_for()
        == [{"senderType": 1, "content": "第二层业务错误"}]
    )
    assert test_database.emotion_count() == 0
