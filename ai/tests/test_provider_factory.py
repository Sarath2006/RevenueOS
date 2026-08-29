from app.providers.factory import (
    get_ai_provider,
)


def test_mock_provider_factory():

    provider = get_ai_provider("mock")

    assert provider.provider_name == "mock"

    assert provider.model_name == "mock-v1"


def test_unsupported_provider():

    try:
        get_ai_provider("invalid-provider")
    except ValueError as exc:
        assert "Unsupported AI provider" in str(exc)
    else:
        raise AssertionError(
            "Expected ValueError"
        )