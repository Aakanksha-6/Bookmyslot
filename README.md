# BookMySlot

A lab slot booking system for college students using AngularJS + TypeScript + MongoDB.

## Features
- Available Slots view with color-coded availability
- My Bookings view filtered by roll number
- Admin Panel to add slots and view all bookings
- MongoDB REST API with slot creation and slot fetching

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start MongoDB locally or set `MONGODB_URI`.
3. Build and run:
   ```bash
   npm run build
   npm start
   ```
4. Open `http://localhost:3000`

## Development
```bash
npm install
npm run dev
```

## API endpoints
- `POST /slot` — create new slot
- `GET /slots` — fetch all slots with availability status
- `POST /book` — book a slot (additional helper endpoint)
- `POST /cancel` — cancel a booking (additional helper endpoint)
- `GET /bookings` — fetch bookings optionally filtered by roll number

