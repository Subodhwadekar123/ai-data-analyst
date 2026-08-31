"""
AI Data Analyst - Property & Chatbot Service
=============================================
Central business logic for Excel property ingestion, data normalization,
natural-language query understanding, database retrieval, and grounded AI response generation.
"""

import os
import re
import uuid
import json
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from app.database import PropertyRecord, PropertyMetadata
from app.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


# ── Ingestion Normalization Helpers ──────────────────────────────────────────

def parse_price(val: Any) -> float:
    """Parses text prices like '60 Lakh', '1.2 Cr', '7,000,000' to numeric float in Rupees."""
    if pd.isna(val) or val is None:
        return 0.0
    val_str = str(val).lower().strip()
    # Remove currency symbols and formatting commas
    val_str = val_str.replace("₹", "").replace("rs", "").replace("inr", "").replace(",", "").strip()

    multiplier = 1.0
    if "lakh" in val_str or "lacs" in val_str or "lac" in val_str:
        multiplier = 100000.0
        val_str = val_str.replace("lakh", "").replace("lacs", "").replace("lac", "").strip()
    elif "cr" in val_str or "crore" in val_str or "crores" in val_str:
        multiplier = 10000000.0
        val_str = val_str.replace("crore", "").replace("crores", "").replace("cr", "").strip()

    try:
        # Extract the first digit/decimal block
        match = re.search(r"[-+]?\d*\.\d+|\d+", val_str)
        if match:
            return float(match.group()) * multiplier
        return 0.0
    except Exception:
        return 0.0


def parse_bhk(val: Any) -> int:
    """Parses BHK numbers like '2 BHK', '3 Bedrooms', '4' to integer count."""
    if pd.isna(val) or val is None:
        return 0
    val_str = str(val).lower().strip()
    try:
        match = re.search(r"\d+", val_str)
        if match:
            return int(match.group())
        return 0
    except Exception:
        return 0


def parse_area(val: Any) -> float:
    """Parses area like '1200 Sq Ft', '1,050' to float Sq Ft."""
    if pd.isna(val) or val is None:
        return 0.0
    val_str = str(val).lower().replace(",", "").strip()
    try:
        match = re.search(r"[-+]?\d*\.\d+|\d+", val_str)
        if match:
            return float(match.group())
        return 0.0
    except Exception:
        return 0.0


# ── Synonyms Column Mapping ──────────────────────────────────────────────────

def map_columns(df_columns: List[str]) -> Dict[str, str]:
    """Intelligently map column names to normalized fields using synonyms list."""
    mapping = {}
    synonyms = {
        "property_id": ["propertyid", "id", "propid", "property_id"],
        "property_name": ["propertyname", "name", "title", "property", "property_name"],
        "location": ["location", "locality", "address", "area", "neighborhood", "near"],
        "city": ["city", "town", "district"],
        "property_type": ["propertytype", "type", "flat/villa", "proptype", "property_type"],
        "bhk": ["bhk", "bedrooms", "bedroom", "room", "rooms"],
        "price": ["price", "cost", "value", "rate", "amount"],
        "price_per_sq_ft": ["pricepersqft", "pricesqft", "ratepersqft", "price_per_sq_ft", "price_per_sqft"],
        "area_sq_ft": ["areasqft", "sqft", "area", "size", "areasq_ft", "area_sq_ft", "area(sqft)"],
        "furnishing": ["furnishing", "furnished", "furnishstatus", "furnishedstatus", "furnishing_status"],
        "parking": ["parking", "carparking", "garage", "parking_space"],
        "amenities": ["amenities", "facilities", "features"],
        "status": ["status", "availability", "availablestatus"],
        "dealer_name": ["dealername", "dealer", "owner", "builder", "contactname", "dealer_name"],
        "agent_name": ["agentname", "agent", "broker", "agent_name"],
        "contact_number": ["contactnumber", "contact", "phone", "phonenumber", "mobile", "mobilenumber", "dealercontact", "contact_number"],
        "email": ["email", "emailaddress", "dealeremail"],
        "property_url": ["propertyurl", "url", "link", "propertylink", "property_url"]
    }

    for norm_field, syns in synonyms.items():
        matched_col = None
        for col in df_columns:
            clean_col = str(col).lower().replace(" ", "").replace("_", "").replace("-", "").replace("/", "")
            if clean_col in syns or any(s in clean_col for s in syns):
                matched_col = col
                break
        if matched_col is not None:
            mapping[norm_field] = matched_col
    return mapping


