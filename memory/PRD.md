# AEROSHARE - Airport Taxi Ride Sharing App

## Product Overview
AeroShare is a global mobile-first web app for sharing airport taxi rides. Users find co-riders heading to the same airport within a 15km radius and 60-minute time window, pay a £1.99 match fee via Stripe, and coordinate via group chat.

## Core Features
1. **Auth**: Email/password JWT authentication (register, login, logout)
2. **Landing Page**: Animated flight map background with ambient music, dark theme
3. **Ride Creation**: GPS location detection, airport selection (17 global airports), flight date/time
4. **Payment Wall**: £1.99 GBP non-refundable Stripe checkout (must pay before seeing matches)
5. **Matching Engine**: Haversine distance algorithm (15km radius) + 60-minute flight time window
6. **Chat**: Group chat for matched riders to coordinate taxi sharing
7. **Waiting List**: Radar animation screen, in-app sound notification on match
8. **Notifications**: Match found alerts with audio ping
9. **My Rides**: Ride history with status badges (pending, searching, waiting, matched)
10. **Profile**: User info, stats display, logout

## Tech Stack
- **Frontend**: Expo React Native (SDK 54), expo-router, expo-location, expo-audio
- **Backend**: FastAPI (Python), JWT auth, bcrypt
- **Database**: MongoDB (users, rides, payment_transactions, messages, notifications)
- **Payment**: Stripe via emergentintegrations library (test key)
- **Design**: Swiss high-contrast brutalist, taxi yellow (#FDE047) accent, dark login theme

## Database Schema
### Users
- email, password_hash, name, role, created_at

### Rides
- user_id, user_name, user_email, origin_lat, origin_lng, origin_address, airport_code, airport_name, flight_time, status, payment_status, matched_ride_id, created_at

### Payment Transactions
- session_id, ride_id, user_id, user_email, amount, currency, payment_status, metadata, created_at

### Messages
- ride_id, user_id, user_name, content, created_at

### Notifications
- user_id, ride_id, type, message, read, created_at

## API Endpoints
- POST /api/auth/register, /api/auth/login, /api/auth/logout
- GET /api/auth/me
- GET /api/airports
- POST /api/rides, GET /api/rides/my, GET /api/rides/{id}
- POST /api/payments/create-checkout, GET /api/payments/status/{session_id}
- POST /api/webhook/stripe
- POST /api/rides/{id}/messages, GET /api/rides/{id}/messages
- GET /api/rides/{id}/check-match
- GET /api/notifications, POST /api/notifications/{id}/read

## Business Enhancement
- Consider tiered pricing by distance (£1.99 for <15km, £2.99 for <30km) to increase ARPU
- Add referral system ("Invite a friend, both get next match free") for viral growth
