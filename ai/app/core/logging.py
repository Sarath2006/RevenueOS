import logging
import sys

from app.core.config import settings


def configure_logging() -> None:
    """
    Configure application-wide logging.
    """

    level = getattr(
        logging,
        settings.log_level.upper(),
        logging.INFO,
    )

    logging.basicConfig(
        level=level,
        stream=sys.stdout,
        format=(
            "%(asctime)s | "
            "%(levelname)s | "
            "%(name)s | "
            "%(message)s"
        ),
        force=True,
    )


def get_logger(
    name: str,
) -> logging.Logger:
    return logging.getLogger(name)