# ── Property Ingestion & Search Service ──────────────────────────────────────

class PropertyService:

    @staticmethod
    def ingest_properties_excel(db: Session, file_content: bytes, filename: str, uploaded_by: str) -> Dict[str, Any]:
        """
        Ingests properties from an Excel spreadsheet, normalizes values,
        clears prior database entries, and saves new records.
        """
        # Save Excel to temporary file to read via Pandas
        temp_dir = os.path.join(settings.UPLOAD_DIR, "scratch")
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, f"properties_{uuid.uuid4()}.xlsx")

        with open(temp_path, "wb") as f:
            f.write(file_content)

        try:
            # Load into pandas dataframe
            df = pd.read_excel(temp_path)
            row_count, col_count = df.shape
            if row_count == 0:
                raise ValueError("Excel file is empty.")

            # Map columns
            col_mapping = map_columns(df.columns.tolist())
            logger.info(f"Columns mapped: {col_mapping}")

            # Verify minimal columns exist: Location, Price, Name (or equivalent)
            required_mappings = ["property_name", "location", "price"]
            missing_mappings = [m for m in required_mappings if m not in col_mapping]
            if missing_mappings:
                raise ValueError(f"Could not map critical columns: {', '.join(missing_mappings)}")

            # Delete existing properties in DB
            db.query(PropertyRecord).delete()
            db.commit()

            # Insert normalized records
            property_records = []
            for _, row in df.iterrows():
                # Helper dictionary for mapping values safely
                raw_row_data = {str(k): str(v) for k, v in row.to_dict().items() if not pd.isna(v)}

                # Extract and normalize values
                prop_id_col = col_mapping.get("property_id")
                prop_id = str(row[prop_id_col]).strip() if prop_id_col and not pd.isna(row[prop_id_col]) else str(uuid.uuid4())

                name_col = col_mapping.get("property_name")
                prop_name = str(row[name_col]).strip() if name_col and not pd.isna(row[name_col]) else "Unknown Property"

                loc_col = col_mapping.get("location")
                location = str(row[loc_col]).strip() if loc_col and not pd.isna(row[loc_col]) else "Unknown Location"

                city_col = col_mapping.get("city")
                city = str(row[city_col]).strip() if city_col and not pd.isna(row[city_col]) else "Pune"

                type_col = col_mapping.get("property_type")
                prop_type = str(row[type_col]).strip() if type_col and not pd.isna(row[type_col]) else "Flat"

                bhk_col = col_mapping.get("bhk")
                bhk = parse_bhk(row[bhk_col]) if bhk_col else 0

                price_col = col_mapping.get("price")
                price = parse_price(row[price_col]) if price_col else 0.0

                price_sqft_col = col_mapping.get("price_per_sq_ft")
                price_per_sq_ft = parse_price(row[price_sqft_col]) if price_sqft_col else 0.0

                area_col = col_mapping.get("area_sq_ft")
                area_sq_ft = parse_area(row[area_col]) if area_col else 0.0

                furnishing_col = col_mapping.get("furnishing")
                furnishing = str(row[furnishing_col]).strip() if furnishing_col and not pd.isna(row[furnishing_col]) else "Unfurnished"

                parking_col = col_mapping.get("parking")
                parking = str(row[parking_col]).strip() if parking_col and not pd.isna(row[parking_col]) else "None"

                amenities_col = col_mapping.get("amenities")
                amenities = str(row[amenities_col]).strip() if amenities_col and not pd.isna(row[amenities_col]) else ""

                status_col = col_mapping.get("status")
                status = str(row[status_col]).strip() if status_col and not pd.isna(row[status_col]) else "Ready to Move"

                dealer_col = col_mapping.get("dealer_name")
                dealer_name = str(row[dealer_col]).strip() if dealer_col and not pd.isna(row[dealer_col]) else ""

                agent_col = col_mapping.get("agent_name")
                agent_name = str(row[agent_col]).strip() if agent_col and not pd.isna(row[agent_col]) else ""

                contact_col = col_mapping.get("contact_number")
                contact_number = str(row[contact_col]).strip() if contact_col and not pd.isna(row[contact_col]) else ""

                email_col = col_mapping.get("email")
                email = str(row[email_col]).strip() if email_col and not pd.isna(row[email_col]) else ""

                url_col = col_mapping.get("property_url")
                property_url = str(row[url_col]).strip() if url_col and not pd.isna(row[url_col]) else ""

                record = PropertyRecord(
                    id=str(uuid.uuid4()),
                    property_id=prop_id,
                    property_name=prop_name,
                    location=location,
                    city=city,
                    property_type=prop_type,
                    bhk=bhk,
                    price=price,
                    price_per_sq_ft=price_per_sq_ft,
                    area_sq_ft=area_sq_ft,
                    furnishing=furnishing,
                    parking=parking,
                    amenities=amenities,
                    status=status,
                    dealer_name=dealer_name,
                    agent_name=agent_name,
                    contact_number=contact_number,
                    email=email,
                    property_url=property_url,
                    raw_data=json.dumps(raw_row_data)
                )
                property_records.append(record)

            db.bulk_save_objects(property_records)

            # Update Metadata record
            meta = db.query(PropertyMetadata).filter(PropertyMetadata.id == "current_dataset").first()
            if not meta:
                meta = PropertyMetadata(
                    id="current_dataset",
                    filename=filename,
                    row_count=row_count,
                    uploaded_by=uploaded_by,
                    updated_at=datetime.utcnow()
                )
                db.add(meta)
            else:
                meta.filename = filename
                meta.row_count = row_count
                meta.uploaded_by = uploaded_by
                meta.updated_at = datetime.utcnow()

            db.commit()
            logger.info(f"Ingested {row_count} properties successfully.")
            return {
                "success": True,
                "row_count": row_count,
                "mapped_columns": {k: str(v) for k, v in col_mapping.items()}
            }
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    @staticmethod
    def get_metadata(db: Session) -> Optional[Dict[str, Any]]:
        """Retrieves the properties metadata (freshness info)."""
        meta = db.query(PropertyMetadata).filter(PropertyMetadata.id == "current_dataset").first()
        if meta:
            return {
                "filename": meta.filename,
                "row_count": meta.row_count,
                "uploaded_by": meta.uploaded_by,
                "updated_at": meta.updated_at.isoformat()
            }
        return None


