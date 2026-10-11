import allure
import pytest
from playwright.sync_api import expect

from tests.ui.pages.consultation_page import ConsultationPage


pytestmark = pytest.mark.layer1


@allure.title("输入内容长度决定发送按钮状态")
def test_message_length_controls_send_button(
    consultation_page: ConsultationPage,
) -> None:
    consultation_page.message_input.fill(" ")
    expect(consultation_page.send_button).to_be_disabled()

    consultation_page.message_input.fill("我今天有点焦虑")
    expect(consultation_page.send_button).to_be_enabled()

    consultation_page.message_input.fill("测" * 501)
    expect(consultation_page.send_button).to_be_disabled()

@allure.title("超过500字时按Enter不能绕过发送限制")
def test_enter_cannot_bypass_message_length_limit(
    consultation_page: ConsultationPage,
) -> None:
    oversized_message = "测" * 501

    consultation_page.message_input.fill(oversized_message)
    consultation_page.message_input.press("Enter")

    expect(consultation_page.message_input).to_have_value(oversized_message)