from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import bcrypt
import jwt
import secrets
import math
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# JWT config
JWT_ALGORITHM = "HS256"

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

# Password utilities
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# --- Pydantic Models ---
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class RideRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    origin_address: str
    airport_code: str
    airport_name: str
    flight_time: str  # ISO format

class CreateCheckoutRequest(BaseModel):
    ride_id: str
    origin_url: str

class MessageRequest(BaseModel):
    content: str

# --- Airport Data ---
AIRPORTS = [
    {"code": "LHR", "name": "London Heathrow", "lat": 51.4700, "lng": -0.4543, "country": "UK"},
    {"code": "LGW", "name": "London Gatwick", "lat": 51.1537, "lng": -0.1821, "country": "UK"},
    {"code": "STN", "name": "London Stansted", "lat": 51.8860, "lng": 0.2389, "country": "UK"},
    {"code": "LTN", "name": "London Luton", "lat": 51.8747, "lng": -0.3683, "country": "UK"},
    {"code": "MAN", "name": "Manchester", "lat": 53.3588, "lng": -2.2727, "country": "UK"},
    {"code": "EDI", "name": "Edinburgh", "lat": 55.9508, "lng": -3.3615, "country": "UK"},
    {"code": "BHX", "name": "Birmingham", "lat": 52.4539, "lng": -1.7480, "country": "UK"},
    {"code": "JFK", "name": "New York JFK", "lat": 40.6413, "lng": -73.7781, "country": "US"},
    {"code": "LAX", "name": "Los Angeles LAX", "lat": 33.9416, "lng": -118.4085, "country": "US"},
    {"code": "ORD", "name": "Chicago O'Hare", "lat": 41.9742, "lng": -87.9073, "country": "US"},
    {"code": "CDG", "name": "Paris Charles de Gaulle", "lat": 49.0097, "lng": 2.5479, "country": "FR"},
    {"code": "FRA", "name": "Frankfurt", "lat": 50.0379, "lng": 8.5622, "country": "DE"},
    {"code": "AMS", "name": "Amsterdam Schiphol", "lat": 52.3105, "lng": 4.7683, "country": "NL"},
    {"code": "DXB", "name": "Dubai International", "lat": 25.2532, "lng": 55.3657, "country": "AE"},
    {"code": "SIN", "name": "Singapore Changi", "lat": 1.3644, "lng": 103.9915, "country": "SG"},
    {"code": "HND", "name": "Tokyo Haneda", "lat": 35.5494, "lng": 139.7798, "country": "JP"},
    {"code": "SYD", "name": "Sydney Kingsford Smith", "lat": -33.9461, "lng": 151.1772, "country": "AU"},
]

# --- Haversine Distance ---
def haversine_km(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))

