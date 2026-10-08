# Imported by Alembic (alembic/env.py) and dev scripts so that
# Base.metadata is populated with every model before create_all()/autogenerate.
from app.db.base_class import Base  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.disease_class import DiseaseClass  # noqa: F401
from app.models.diagnosis import Diagnosis  # noqa: F401
from app.models.satisfaction_survey import SatisfactionSurvey  # noqa: F401
from app.models.leaf_assessment import LeafAssessment  # noqa: F401
