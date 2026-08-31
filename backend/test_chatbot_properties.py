"""
Testing script for Chatbot Real-Estate Properties and Ingestion Services
========================================================================
Runs assertions against normalization, ingestion mapping, and RBAC masking policies.
"""

import unittest
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import helper functions directly
from app.services.property_service import (
    parse_price, parse_bhk, parse_area, map_columns, PropertyService
)
from app.database import Base, PropertyRecord, PropertyMetadata


class TestPropertyService(unittest.TestCase):

    def setUp(self):
        # Setup clean, in-memory database
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = self.SessionLocal()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_normalization_parsing(self):
        """Asserts normalization parsing is correct."""
        # Price parsing
        self.assertEqual(parse_price("60 Lakh"), 6000000.0)
        self.assertEqual(parse_price("₹1.2 Cr"), 12000000.0)
        self.assertEqual(parse_price("75,00,000"), 7500000.0)
        self.assertEqual(parse_price("7500000"), 7500000.0)
        self.assertEqual(parse_price(None), 0.0)

        # BHK parsing
        self.assertEqual(parse_bhk("2 BHK"), 2)
        self.assertEqual(parse_bhk("3 Bedrooms"), 3)
        self.assertEqual(parse_bhk("4"), 4)
        self.assertEqual(parse_bhk(None), 0)

        # Area parsing
        self.assertEqual(parse_area("1200 Sq Ft"), 1200.0)
        self.assertEqual(parse_area("1,050"), 1050.0)
        self.assertEqual(parse_area(None), 0.0)

    def test_column_mapping(self):
        """Asserts equivalent headers are mapped to correct keys."""
        headers = [
            "Prop Name", "Locality", "City Name", "BHK Status",
            "Price In Lakhs", "Total Area Sq Ft", "Dealer Name", "Phone Number", "Email ID"
        ]
        mapping = map_columns(headers)
        
        self.assertEqual(mapping.get("property_name"), "Prop Name")
        self.assertEqual(mapping.get("location"), "Locality")
        self.assertEqual(mapping.get("bhk"), "BHK Status")
        self.assertEqual(mapping.get("price"), "Price In Lakhs")
        self.assertEqual(mapping.get("area_sq_ft"), "Total Area Sq Ft")
        self.assertEqual(mapping.get("dealer_name"), "Dealer Name")
        self.assertEqual(mapping.get("contact_number"), "Phone Number")

    def test_rbac_masking(self):
        """Asserts contact information is masked for regular users and visible for privileged roles."""
        # Insert a sample property
        prop = PropertyRecord(
            id="test-uuid",
            property_name="InterCity Horizon",
            location="Wakad",
            city="Pune",
            bhk=2,
            price=6500000.0,
            area_sq_ft=1100.0,
            dealer_name="Subodh Wadekar",
            contact_number="+91 9876543210",
            email="subodh@intercity.com"
        )
        self.db.add(prop)
        self.db.commit()

        # Retrieve as regular 'user' role
        user_masked = PropertyService._apply_rbac_masking([prop], "user")
        self.assertEqual(len(user_masked), 1)
        self.assertTrue(user_masked[0]["is_contact_masked"])
        self.assertEqual(user_masked[0]["contact_number"], "+91 ******")
        self.assertEqual(user_masked[0]["email"], "******@domain.com")

        # Retrieve as privileged 'broker' role
        broker_visible = PropertyService._apply_rbac_masking([prop], "broker")
        self.assertEqual(len(broker_visible), 1)
        self.assertFalse(broker_visible[0]["is_contact_masked"])
        self.assertEqual(broker_visible[0]["contact_number"], "+91 9876543210")
        self.assertEqual(broker_visible[0]["email"], "subodh@intercity.com")

        # Retrieve as privileged 'admin' role
        admin_visible = PropertyService._apply_rbac_masking([prop], "admin")
        self.assertEqual(len(admin_visible), 1)
        self.assertFalse(admin_visible[0]["is_contact_masked"])
        self.assertEqual(admin_visible[0]["contact_number"], "+91 9876543210")
        self.assertEqual(admin_visible[0]["email"], "subodh@intercity.com")


if __name__ == "__main__":
    unittest.main()