# --- Auth Routes ---
@api_router.post("/auth/register")
async def register(req: RegisterRequest, response: Response):
    email = req.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(400, "Email already registered")
    user_doc = {
        "name": req.name.strip(),
        "email": email,
        "password_hash": hash_password(req.password),
        "role": "user",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {"id": user_id, "name": req.name.strip(), "email": email, "role": "user", "access_token": access_token}

@api_router.post("/auth/login")
async def login(req: LoginRequest, response: Response):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(401, "Invalid credentials")
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {"id": user_id, "name": user["name"], "email": email, "role": user.get("role", "user"), "access_token": access_token}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

# --- Airport Routes ---
@api_router.get("/airports")
async def get_airports():
    return AIRPORTS

# --- Ride Routes ---
@api_router.post("/rides")
async def create_ride(req: RideRequest, request: Request):
    user = await get_current_user(request)
    try:
        flight_time = datetime.fromisoformat(req.flight_time.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(400, "Invalid flight time format")

    ride_doc = {
        "user_id": user["_id"],
        "user_name": user["name"],
        "user_email": user["email"],
        "origin_lat": req.origin_lat,
        "origin_lng": req.origin_lng,
        "origin_address": req.origin_address,
        "airport_code": req.airport_code,
        "airport_name": req.airport_name,
        "flight_time": flight_time,
        "status": "pending_payment",
        "payment_status": "unpaid",
        "matched_ride_id": None,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.rides.insert_one(ride_doc)
    ride_id = str(result.inserted_id)
    return {"ride_id": ride_id, "status": "pending_payment"}

@api_router.get("/rides/my")
async def get_my_rides(request: Request):
    user = await get_current_user(request)
    rides = await db.rides.find({"user_id": user["_id"]}).sort("created_at", -1).to_list(50)
    result = []
    for r in rides:
        ride_data = {
            "id": str(r["_id"]),
            "origin_address": r["origin_address"],
            "airport_code": r["airport_code"],
            "airport_name": r["airport_name"],
            "flight_time": r["flight_time"].isoformat() if isinstance(r["flight_time"], datetime) else r["flight_time"],
            "status": r["status"],
            "payment_status": r["payment_status"],
            "matched_ride_id": r.get("matched_ride_id"),
            "created_at": r["created_at"].isoformat() if isinstance(r["created_at"], datetime) else r["created_at"],
        }
        result.append(ride_data)
    return result

@api_router.get("/rides/{ride_id}")
async def get_ride(ride_id: str, request: Request):
    await get_current_user(request)
    ride = await db.rides.find_one({"_id": ObjectId(ride_id)})
    if not ride:
        raise HTTPException(404, "Ride not found")
    # Get matched riders
    matched_users = []
    if ride.get("matched_ride_id"):
        matched_ride = await db.rides.find_one({"_id": ObjectId(ride["matched_ride_id"])})
        if matched_ride:
            matched_users.append({"name": matched_ride["user_name"], "origin_address": matched_ride["origin_address"]})
    # Also find rides matched TO this one
    back_matches = await db.rides.find({"matched_ride_id": ride_id}).to_list(20)
    for m in back_matches:
        if str(m["_id"]) != ride_id:
            matched_users.append({"name": m["user_name"], "origin_address": m["origin_address"]})

    return {
        "id": str(ride["_id"]),
        "user_name": ride["user_name"],
        "origin_address": ride["origin_address"],
        "airport_code": ride["airport_code"],
        "airport_name": ride["airport_name"],
        "flight_time": ride["flight_time"].isoformat() if isinstance(ride["flight_time"], datetime) else ride["flight_time"],
        "status": ride["status"],
        "payment_status": ride["payment_status"],
        "matched_ride_id": ride.get("matched_ride_id"),
        "matched_users": matched_users,
        "created_at": ride["created_at"].isoformat() if isinstance(ride["created_at"], datetime) else ride["created_at"],
    }

# --- Payment Routes ---
RIDE_FEE = 1.99  # GBP

@api_router.post("/payments/create-checkout")
async def create_checkout(req: CreateCheckoutRequest, request: Request):
    user = await get_current_user(request)
    ride = await db.rides.find_one({"_id": ObjectId(req.ride_id)})
    if not ride:
        raise HTTPException(404, "Ride not found")
    if ride["user_id"] != user["_id"]:
        raise HTTPException(403, "Not your ride")
    if ride["payment_status"] == "paid":
        raise HTTPException(400, "Already paid")

    api_key = os.environ["STRIPE_API_KEY"]
    host_url = req.origin_url.rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    success_url = f"{host_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}&ride_id={req.ride_id}"
    cancel_url = f"{host_url}/payment-cancel?ride_id={req.ride_id}"

    checkout_req = CheckoutSessionRequest(
        amount=RIDE_FEE,
        currency="gbp",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"ride_id": req.ride_id, "user_id": user["_id"], "user_email": user["email"]}
    )
    session = await stripe_checkout.create_checkout_session(checkout_req)

    # Create payment transaction record
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "ride_id": req.ride_id,
        "user_id": user["_id"],
        "user_email": user["email"],
        "amount": RIDE_FEE,
        "currency": "gbp",
        "payment_status": "initiated",
        "metadata": {"ride_id": req.ride_id, "user_id": user["_id"]},
        "created_at": datetime.now(timezone.utc),
    })

    return {"checkout_url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def check_payment_status(session_id: str, request: Request):
    await get_current_user(request)

    txn = await db.payment_transactions.find_one({"session_id": session_id})
    if not txn:
        raise HTTPException(404, "Transaction not found")

    # If already processed, return cached status
    if txn["payment_status"] == "paid":
        return {"payment_status": "paid", "ride_id": txn["ride_id"]}

    api_key = os.environ["STRIPE_API_KEY"]
    http_request = request
    host_url = str(http_request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    status = await stripe_checkout.get_checkout_status(session_id)

    if status.payment_status == "paid":
        # Update payment transaction
        await db.payment_transactions.update_one(
            {"session_id": session_id, "payment_status": {"$ne": "paid"}},
            {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc)}}
        )
        # Update ride status and run matching
        ride_id = txn["ride_id"]
        await db.rides.update_one(
            {"_id": ObjectId(ride_id)},
            {"$set": {"payment_status": "paid", "status": "searching"}}
        )
        # Run matching
        await match_ride(ride_id)

        return {"payment_status": "paid", "ride_id": ride_id}
    elif status.status == "expired":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "expired", "updated_at": datetime.now(timezone.utc)}}
        )
        return {"payment_status": "expired", "ride_id": txn["ride_id"]}
    else:
        return {"payment_status": "pending", "ride_id": txn["ride_id"]}

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    api_key = os.environ["STRIPE_API_KEY"]
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            await db.payment_transactions.update_one(
                {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc)}}
            )
            txn = await db.payment_transactions.find_one({"session_id": session_id})
            if txn:
                ride_id = txn["ride_id"]
                await db.rides.update_one(
                    {"_id": ObjectId(ride_id)},
                    {"$set": {"payment_status": "paid", "status": "searching"}}
                )
                await match_ride(ride_id)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# --- Matching Logic ---
