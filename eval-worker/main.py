import asyncio
import logging

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)

from worker import run  # noqa: E402  (import after load_dotenv)

if __name__ == "__main__":
    asyncio.run(run())
