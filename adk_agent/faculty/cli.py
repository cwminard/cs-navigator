"""
Faculty Advisor Agent — CLI
Run: python cli.py
"""

import asyncio
import os
import sys
from pathlib import Path

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from faculty.agent import root_agent

APP_NAME = "faculty_advisor"
USER_ID = "faculty_user"

BANNER = """
╔══════════════════════════════════════════════════════╗
║     Morgan State CS — Faculty Advisor for Students   ║
║     Type 'quit' to exit                              ║
╚══════════════════════════════════════════════════════╝

Describe your situation and I'll advise you as the faculty member.

Examples:
  "I have a senior who submitted the advising hold release and degree plan. What's missing?"
  "What forms does a junior need?"
  "My student has a 1.8 GPA and hasn't declared a concentration yet."
"""


async def run():
    session_service = InMemorySessionService()
    session = await session_service.create_session(app_name=APP_NAME, user_id=USER_ID)
    runner = Runner(agent=root_agent, app_name=APP_NAME, session_service=session_service)

    print(BANNER)

    while True:
        try:
            user_input = input("Faculty › ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nSession ended.")
            break

        if not user_input:
            continue
        if user_input.lower() in {"quit", "exit", "q"}:
            print("Session ended.")
            break

        message = Content(role="user", parts=[Part(text=user_input)])
        print("\nAgent › ", end="", flush=True)

        async for event in runner.run_async(
            user_id=USER_ID,
            session_id=session.id,
            new_message=message,
        ):
            if event.is_final_response() and event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        print(part.text)
        print()


def main():
    if not os.getenv("GOOGLE_API_KEY") and not os.getenv("GOOGLE_CLOUD_PROJECT"):
        print("⚠️  Set credentials before running:\n")
        print("   export GOOGLE_API_KEY=your_key")
        print("   # OR for Vertex AI:")
        print("   export GOOGLE_CLOUD_PROJECT=your_project_id")
        print("   export GOOGLE_CLOUD_LOCATION=us-central1")
        print("   export GOOGLE_GENAI_USE_VERTEXAI=TRUE\n")
    asyncio.run(run())


if __name__ == "__main__":
    main()
