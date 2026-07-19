import json

from playwright.sync_api import Page, expect


class ConsultationPage:
    def __init__(self, page: Page, base_url: str) -> None:
        self.page = page
        self.base_url = base_url
        self.message_input = page.get_by_placeholder("请输入您想分享的内容...")
        self.send_button = page.get_by_test_id("send-message")

    def open(self, token: str) -> None:
        token_literal = json.dumps(token)
        self.page.add_init_script(
            f"localStorage.setItem('login/token', JSON.stringify({token_literal}))"
        )
        self.page.goto(f"{self.base_url}/consultation")

    def send(self, message: str) -> None:
        self.message_input.fill(message)
        self.send_button.click()

    def stop_generation(self) -> None:
        self.page.get_by_role("button", name="停止生成").click()

    def go_home(self) -> None:
        self.page.goto(self.base_url)

    @property
    def latest_ai_reply(self):
        return self.page.locator(".ai-message").last

    @property
    def latest_ai_reply_content(self):
        return self.latest_ai_reply.locator(".message-bubble")

    def expect_latest_reply(self, text: str) -> None:
        expect(self.latest_ai_reply).to_contain_text(text)
