# Rakna

**Rakna** is a real-time smart-parking dashboard for monitoring parking availability, managing zones, and reserving spaces. It pairs a responsive vanilla JavaScript interface with an Express, MongoDB, and Socket.IO backend.

## Highlights

- Secure user registration and JWT-based authentication.
- Role-based access: users reserve spaces while administrators manage zones and slots.
- Live zone and slot updates delivered with Socket.IO.
- Automatic availability, occupancy, and capacity calculations from saved slot data.
- Reservation checkout with Card, Mobile Wallet, or Pay at Parking.
- Frontend and backend validation for reservation data.
- Seed data for four Giza parking zones and a default administrator account.

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Real-time updates | Socket.IO |
| Authentication | JSON Web Tokens, bcrypt |

## Getting started

### Prerequisites

- Node.js 18 or newer
- A MongoDB instance, either local or MongoDB Atlas

### Installation

1. Clone the repository and enter the backend directory.

   ```bash
   git clone <your-repository-url>
   cd Competition/Backend
   ```

2. Install dependencies.

   ```bash
   npm install
   ```

3. Create `Backend/.env` with your configuration.

   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/giza-parking
   JWT_SECRET=replace-with-a-long-random-secret
   JWT_EXPIRES_IN=1h
   PORT=3000
   ```

4. Seed the database with sample zones, slots, and the administrator account.

   ```bash
   npm run seed
   ```

5. Start the application.

   ```bash
   npm start
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser. The Express server serves the frontend automatically.

## Demo administrator account

After running the seed command, sign in with:

```text
Email: admin@test.com
Password: admin123
```

Change these credentials before using the project outside a local demonstration environment.

## Roles and permissions

| Role | Permissions |
| --- | --- |
| User | View live availability and reserve available parking slots. |
| Admin | Create zones and slots, and update slot statuses. |

## Reservation flow

1. Select **Reserve** on an available parking slot.
2. Choose Card, Mobile Wallet, or Pay at Parking.
3. Provide the required payment details when paying by card or wallet.
4. The server validates the request and atomically reserves the slot to prevent duplicate reservations.

> Payment details are validated for demonstration purposes only. Raw card numbers, CVCs, and wallet numbers are never stored. A production implementation should use a PCI-compliant payment provider and tokenization.

## API overview

Protected endpoints require an `Authorization: Bearer <token>` header. Administrator-only endpoints are marked below.

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Register a user. |
| POST | `/api/auth/login` | Sign in and receive a JWT. |
| GET | `/api/areas` | Get parking zones with live slot counts. |
| POST | `/api/areas` | Create a parking zone (admin). |
| GET | `/api/parking/slots` | Get parking slots. |
| POST | `/api/parking/slots` | Create a parking slot (admin). |
| PUT | `/api/parking/slots/:id/status` | Update a slot’s status (admin). |
| POST | `/api/parking/slots/:id/reserve` | Reserve an available parking slot. |

## Tests

Run the backend test suite from `Backend/`:

```bash
npm test
```

## Project structure

```text
Backend/        Express API, MongoDB models, validation, seed data, and tests
Frontend/       Dashboard, authentication pages, styles, and browser scripts
```