# ── Natural Language Querying & Response Generation ─────────────────────────

    @staticmethod
    def query_chatbot(db: Session, question: str, history: List[Dict[str, str]], user_role: str) -> Dict[str, Any]:
        """
        Parses question+history using Gemini, queries the database deterministically,
        applies role-based masking, generates grounded conversational summary, and returns output.
        """
        meta = PropertyService.get_metadata(db)
        if not meta or meta["row_count"] == 0:
            return {
                "answer": "No property dataset has been uploaded by the system administrator yet. Please upload property data in the admin console to interact with the properties database.",
                "properties": [],
                "suggestions": ["Hi, help me find properties"],
                "metadata": None
            }

        # 1. Parse question and extract structured filters
        parsed = PropertyService._nlp_parse_query(question, history)
        logger.info(f"Extracted filters: {parsed}")

        # 2. Query properties from database using filters
        properties = PropertyService._query_database(db, parsed)
        logger.info(f"Database returned {len(properties)} matching properties.")

        # 3. Apply role-based contact masking
        masked_properties = PropertyService._apply_rbac_masking(properties, user_role)

        # 4. Generate conversational response grounded in database properties
        answer = PropertyService._generate_grounded_response(question, properties, masked_properties, history)

        # 5. Build dynamic suggestions chips
        suggestions = PropertyService._generate_suggestions(parsed, masked_properties)

        return {
            "answer": answer,
            "properties": masked_properties,
            "suggestions": suggestions,
            "metadata": {
                "last_updated": meta["updated_at"],
                "total_matches": len(properties)
            }
        }


