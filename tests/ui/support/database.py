from __future__ import annotations

import time
from collections.abc import Callable

import pymysql


TEST_DATABASE_NAME = "campus_mindcare_test"


class DatabaseClient:
    def __init__(self, database_name: str = TEST_DATABASE_NAME) -> None:
        if not database_name.endswith("_test"):
            raise RuntimeError(
                f"拒绝操作非测试数据库：{database_name!r}，数据库名必须以 _test 结尾"
            )
        self.database_name = database_name

    def _connect(self):
        return pymysql.connect(
            host="127.0.0.1",
            port=3307,
            user="root",
            password="ui_test_password",
            database=self.database_name,
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True,
        )

    def clean_business_data(self) -> None:
        with self._connect() as connection, connection.cursor() as cursor:
            for table in ("AlertEvent", "SessionEmotion", "ChatMessage", "ConsultationSession"):
                cursor.execute(f"DELETE FROM `{table}`")
            cursor.execute("UPDATE `User` SET `riskLevel` = 0 WHERE `username` = %s", ("student1",))

    def messages_for(self, username: str = "student1") -> list[dict]:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT m.senderType, m.content
                FROM `ChatMessage` m
                JOIN `ConsultationSession` s ON s.id = m.sessionId
                JOIN `User` u ON u.id = s.userId
                WHERE u.username = %s
                ORDER BY m.id
                """,
                (username,),
            )
            return list(cursor.fetchall())

    def emotion_count(self, username: str = "student1") -> int:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(*) AS total
                FROM `SessionEmotion` e
                JOIN `ConsultationSession` s ON s.id = e.sessionId
                JOIN `User` u ON u.id = s.userId
                WHERE u.username = %s
                """,
                (username,),
            )
            return int(cursor.fetchone()["total"])

    def wait_until(self, predicate: Callable[["DatabaseClient"], bool], timeout: float = 10) -> None:
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if predicate(self):
                return
            time.sleep(0.1)
        raise AssertionError(f"数据库状态未在 {timeout} 秒内满足条件")