async def match_ride(ride_id: str):
    ride = await db.rides.find_one({"_id": ObjectId(ride_id)})
    if not ride:
        return

    flight_time = ride["flight_time"]
    time_window_start = flight_time - timedelta(minutes=30)
    time_window_end = flight_time + timedelta(minutes=30)

    # Find potential matches: same airport, within time window, paid, searching
    candidates = await db.rides.find({
        "_id": {"$ne": ObjectId(ride_id)},
        "airport_code": ride["airport_code"],
        "payment_status": "paid",
        "status": {"$in": ["searching", "waiting"]},
        "flight_time": {"$gte": time_window_start, "$lte": time_window_end},
    }).to_list(100)

    best_match = None
    best_distance = float('inf')

    for c in candidates:
        dist = haversine_km(ride["origin_lat"], ride["origin_lng"], c["origin_lat"], c["origin_lng"])
        if dist <= 15 and dist < best_distance:
            best_distance = dist
            best_match = c

    if best_match:
        match_id = str(best_match["_id"])
        # Update both rides
        await db.rides.update_one({"_id": ObjectId(ride_id)}, {"$set": {"status": "matched", "matched_ride_id": match_id}})
        await db.rides.update_one({"_id": ObjectId(match_id)}, {"$set": {"status": "matched", "matched_ride_id": ride_id}})

        # Create notification for the other user
        await db.notifications.insert_one({
            "user_id": best_match["user_id"],
            "ride_id": match_id,
            "type": "match_found",
            "message": f"Match found! {ride['user_name']} is heading to {ride['airport_name']} too!",
            "read": False,
            "created_at": datetime.now(timezone.utc),
        })
        # Also notify current user
        await db.notifications.insert_one({
            "user_id": ride["user_id"],
            "ride_id": ride_id,
            "type": "match_found",
            "message": f"Match found! {best_match['user_name']} is heading to {ride['airport_name']} too!",
            "read": False,
            "created_at": datetime.now(timezone.utc),
        })
    else:
        # Put on waiting list
        await db.rides.update_one({"_id": ObjectId(ride_id)}, {"$set": {"status": "waiting"}})

# --- Notifications ---
@api_router.get("/notifications")
async def get_notifications(request: Request):
    user = await get_current_user(request)
    notifs = await db.notifications.find({"user_id": user["_id"]}).sort("created_at", -1).to_list(50)
    result = []
    for n in notifs:
        result.append({
            "id": str(n["_id"]),
            "ride_id": n.get("ride_id"),
            "type": n["type"],
            "message": n["message"],
            "read": n["read"],
            "created_at": n["created_at"].isoformat() if isinstance(n["created_at"], datetime) else n["created_at"],
        })
    return result

@api_router.post("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, request: Request):
    await get_current_user(request)
    await db.notifications.update_one({"_id": ObjectId(notif_id)}, {"$set": {"read": True}})
    return {"status": "ok"}

# --- Chat / Messages ---
@api_router.post("/rides/{ride_id}/messages")
async def send_message(ride_id: str, req: MessageRequest, request: Request):
    user = await get_current_user(request)
    ride = await db.rides.find_one({"_id": ObjectId(ride_id)})
    if not ride:
        raise HTTPException(404, "Ride not found")

    msg_doc = {
        "ride_id": ride_id,
        "user_id": user["_id"],
        "user_name": user["name"],
        "content": req.content,
        "created_at": datetime.now(timezone.utc),
    }
    await db.messages.insert_one(msg_doc)
    return {"status": "sent"}

@api_router.get("/rides/{ride_id}/messages")
async def get_messages(ride_id: str, request: Request):
    await get_current_user(request)
    messages = await db.messages.find({"ride_id": ride_id}).sort("created_at", 1).to_list(200)
    result = []
    for m in messages:
        result.append({
            "id": str(m["_id"]),
            "user_id": m["user_id"],
            "user_name": m["user_name"],
            "content": m["content"],
            "created_at": m["created_at"].isoformat() if isinstance(m["created_at"], datetime) else m["created_at"],
        })
    return result

# --- Ride Check (for polling) ---
@api_router.get("/rides/{ride_id}/check-match")
async def check_match(ride_id: str, request: Request):
    await get_current_user(request)
    ride = await db.rides.find_one({"_id": ObjectId(ride_id)})
    if not ride:
        raise HTTPException(404, "Ride not found")

    # Re-run matching if still waiting
    if ride["status"] == "waiting":
        await match_ride(ride_id)
        ride = await db.rides.find_one({"_id": ObjectId(ride_id)})

    return {
        "status": ride["status"],
        "matched_ride_id": ride.get("matched_ride_id"),
    }

# --- Health ---
@api_router.get("/")
async def root():
    return {"message": "AeroShare API running"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.rides.create_index("airport_code")
    await db.rides.create_index("flight_time")
    await db.payment_transactions.create_index("session_id")
    await db.messages.create_index("ride_id")
    await db.notifications.create_index("user_id")
    await seed_admin()
    logger.info("AeroShare API started")

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@aeroshare.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
        })
        logger.info(f"Admin seeded: {admin_email}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