# ── NLP Search Parser ───────────────────────────────────────────────────────

    @staticmethod
    def _nlp_parse_query(question: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
        """Parse natural language query to filter dictionary using Gemini or regex fallback."""
        if not settings.GEMINI_API_KEY:
            logger.info("Gemini key not configured. Using rule-based fallback query parser.")
            return PropertyService._fallback_parse_query(question)

        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-3.6-flash")

            history_text = ""
            for item in history[-6:]:  # Only look at last 3 turns
                role = "User" if item.get("role") == "user" else "Assistant"
                content = item.get("content", "")
                history_text += f"{role}: {content}\n"

            prompt = f"""You are a query parser for a real-estate database. Your job is to extract search filters from the user's question, taking into account the conversation history.

Conversation History:
{history_text}

User Question:
{question}

Based on the question and history, extract the structured search filters. Return a JSON object with:
- "filters": {{
    "location": string or null (e.g. "Wakad", "Hinjewadi"),
    "city": string or null (e.g. "Pune", "Mumbai"),
    "bhk": integer or null (e.g. 2, 3),
    "min_price": number or null (in Rupees, e.g. 5000000),
    "max_price": number or null (in Rupees, e.g. 7000000),
    "min_area": number or null (in Sq Ft),
    "max_area": number or null (in Sq Ft),
    "furnishing": string or null (one of "Furnished", "Unfurnished", "Semi-Furnished"),
    "parking": string or null (e.g. "Available", "Yes", "No", or null),
    "status": string or null (e.g. "Ready to Move", "Under Construction"),
    "property_type": string or null (e.g. "Flat", "Apartment", "Villa", "Row House")
  }}
- "sorting": string or null ("cheapest" | "expensive" | "largest" | "smallest")
- "compare": array of integers or null (indices or positions of properties the user wants to compare, e.g., [0, 1] for the first two)
- "general_query": boolean (true if user is asking general questions like "Hi", "Who are you?", or questions unrelated to searching properties in the database)

Provide ONLY valid JSON. Do not return markdown blocks or headers."""

            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            data = json.loads(response.text.strip())
            return data
        except Exception as e:
            logger.error(f"Failed to parse query with Gemini: {e}. Falling back to rule-based parser.")
            return PropertyService._fallback_parse_query(question)

    @staticmethod
    def _fallback_parse_query(question: str) -> Dict[str, Any]:
        """Simple regex-based parsing fallback."""
        q_lower = question.lower()
        filters = {
            "location": None,
            "city": None,
            "bhk": None,
            "min_price": None,
            "max_price": None,
            "min_area": None,
            "max_area": None,
            "furnishing": None,
            "parking": None,
            "status": None,
            "property_type": None
        }
        sorting = None
        general_query = False

        if any(k in q_lower for k in ["hi", "hello", "who are you", "what is your name", "help"]):
            general_query = True

        # BHK detection
        bhk_match = re.search(r"(\d+)\s*(?:bhk|bedroom|rooms|bed)", q_lower)
        if bhk_match:
            filters["bhk"] = int(bhk_match.group(1))

        # Price detection
        between_match = re.search(r"between\s+(\d+(?:\.\d+)?)\s*(?:lakh|lacs|cr)?\s+and\s+(\d+(?:\.\d+)?)\s*(lakh|lacs|cr)?", q_lower)
        if between_match:
            val1 = float(between_match.group(1))
            val2 = float(between_match.group(2))
            unit = between_match.group(3) or "lakh"
            mult = 100000.0 if "lakh" in unit or "lac" in unit else 10000000.0
            filters["min_price"] = val1 * mult
            filters["max_price"] = val2 * mult
        else:
            under_match = re.search(r"(?:under|below|less than|max|maximum|under\s*₹)\s*(\d+(?:\.\d+)?)\s*(lakh|lacs|lac|cr)?", q_lower)
            if under_match:
                val = float(under_match.group(1))
                unit = under_match.group(2) or "lakh"
                mult = 100000.0 if "lakh" in unit or "lac" in unit else 10000000.0
                filters["max_price"] = val * mult

            above_match = re.search(r"(?:above|more than|greater than|min|minimum|over)\s*(\d+(?:\.\d+)?)\s*(lakh|lacs|lac|cr)?", q_lower)
            if above_match:
                val = float(above_match.group(1))
                unit = above_match.group(2) or "lakh"
                mult = 100000.0 if "lakh" in unit or "lac" in unit else 10000000.0
                filters["min_price"] = val * mult

        # Furnishing
        if "furnished" in q_lower:
            if "semi" in q_lower:
                filters["furnishing"] = "Semi-Furnished"
            elif "un" in q_lower:
                filters["furnishing"] = "Unfurnished"
            else:
                filters["furnishing"] = "Furnished"

        # Parking
        if "parking" in q_lower:
            filters["parking"] = "Available"

        # Sorting
        if "cheapest" in q_lower or "lowest price" in q_lower or "budget" in q_lower:
            sorting = "cheapest"
        elif "expensive" in q_lower or "highest price" in q_lower:
            sorting = "expensive"

        # Location heuristical extraction
        loc_match = re.search(r"(?:in|near|at|around|inside)\s+([a-zA-Z]+)", q_lower)
        if loc_match:
            loc_candidate = loc_match.group(1).strip().capitalize()
            if loc_candidate.lower() in ["pune", "mumbai"]:
                filters["city"] = loc_candidate
            else:
                filters["location"] = loc_candidate

        return {
            "filters": filters,
            "sorting": sorting,
            "compare": None,
            "general_query": general_query
        }


# ── Database Retrieval ──────────────────────────────────────────────────────

    @staticmethod
    def _query_database(db: Session, parsed: Dict[str, Any]) -> List[PropertyRecord]:
        """Retrieves properties based on structured filters."""
        query = db.query(PropertyRecord)
        filters = parsed.get("filters", {})

        conditions = []

        if filters.get("city"):
            conditions.append(PropertyRecord.city.ilike(f"%{filters['city']}%"))

        if filters.get("location"):
            conditions.append(PropertyRecord.location.ilike(f"%{filters['location']}%"))

        if filters.get("bhk"):
            conditions.append(PropertyRecord.bhk == filters["bhk"])

        if filters.get("min_price"):
            conditions.append(PropertyRecord.price >= filters["min_price"])

        if filters.get("max_price"):
            conditions.append(PropertyRecord.price <= filters["max_price"])

        if filters.get("min_area"):
            conditions.append(PropertyRecord.area_sq_ft >= filters["min_area"])

        if filters.get("max_area"):
            conditions.append(PropertyRecord.area_sq_ft <= filters["max_area"])

        if filters.get("furnishing"):
            conditions.append(PropertyRecord.furnishing.ilike(f"%{filters['furnishing']}%"))

        if filters.get("parking"):
            conditions.append(PropertyRecord.parking.ilike("%yes%") | PropertyRecord.parking.ilike("%available%") | PropertyRecord.parking.ilike("%car%"))

        if filters.get("status"):
            conditions.append(PropertyRecord.status.ilike(f"%{filters['status']}%"))

        if filters.get("property_type"):
            conditions.append(PropertyRecord.property_type.ilike(f"%{filters['property_type']}%"))

        if conditions:
            query = query.filter(and_(*conditions))

        # Sorting logic
        sorting = parsed.get("sorting")
        if sorting == "cheapest":
            query = query.order_by(PropertyRecord.price.asc())
        elif sorting == "expensive":
            query = query.order_by(PropertyRecord.price.desc())
        elif sorting == "largest":
            query = query.order_by(PropertyRecord.area_sq_ft.desc())
        elif sorting == "smallest":
            query = query.order_by(PropertyRecord.area_sq_ft.asc())

        return query.limit(15).all()


# ── Role-based Contact Masking (RBAC) ───────────────────────────────────────

    @staticmethod
    def _apply_rbac_masking(properties: List[PropertyRecord], user_role: str) -> List[Dict[str, Any]]:
        """Enforces contact details restrictions for standard 'user' role."""
        masked_list = []
        is_restricted = user_role.lower() not in ["admin", "agent", "broker", "dealer"]

        for p in properties:
            item = {
                "id": p.id,
                "property_id": p.property_id,
                "property_name": p.property_name,
                "location": p.location,
                "city": p.city,
                "property_type": p.property_type,
                "bhk": p.bhk,
                "price": p.price,
                "price_per_sq_ft": p.price_per_sq_ft,
                "area_sq_ft": p.area_sq_ft,
                "furnishing": p.furnishing,
                "parking": p.parking,
                "amenities": p.amenities,
                "status": p.status,
                "dealer_name": p.dealer_name,
                "agent_name": p.agent_name,
                "property_url": p.property_url,
                "is_contact_masked": is_restricted
            }

            if is_restricted:
                item["contact_number"] = "+91 ******"
                item["email"] = "******@domain.com"
            else:
                item["contact_number"] = p.contact_number
                item["email"] = p.email

            masked_list.append(item)

        return masked_list


# ── Conversational Grounded response ────────────────────────────────────────

    @staticmethod
    def _generate_grounded_response(
        question: str,
        properties: List[PropertyRecord],
        masked_properties: List[Dict[str, Any]],
        history: List[Dict[str, str]]
    ) -> str:
        """Assembles context of properties and queries Gemini to draft grounded answer."""
        if parsed_general := PropertyService._is_greeting_or_about(question):
            return parsed_general

        if not properties:
            return "I couldn't find any properties matching your requirements in the database. Try asking for a broader location or budget (e.g. Wakad or Hinjewadi)."

        if not settings.GEMINI_API_KEY:
            logger.info("Using rule-based response formulation.")
            return PropertyService._fallback_generate_response(question, properties)

        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-3.6-flash")

            props_text = ""
            for idx, p in enumerate(properties[:10]):
                price_lakh = p.price / 100000.0 if p.price else 0
                price_str = f"₹{price_lakh:.1f} Lakh" if price_lakh < 100 else f"₹{price_lakh/100.0:.2f} Cr"
                props_text += f"[{idx}] Name: {p.property_name}, Location: {p.location}, City: {p.city}, BHK: {p.bhk}, Price: {price_str}, Area: {p.area_sq_ft} sqft, Furnishing: {p.furnishing}, Parking: {p.parking}, Status: {p.status}, Dealer: {p.dealer_name}\n"

            prompt = f"""You are a helpful real-estate chatbot for InterCity properties. Based on the following matching properties retrieved from our database, answer the user's question.

User Question: {question}

Matching Properties:
{props_text}

Instructions:
1. Ground your response STRICTLY in the matching properties data provided above.
2. If no properties match, clearly say so.
3. Do NOT invent or hallucinate any properties, contacts, prices, or dealer details that are not in the list.
4. Distinguish between exact data and any calculated info.
5. If the user asks for contact details (like dealer email or phone), do NOT invent them. Let them know they can click the contact buttons in the property cards directly.
6. Provide a concise, professional summary of the matching properties. Suggest comparing them or asking for details.
7. Keep it conversational but grounded.
"""

            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Failed to generate answer with Gemini: {e}")
            return PropertyService._fallback_generate_response(question, properties)

    @staticmethod
    def _fallback_generate_response(question: str, properties: List[PropertyRecord]) -> str:
        """Formulates rule-based listing response."""
        count = len(properties)
        resp = f"I found {count} properties matching your requirements in our database:\n\n"
        for i, p in enumerate(properties[:3]):
            price_lakh = p.price / 100000.0 if p.price else 0
            price_str = f"₹{price_lakh:.1f} Lakh" if price_lakh < 100 else f"₹{price_lakh/100.0:.2f} Cr"
            resp += f"- **{p.property_name}** in {p.location}, {p.city} — {p.bhk} BHK, {p.area_sq_ft} sqft, priced at **{price_str}** ({p.furnishing or 'Unfurnished'}, parking: {p.parking}). Dealer: {p.dealer_name or 'N/A'}.\n"
        if count > 3:
            resp += f"\nI've rendered all {count} results as cards below for you to browse."
        return resp

    @staticmethod
    def _is_greeting_or_about(question: str) -> Optional[str]:
        """Simple checks for greetings/about chatbot."""
        q = question.lower().strip()
        if q in ["hi", "hello", "hey", "greetings"]:
            return "Hello! I am your InterCity Real-Estate AI Assistant. I can help you search, filter, and compare properties. What are you looking for today? (e.g. 'Show me 2 BHK in Wakad')"
        if any(k in q for k in ["who are you", "what do you do", "about you"]):
            return "I am an intelligent property chatbot. I process questions about properties in Pune, wakad, hinjewadi, etc. using our latest live spreadsheet database. Ask me about budgets, BHKs, locations, and more!"
        return None


# ── Suggestions Chips Generator ─────────────────────────────────────────────

    @staticmethod
    def _generate_suggestions(parsed: Dict[str, Any], properties: List[Dict[str, Any]]) -> List[str]:
        """Generates dynamic chips based on current results or context."""
        suggestions = []
        filters = parsed.get("filters", {})

        if not properties:
            return [
                "Show properties in Hinjewadi",
                "Show 2 BHK under ₹60 lakh",
                "Give me the cheapest property"
            ]

        location = filters.get("location") or (properties[0]["location"] if properties else None)
        bhk = filters.get("bhk") or (properties[0]["bhk"] if properties else None)

        if location:
            suggestions.append(f"Show properties near {location}")
            suggestions.append(f"What is the cheapest one in {location}?")
        if bhk:
            suggestions.append(f"What about {bhk + 1} BHK properties?")
        else:
            suggestions.append("Show 3 BHK flats")

        if any(p.get("furnishing") == "Furnished" for p in properties):
            suggestions.append("Show only furnished properties")
        else:
            suggestions.append("Show properties with parking")

        return suggestions[:4]
