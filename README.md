# Giza Parking Live

A real-time parking dashboard for managing parking zones, monitoring spaces, and reserving available slots. The application has a vanilla HTML/CSS/JavaScript frontend and an Express/MongoDB backend with Socket.IO updates.

## Features

- User registration and JWT authentication.
- Admin dashboard for adding zones and slots, and updating slot status.
- Live zone and slot updates through Socket.IO.
- Dynamic zone totals, availability, occupancy, and capacity status based on saved slot records.
- Slot reservations for users with Card, Mobile wallet, or Pay at parking choices.
- Card and wallet details are validated by the frontend and backend; only the selected payment method is stored.
- Occupied timestamps are set by the backend and shown as live relative time in the dashboard.

## Requirements

- Node.js 18 or later
- MongoDB instance (local or Atlas)

## Setup

1. Create a `.env` file inside `Backend/`:

   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/giza-parking
   JWT_SECRET=replace-with-a-long-random-secret
   JWT_EXPIRES_IN=1h
   PORT=3000
   ```

2. Install backend dependencies:

   ```bash
   cd Backend
   npm install
   ```

3. Seed the database with the default admin, zones, and sample slots:

   ```bash
   npm run seed
   ```

4. Start the application:

   ```bash
   npm start
   ```

5. Open `http://localhost:3000` in a browser.

## Default admin account

After seeding, sign in with:

```text
Email: admin@test.com
Password: admin123
```

## Roles

| Role | Permissions |
| --- | --- |
| User | View live availability and reserve available parking slots. |
| Admin | Add zones and slots, and change a slot status. |

## Reservation flow

1. A user selects **Reserve** on an available slot.
2. The user selects Card, Mobile wallet, or Pay at parking.
3. Card and wallet selections require their corresponding form fields.
4. The backend validates the request and reserves the slot atomically, preventing duplicate reservations.

Raw card numbers, CVCs, and wallet numbers are never persisted. This project validates the details for demonstration purposes; production payments should use a PCI-compliant payment provider and tokenization.

## API overview

All protected endpoints require an `Authorization: Bearer <token>` header.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create a user account. |
| POST | `/api/auth/login` | Sign in and receive a JWT. |
| GET | `/api/areas` | Get zones with live slot counts. |
| POST | `/api/areas` | Create a zone (admin). |
| GET | `/api/parking/slots` | Get all parking slots. |
| POST | `/api/parking/slots` | Create a slot (admin). |
| PUT | `/api/parking/slots/:id/status` | Update slot status (admin). |
| POST | `/api/parking/slots/:id/reserve` | Reserve an available slot. |

## Tests

Run the backend test suite from the `Backend` directory:

```bash
npm test
```

## Project structure

```text
Backend/        Express API, MongoDB models, validation, seed data, and tests
Frontend/       Dashboard, authentication pages, styles, and browser scripts
```
