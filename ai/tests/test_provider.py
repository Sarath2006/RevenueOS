import pytest

from app.providers.factory import get_ai_provider
from app.providers.types import (
    AIClassificationRequest,
)


@pytest.mark.asyncio
async def test_mock_provider():

    provider = get_ai_provider("mock")

    request = AIClassificationRequest(
        system_prompt=(
            "Classify the payment failure."
        ),

        user_prompt=(
            "Customer payment failed "
            "because the card was declined."
        ),

        allowed_labels=[
            "CARD_DECLINED",
            "INSUFFICIENT_FUNDS",
            "NETWORK_ERROR",
        ],
    )

    result = await provider.classify(
        request
    )

    assert result.label == "CARD_DECLINED"

    assert 0.0 <= result.confidence <= 1.0

    assert (
        result.provider_metadata.provider
        == "mock"
    )

    assert (
        result.provider_metadata.fallback_used
        is False
    )