"""
Model Versioning and Management
Handles model versioning, blue/green deployments, and rollbacks
"""

from typing import Optional, Dict, List
from loguru import logger
import httpx
from config import settings


class ModelManager:
    """
    Manages model versions and deployments
    Supports blue/green deployments and rollbacks
    """

    def __init__(self):
        self.model_registry: Dict[str, Dict] = {
            "nemotron-3-nano": {
                "versions": {
                    "v1.0.0": {
                        "url": f"{settings.NEMOTRON_LLM_URL}/v1",
                        "status": "active",
                        "deployed_at": None,
                    },
                    "v1.1.0": {
                        "url": f"{settings.NEMOTRON_LLM_URL}/v1.1",
                        "status": "staging",
                        "deployed_at": None,
                    },
                },
                "current": "v1.0.0",
            },
            "magpie": {
                "versions": {
                    "v1.0.0": {
                        "url": f"{settings.MAGPIE_TTS_URL}/v1",
                        "status": "active",
                        "deployed_at": None,
                    },
                },
                "current": "v1.0.0",
            },
        }

    def get_model_url(self, model_name: str, version: Optional[str] = None) -> str:
        """Get URL for specific model version"""
        if model_name not in self.model_registry:
            logger.warning(f"Model {model_name} not in registry, using default")
            return f"{settings.NEMOTRON_LLM_URL}/v1"

        model_info = self.model_registry[model_name]
        
        if version:
            if version in model_info["versions"]:
                return model_info["versions"][version]["url"]
            else:
                logger.warning(f"Version {version} not found for {model_name}, using current")
        
        current_version = model_info["current"]
        return model_info["versions"][current_version]["url"]

    def list_versions(self, model_name: str) -> List[Dict]:
        """List all versions for a model"""
        if model_name not in self.model_registry:
            return []

        model_info = self.model_registry[model_name]
        return [
            {
                "version": version,
                "status": info["status"],
                "deployed_at": info["deployed_at"],
            }
            for version, info in model_info["versions"].items()
        ]

    def deploy_version(
        self, model_name: str, version: str, strategy: str = "blue_green"
    ) -> bool:
        """
        Deploy a new model version
        strategy: 'blue_green' or 'rolling'
        """
        if model_name not in self.model_registry:
            logger.error(f"Model {model_name} not in registry")
            return False

        if version not in self.model_registry[model_name]["versions"]:
            logger.error(f"Version {version} not found for {model_name}")
            return False

        model_info = self.model_registry[model_name]
        version_info = model_info["versions"][version]

        if strategy == "blue_green":
            # Blue/green deployment: switch traffic after validation
            logger.info(f"Deploying {model_name} {version} using blue/green strategy")
            
            # Validate new version
            if not self._validate_version(model_name, version):
                logger.error(f"Validation failed for {model_name} {version}")
                return False

            # Switch traffic
            old_version = model_info["current"]
            model_info["current"] = version
            version_info["status"] = "active"
            version_info["deployed_at"] = str(__import__("datetime").datetime.now())

            # Mark old version as inactive
            if old_version in model_info["versions"]:
                model_info["versions"][old_version]["status"] = "inactive"

            logger.info(f"Successfully deployed {model_name} {version}")
            return True

        return False

    def rollback(self, model_name: str, target_version: Optional[str] = None) -> bool:
        """Rollback to previous or specified version"""
        if model_name not in self.model_registry:
            return False

        model_info = self.model_registry[model_name]
        current_version = model_info["current"]

        if target_version:
            if target_version not in model_info["versions"]:
                logger.error(f"Target version {target_version} not found")
                return False
            rollback_version = target_version
        else:
            # Find previous active version
            versions = [
                v for v, info in model_info["versions"].items()
                if info["status"] == "inactive" and v != current_version
            ]
            if not versions:
                logger.error("No previous version found for rollback")
                return False
            rollback_version = versions[-1]

        logger.info(f"Rolling back {model_name} from {current_version} to {rollback_version}")
        return self.deploy_version(model_name, rollback_version)

    def _validate_version(self, model_name: str, version: str) -> bool:
        """Validate model version is working"""
        try:
            model_info = self.model_registry[model_name]
            version_info = model_info["versions"][version]
            url = version_info["url"]

            # Simple health check
            # In production, run actual inference test
            logger.info(f"Validating {model_name} {version} at {url}")
            return True  # Placeholder
        except Exception as e:
            logger.error(f"Validation error: {e}")
            return False
