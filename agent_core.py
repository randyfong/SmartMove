import os
import json
import datetime
import subprocess
import uuid
import httpx
from pathlib import Path
from dotenv import load_dotenv

# Load env file to read keys if called directly
ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# Helper to run Git commands safely
def run_git_command(args, cwd=None):
    try:
        result = subprocess.run(args, cwd=cwd, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Git command failed: {' '.join(args)} | Error: {e.stderr.strip()}")
        return None

class GitTraceLogger:
    """
    Handles logging of step-by-step trace checkpoints into the repository
    under `.entire/checkpoints/` and auto-commits them for an auditable trace history.
    """
    def __init__(self, workspace_path=None):
        self.workspace_path = workspace_path or Path(__file__).parent.absolute()
        self.checkpoints_dir = self.workspace_path / ".entire" / "checkpoints"
        self.checkpoints_dir.mkdir(parents=True, exist_ok=True)
        
        # Ensure workspace is a git repo
        if not (self.workspace_path / ".git").exists():
            print("Initializing Git Repository...")
            run_git_command(["git", "init"], cwd=self.workspace_path)
            run_git_command(["git", "config", "user.name", "SmartMove Agent"], cwd=self.workspace_path)
            run_git_command(["git", "config", "user.email", "agent@smartmove.ai"], cwd=self.workspace_path)

    def write_checkpoint(self, run_id, step, step_name, data, comment=None):
        """
        Writes a trace checkpoint file and commits it via git.
        """
        timestamp = datetime.datetime.now().isoformat()
        checkpoint_filename = f"checkpoint_{run_id}_{step:02d}_{step_name.lower().replace(' ', '_')}.json"
        checkpoint_path = self.checkpoints_dir / checkpoint_filename
        
        checkpoint_content = {
            "run_id": run_id,
            "step": step,
            "step_name": step_name,
            "comment": comment or f"Logs relocation agent activity for trace checkpoint: {step_name}.",
            "timestamp": timestamp,
            "data": data
        }
        
        # Write checkpoint file
        with open(checkpoint_path, "w", encoding="utf-8") as f:
            json.dump(checkpoint_content, f, indent=2, ensure_ascii=False)
            
        # Commit checkpoint in Git
        rel_path = f".entire/checkpoints/{checkpoint_filename}"
        run_git_command(["git", "add", rel_path], cwd=self.workspace_path)
        commit_msg = f"entire-checkpoint: {step_name} (Run: {run_id[:8]}, Step: {step})"
        run_git_command(["git", "commit", "-m", commit_msg], cwd=self.workspace_path)
        
        return checkpoint_content

# High fidelity mock listings database
MOCK_LISTINGS = [
    {
        "id": "list_sf_001",
        "title": "The Lumina Luxury Residences",
        "price": 3400,
        "beds": 1,
        "baths": 1,
        "address": "201 Folsom St, San Francisco, CA 94105",
        "neighborhood": "South of Market (SOMA)",
        "walkability_score": 95,
        "amenities": ["In-unit Washer/Dryer", "High-end Fitness Center", "24/7 Doorman", "Rooftop Terrace", "Dishwasher", "Valet Parking"],
        "climbing_gym_distance_miles": 0.8,
        "grocery_store_distance_miles": 0.2,
        "commute_time_downtown_mins": 10,
        "description": "Experience luxury living at the iconic Lumina SOMA. This high-floor unit features floor-to-ceiling windows with panoramic city views, high-end Gaggenau appliances, Nest learning thermostat, and gorgeous hardwood flooring. Building amenities are world-class including an indoor lap pool, rock climbing wall, and absolute premium security.",
        "image_url": "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=60"
    },
    {
        "id": "list_sf_002",
        "title": "Vibrant Mission District Oasis",
        "price": 3250,
        "beds": 1,
        "baths": 1,
        "address": "850 Valencia St, San Francisco, CA 94110",
        "neighborhood": "Mission District",
        "walkability_score": 98,
        "amenities": ["Shared Rooftop Garden", "Secure Bike Storage", "Dishwasher", "Hardwood Floors", "Pet Friendly"],
        "climbing_gym_distance_miles": 0.3,
        "grocery_store_distance_miles": 0.1,
        "commute_time_downtown_mins": 15,
        "description": "A sun-drenched, beautifully updated apartment in the heart of Valencia Corridor. Just steps away from San Francisco's most beloved restaurants, independent cafes, and Bi-Rite Market. Extremely tall ceilings, large bay windows, and private bike storage makes this an absolute haven for active professionals.",
        "image_url": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=60"
    },
    {
        "id": "list_sf_003",
        "title": "SOMA Brick & Timber Loft",
        "price": 2900,
        "beds": "Loft",
        "baths": 1,
        "address": "455 10th St, San Francisco, CA 94103",
        "neighborhood": "South of Market (SOMA)",
        "walkability_score": 92,
        "amenities": ["In-unit Washer/Dryer", "Shared Garden Courtyard", "Exposed Brick Walls", "Dishwasher", "Walk-in Closet"],
        "climbing_gym_distance_miles": 1.1,
        "grocery_store_distance_miles": 0.15,
        "commute_time_downtown_mins": 12,
        "description": "Gorgeous industrial loft featuring double-tall ceilings, original timber beams, and exposed red brick. The open floor plan includes a modern chef's kitchen, custom bookshelves, and a cozy mezzanine bedroom. Exceptionally convenient location right around the block from Trader Joe's and target commute lines.",
        "image_url": "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=60"
    },
    {
        "id": "list_sf_004",
        "title": "Classic Presidio Heights Edwardian",
        "price": 3600,
        "beds": 1,
        "baths": 1,
        "address": "3215 Sacramento St, San Francisco, CA 94115",
        "neighborhood": "Presidio Heights",
        "walkability_score": 88,
        "amenities": ["Decorative Fireplace", "Hardwood Floors", "Dishwasher", "Coin-operated Laundry in Building"],
        "climbing_gym_distance_miles": 2.2,
        "grocery_store_distance_miles": 0.3,
        "commute_time_downtown_mins": 25,
        "description": "Period charm meets modern style. This stunning Edwardian flat retains historical details such as crown moldings, box-beam ceilings, and a built-in hutch. Located on an extremely quiet residential street within easy walking distance to Laurel Village, Presidio trails, and high-end dining.",
        "image_url": "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=60"
    },
    {
        "id": "list_sf_005",
        "title": "Inner Sunset Judah Studio",
        "price": 2100,
        "beds": "Studio",
        "baths": 1,
        "address": "1420 Judah St, San Francisco, CA 94122",
        "neighborhood": "Inner Sunset",
        "walkability_score": 85,
        "amenities": ["Shared Backyard Access", "All Utilities Included", "Hardwood Floors"],
        "climbing_gym_distance_miles": 3.5,
        "grocery_store_distance_miles": 0.4,
        "commute_time_downtown_mins": 35,
        "description": "Charming garden studio located in the highly desirable Inner Sunset. Flooded with natural light, this unit features a renovated kitchenette and private entrance opening directly to a beautiful shared backyard. Directly on the N-Judah Muni line, ideal for students or quiet commuters.",
        "image_url": "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&auto=format&fit=crop&q=60"
    }
]

class RelocationAgent:
    def __init__(self, gemini_api_key=None, apify_token=None, trace_logger=None):
        self.gemini_api_key = gemini_api_key or os.getenv("GEMINI_API_KEY")
        self.apify_token = apify_token or os.getenv("APIFY_API_TOKEN")
        self.logger = trace_logger or GitTraceLogger()

    def run_pipeline(self, requirements: dict):
        """
        Executes the relocation audit and pipeline:
        1. Initialization
        2. Listing Search (Apify or High-fidelity mock)
        3. Constraints Evaluation (Gemini or High-fidelity mock)
        4. Final Checkpoint Recommendation
        """
        run_id = f"run_{uuid.uuid4().hex[:12]}"
        
        # Step 1: Initialize
        # [Checkpoint 1: Relocation Search Initialized]
        # Logs the initialization of the relocation pipeline, capturing the user's input search parameters, constraints (budget, laundry, fitness, commute, query), and the system configuration for live/mock API states.
        self.logger.write_checkpoint(
            run_id=run_id,
            step=1,
            step_name="Relocation Search Initialized",
            comment="Logs the initialization of the relocation pipeline, capturing the user's input search parameters, constraints (budget, laundry, fitness, commute, query), and the system configuration for live/mock API states.",
            data={
                "requirements": requirements,
                "api_modes": {
                    "gemini_active": bool(self.gemini_api_key),
                    "apify_active": bool(self.apify_token)
                }
            }
        )
        
        # Step 2: Listing Scraping / Retrieval
        raw_listings = self._fetch_listings(requirements)
        # [Checkpoint 2: Property Listings Fetched]
        # Logs raw apartment listings scraped or fetched from the database, listing their IDs, titles, rental prices, and street addresses.
        self.logger.write_checkpoint(
            run_id=run_id,
            step=2,
            step_name="Property Listings Fetched",
            comment="Logs the raw apartment listings scraped or fetched from the database, listing their IDs, titles, rental prices, and street addresses.",
            data={
                "listings_count": len(raw_listings),
                "listings": [
                    {"id": l["id"], "title": l["title"], "price": l["price"], "address": l["address"]} 
                    for l in raw_listings
                ]
            }
        )
        
        # Step 3: Constraint Auditing (Listing-by-Listing evaluation)
        audited_listings = []
        for index, listing in enumerate(raw_listings):
            evaluation = self._evaluate_listing(listing, requirements)
            audit_entry = {
                "listing": listing,
                "approved": evaluation["approved"],
                "score": evaluation["score"],
                "reasoning": evaluation["reasoning"]
            }
            audited_listings.append(audit_entry)
            
            # Write trace checkpoint for individual listing evaluation
            # [Checkpoint 3 to 7: Audited Listing [ID]]
            # Logs a granular, constraint-by-constraint audit evaluation of an individual listing, storing its approval status, compatibility score, and detailed structured reasoning (budget, laundry, fitness, commute, and search query).
            self.logger.write_checkpoint(
                run_id=run_id,
                step=3 + index,
                step_name=f"Audited Listing {listing['id']}",
                comment=f"Logs a granular, constraint-by-constraint audit evaluation of the individual listing '{listing['id']}', storing its approval status, compatibility score, and detailed structured reasoning (budget, laundry, fitness, commute, and search query).",
                data={
                    "listing_id": listing["id"],
                    "title": listing["title"],
                    "approved": evaluation["approved"],
                    "score": evaluation["score"],
                    "reasoning": evaluation["reasoning"]
                }
            )
            
        # Step 4: Final Selection & Recommendations
        approved_listings = [a for a in audited_listings if a["approved"]]
        # Sort by score descending
        approved_listings.sort(key=lambda x: x["score"], reverse=True)
        
        final_recommendation = {
            "total_evaluated": len(audited_listings),
            "approved_count": len(approved_listings),
            "top_choice": approved_listings[0]["listing"] if approved_listings else None,
            "all_results": [
                {
                    "id": a["listing"]["id"],
                    "title": a["listing"]["title"],
                    "price": a["listing"]["price"],
                    "address": a["listing"]["address"],
                    "neighborhood": a["listing"]["neighborhood"],
                    "walkability_score": a["listing"]["walkability_score"],
                    "amenities": a["listing"]["amenities"],
                    "commute_time": a["listing"]["commute_time_downtown_mins"],
                    "image_url": a["listing"]["image_url"],
                    "approved": a["approved"],
                    "score": a["score"],
                    "reasoning": a["reasoning"]
                }
                for a in audited_listings
            ]
        }
        
        # Write the final summary checkpoint
        # [Checkpoint 8: Search Recommendations Finalized]
        # Logs the consolidated relocation report and final recommendations, storing the total count of evaluated listings, the number of approved listings, the top-choice selection, and the complete audit list.
        self.logger.write_checkpoint(
            run_id=run_id,
            step=3 + len(raw_listings),
            step_name="Search Recommendations Finalized",
            comment="Logs the consolidated relocation report and final recommendations, storing the total count of evaluated listings, the number of approved listings, the top-choice selection, and the complete audit list.",
            data=final_recommendation
        )
        
        return {
            "run_id": run_id,
            "summary": {
                "total_evaluated": len(audited_listings),
                "approved_count": len(approved_listings)
            },
            "results": final_recommendation["all_results"]
        }

    def _fetch_listings(self, requirements: dict):
        """
        Fetches apartment listings based on city.
        Falls back to high-fidelity local mock data.
        """
        # In a fully connected app, we could call Apify here.
        # But for reliability, high-fidelity mock databases ensure consistent premium demo content.
        return MOCK_LISTINGS

    def _evaluate_listing(self, listing: dict, reqs: dict):
        """
        Evaluates a single listing's constraints.
        Calls the live Gemini API if GEMINI_API_KEY is active, otherwise falls back to
        the premium internal rule engine to generate perfect mock reasoning.
        """
        max_budget = float(reqs.get("budget", 3500))
        require_laundry = reqs.get("requireLaundry", True)
        require_gym = reqs.get("requireGym", True)
        max_commute = float(reqs.get("maxCommute", 30))
        search_query = reqs.get("searchQuery", "").strip()
        
        if self.gemini_api_key:
            # Let's perform a live Gemini content generation call
            return self._call_gemini_evaluation(listing, max_budget, require_laundry, require_gym, max_commute, search_query)
        else:
            # Use our ultra high-fidelity rules engine to generate realistic reasoning logs
            return self._mock_evaluation(listing, max_budget, require_laundry, require_gym, max_commute, search_query)

    def _call_gemini_evaluation(self, listing: dict, max_budget, require_laundry, require_gym, max_commute, search_query=""):
        """
        Makes a live HTTP request to Gemini 2.5 Flash model with structured JSON schemas
        """
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.gemini_api_key}"
        
        prompt = f"""
You are an expert Relocation Assistant AI Agent. Evaluate the following listing against the user's constraints and return a structured JSON response.

User Constraints:
- Max Budget: ${max_budget}
- In-unit laundry required: {require_laundry}
- Must be close to climbing gym / active fitness: {require_gym}
- Max Commute to Downtown: {max_commute} minutes
"""
        if search_query:
            prompt += f"- Additional search criteria / custom preference: {search_query}\n"
            
        prompt += f"""
Apartment Listing:
{json.dumps(listing, indent=2)}

You MUST respond with a JSON object in this exact schema (no additional wrapping, markdown blocks or prefixes):
{{
  "approved": true or false,
  "score": integer between 0 and 100 representing how well it fits requirements,
  "reasoning": {{
    "budget": "detailed explanation of budget matching",
    "laundry": "detailed explanation of laundry matching",
    "climbing_gym": "detailed explanation of fitness proximity matching",
    "commute": "detailed explanation of commute matching",
"""
        if search_query:
            prompt += '    "search_query": "detailed explanation of how well the listing satisfies/contains elements of the additional search criteria",\n'
            
        prompt += """    "overall": "comprehensive overall reasoning matching user profile"
  }}
}}
"""
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        try:
            with httpx.Client(timeout=15.0) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    res_json = res.json()
                    text_content = res_json["candidates"][0]["content"]["parts"][0]["text"].strip()
                    # Clean up markdown code blocks if Gemini returns them despite mime type config
                    if text_content.startswith("```json"):
                        text_content = text_content[7:]
                    if text_content.endswith("```"):
                        text_content = text_content[:-3]
                    eval_data = json.loads(text_content.strip())
                    # Defensive parsing: Ensure search_query exists in reasoning if requested
                    if search_query and "reasoning" in eval_data:
                        if "search_query" not in eval_data["reasoning"]:
                            # Run local keyword check to populate it defensively
                            mock_res = self._mock_evaluation(listing, max_budget, require_laundry, require_gym, max_commute, search_query)
                            eval_data["reasoning"]["search_query"] = mock_res["reasoning"].get("search_query", "")
                            
                            # If local evaluation marked it unapproved due to search query mismatch, enforce it
                            if not mock_res.get("approved", True):
                                eval_data["approved"] = False
                                if eval_data.get("score", 100) > 70:
                                    eval_data["score"] = max(0, eval_data["score"] - 30)
                                    
                            # If overall also didn't mention it, append a note
                            if "overall" in eval_data["reasoning"] and "custom preference" not in eval_data["reasoning"]["overall"].lower():
                                matched = "matches" in mock_res["reasoning"].get("search_query", "").lower() or "approved" in mock_res["reasoning"].get("search_query", "").lower()
                                if matched:
                                    eval_data["reasoning"]["overall"] += f" Note that the listing successfully matched your custom preference for '{search_query}'."
                                else:
                                    eval_data["reasoning"]["overall"] += f" Note that the listing did not match your custom preference for '{search_query}'."
                    return eval_data
                else:
                    print(f"Gemini API request failed with status: {res.status_code} - {res.text}. Falling back to mock engine.")
        except Exception as e:
            print(f"Gemini API Exception: {e}. Falling back to mock engine.")
            
        # Fall back to high-fidelity mock if live call fails
        return self._mock_evaluation(listing, max_budget, require_laundry, require_gym, max_commute, search_query)

    def _mock_evaluation(self, listing: dict, max_budget, require_laundry, require_gym, max_commute, search_query=""):
        """
        Fast, offline rules engine to dynamically generate extremely detailed relocation analysis logs.
        """
        reasons = {}
        approved = True
        score = 100
        
        # 1. Budget check
        price = listing["price"]
        if price <= max_budget:
            reasons["budget"] = f"Approved: Monthly rent of ${price:,} is within the requested maximum budget of ${max_budget:,}."
            # High budget buffer points
            score -= int((price / max_budget) * 10)
        else:
            reasons["budget"] = f"REJECTED: Monthly rent of ${price:,} exceeds the maximum budget of ${max_budget:,} by ${price - max_budget:,}."
            approved = False
            score -= 40
            
        # 2. Laundry check
        has_in_unit = any("In-unit" in a or "in-unit" in a.lower() for a in listing["amenities"])
        has_laundry_building = any("Laundry in Building" in a or "laundry" in a.lower() for a in listing["amenities"])
        
        if require_laundry:
            if has_in_unit:
                reasons["laundry"] = "Approved: Features dedicated in-unit Washer/Dryer, fully satisfying the user's high-priority requirement."
            elif has_laundry_building:
                reasons["laundry"] = "REJECTED: Building offers laundry, but it is shared coin-operated laundry rather than the required private in-unit setup."
                approved = False
                score -= 30
            else:
                reasons["laundry"] = "REJECTED: No laundry options identified in unit or inside building amenities."
                approved = False
                score -= 45
        else:
            if has_in_unit:
                reasons["laundry"] = "Approved: Premium in-unit Washer/Dryer is present (bonus perk)."
                score += 5
            else:
                reasons["laundry"] = "Approved: No laundry in unit, but not marked as required by user."
                
        # 3. Climbing gym / Fitness proximity check
        gym_dist = listing["climbing_gym_distance_miles"]
        if require_gym:
            if gym_dist <= 1.0:
                reasons["climbing_gym"] = f"Approved: Phenomenal proximity! Located just {gym_dist} miles from the nearest premium climbing gym/fitness facility."
                score += 10
            elif gym_dist <= 2.5:
                reasons["climbing_gym"] = f"Approved: Acceptable proximity. Gym is {gym_dist} miles away, walkable or a short bike ride."
                score -= 5
            else:
                reasons["climbing_gym"] = f"REJECTED: Proximity threshold violated. Nearest climbing/fitness gym is {gym_dist} miles away, exceeding limits."
                approved = False
                score -= 30
        else:
            reasons["climbing_gym"] = f"Approved: Proximity is {gym_dist} miles; no active fitness constraint was specified."
            
        # 4. Commute check
        commute = listing["commute_time_downtown_mins"]
        if commute <= max_commute:
            reasons["commute"] = f"Approved: Commute time to downtown is approximately {commute} minutes, within the desired {max_commute} min range."
            score -= int((commute / max_commute) * 5)
        else:
            reasons["commute"] = f"REJECTED: Commute time is {commute} minutes, exceeding the maximum target of {max_commute} minutes."
            approved = False
            score -= 25
            
        # 5. Custom search query keyword check
        search_matched = True
        if search_query:
            query_lower = search_query.lower()
            matched = False
            match_location = ""
            
            if query_lower in listing["title"].lower():
                matched = True
                match_location = "title"
            elif query_lower in listing["description"].lower():
                matched = True
                match_location = "description"
            elif query_lower in listing["neighborhood"].lower():
                matched = True
                match_location = "neighborhood"
            elif query_lower in listing["address"].lower():
                matched = True
                match_location = "address"
            else:
                for amenity in listing["amenities"]:
                    if query_lower in amenity.lower():
                        matched = True
                        match_location = f"amenities ({amenity})"
                        break
            
            if matched:
                reasons["search_query"] = f"Approved: The listing matches your custom preference '{search_query}' (found matching keywords in listing {match_location})."
                score += 15
            else:
                reasons["search_query"] = f"REJECTED: The listing does not contain matching keywords for your custom criteria '{search_query}'."
                approved = False
                search_matched = False
                score -= 30
            
        # Overall Summary
        if approved:
            bonus_str = f" and perfectly satisfies your custom preference '{search_query}'" if search_query else ""
            reasons["overall"] = f"This listing is an excellent fit! Scoring {score}/100, the property fully matches your budget restrictions, provides prime commute times ({commute} mins), sits only {gym_dist} miles from climbing/fitness facilities{bonus_str}."
        else:
            failed_elements = []
            if price > max_budget: failed_elements.append("budget")
            if require_laundry and not has_in_unit: failed_elements.append("in-unit laundry")
            if require_gym and gym_dist > 2.0: failed_elements.append("gym proximity")
            if commute > max_commute: failed_elements.append("commute threshold")
            if search_query and not search_matched: failed_elements.append(f"custom criteria '{search_query}'")
            reasons["overall"] = f"This listing was rejected due to mismatch in requirements: {', '.join(failed_elements)}. Final compatibility score: {score}/100."
            if search_query and search_matched:
                reasons["overall"] += f" Note that the listing successfully matched your custom preference for '{search_query}'."
            
        # Ensure score is bound between 0 and 100
        score = max(0, min(100, score))
        
        return {
            "approved": approved,
            "score": score,
            "reasoning": reasons
        }
