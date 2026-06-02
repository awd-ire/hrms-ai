import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from database import SessionLocal
from services.bootstrap_service import bootstrap_demo_data


def main():
    db = SessionLocal()
    try:
        seeded = bootstrap_demo_data(db)
        print("Seeded demo data:" if seeded else "Demo data already present or skipped.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
