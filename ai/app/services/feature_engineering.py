from __future__ import annotations

from app.schemas.feature_engineering import (
    FeatureEngineeringRequest,
    FeatureEngineeringResponse,
)

from app.services.feature_builder import (
    build_feature_vector,
)


class FeatureEngineeringService:
    """
    Application service for M6.5.

    Responsibilities:
    - validate normalized input
    - construct deterministic feature vector
    - expose a stable interface to API/worker layers

    It deliberately does NOT:
    - call an LLM
    - calculate recovery probability
    - recommend recovery actions
    - execute payments
    """

    def build(
        self,
        request: FeatureEngineeringRequest,
    ) -> FeatureEngineeringResponse:

        return build_feature_vector(
            request
        )


feature_engineering_service = (
    FeatureEngineeringService()
)