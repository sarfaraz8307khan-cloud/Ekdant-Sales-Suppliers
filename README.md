# Tyre Management System — Ekdant Sales & Suppliers

A production-quality, mobile-first tyre lifecycle management system for commercial vehicle fleets.

Tracks every physical tyre from **Purchase → Inventory → Installation → Usage → Removal → Reinstallation/Reuse → Final Disposal**.

---

## Product Overview

This application manages the complete lifecycle of commercial vehicle tyres:

- **Dynamic vehicle configurations** — vehicle types, axles, and tyre positions are fully data-driven. No hard-coded tyre layouts.
- **Individual tyre tracking** — every physical tyre has its own record (e.g. `TYR-000001`) and complete lifecycle history.
- **Purchase & inventory management** — purchases create individual tyre records atomically; inventory is derived from authoritative tyre records.
- **Installation & replacement workflows** — guided mobile-first flows with full validation and atomic transactions.
- **Vehicle history** — current layout, current tyres, historical tyres, replacement history, and tyre expenditure per vehicle.
- **Vendor & driver management** — business entities, not system users.
- **Search, filtering, reports, dashboard analytics, and audit logging.**

The default business name is **Ekdant Sales & Suppliers** and is configurable from **Settings → Company Information**.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + React + TypeScript |
| Backend | Next.js Server Actions (route handlers / server components) |
| Database | SQLite (via Prisma + better-sqlite3 adapter) |
| ORM | Prisma ORM with generated client |
| Validation | Server-side validation in actions + client-side form checks |
| Styling | Tailwind CSS v4 + custom design system |
| Charts | None (dashboard uses KPI cards, not decorative charts) |
| File storage | Local filesystem (`public/uploads`) with compression-ready pipeline |

### Why this stack

- **Next.js + TypeScript** — single codebase for UI, API (server actions), and business logic; excellent mobile-first responsive support.
- **SQLite + Prisma** — zero-configuration persistent database ideal for a single-administrator deployment; can migrate to PostgreSQL later by changing the datasource.
- **Tailwind CSS** — fast, consistent, accessible design system with a premium SaaS feel.
- **Server Actions** — transactional business logic runs on the server; the client never trusts client-side rules.

---

## Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Dashboard
│   ├── vehicles/           # Vehicle list + detail (dynamic tyre layout)
│   ├── inventory/          # Tyre inventory
│   ├── purchases/          # Purchase workflow
│   ├── tyre-history/       # Individual tyre lifecycle
│   ├── vendors/            # Vendor management
│   ├── drivers/            # Driver management
│   ├── tyre-models/        # Tyre model master
│   ├── vehicle-configurations/  # Vehicle types, axles, positions
│   ├── reports/            # Real database-backed reports
│   └── settings/           # Company info & application settings
├── components/
│   ├── layout/             # App shell, navigation (sidebar + bottom nav)
│   └── ui/                 # Reusable design-system components
├── lib/
│   ├── db.ts               # Prisma client (singleton)
│   ├── audit.ts            # Activity log helper
│   ├── format.ts           # Currency/date formatting
│   ├── navigation.ts       # Navigation config
│   ├── types.ts            # Shared types
│   └── utils.ts            # Utilities
└── generated/prisma/       # Generated Prisma client
```

### Separation of concerns

- **UI** — React components in `src/components`
- **Pages** — `src/app/*`
- **Business logic** — Server Actions (`actions.ts` files) with transactional boundaries
- **Database access** — Prisma client in `src/lib/db.ts`
- **Validation** — inline server-side validation in actions
- **Types** — `src/lib/types.ts` + Prisma-generated types

---

## Core Data Model

### Master data

- **VehicleType** — name, axle count, tyre count, status; defines the dynamic configuration.
- **Axle** — belongs to a vehicle type; axle number, name, sequence, status.
- **TyrePosition** — belongs to an axle + vehicle type; position ID, display name, short code, side (LEFT/RIGHT/CENTER), sequence, position type (STEERING/DRIVE/TRAILER/LIFT/OTHER), status.
- **TyreModel** — brand, name, size, description, minimum stock level, status; compatible vehicle types via `TyreModelVehicleType`.
- **Vendor** — name, contact person, phone, email, address, GST number, notes, status.
- **Driver** — name, phone, licence number, address, notes, status. Business record only — not a system user.

### Transactional data

- **Purchase** — bill number, vendor, purchase date, tax, discount, final amount, bill photo, notes, status.
- **PurchaseItem** — model, quantity, unit price, tax, discount, subtotal, total.
- **Tyre** — internal ID (`TYR-000001`), optional serial number, model, purchase reference, vendor, purchase date, unit price, status, current vehicle/position/installation links.
- **Installation** — tyre, vehicle, position, driver, installed date, odometer, notes, photo, current flag, removal info (date, odometer, reason, notes, photo).
- **RemovalReason** — configurable reasons (Worn Out, Damage, Burst, Retread, Scrap, etc.).
- **TyreLifecycleEvent** — full timeline per tyre (PURCHASED, INSTALLED, REMOVED, REPLACED, STATUS_CHANGED, RESERVED, UNRESERVED).
- **OdometerReading** — authoritative odometer history with override support.
- **ActivityLog** — audit trail of significant changes.

### Key relationships

```
VehicleType 1─N Axle 1─N TyrePosition
VehicleType 1─N Vehicle
Vehicle 1─N Installation N─1 Tyre
Tyre 1─N TyreLifecycleEvent
Purchase 1─N PurchaseItem 1─N Tyre
Vendor 1─N Purchase / Tyre
Driver 1─N Vehicle / Installation
```

### Integrity rules

- Vehicle registration number is unique.
- Tyre internal ID is unique.
- `(billNumber, vendorId)` is unique.
- `(brand, name, size)` is unique per tyre model.
- `(vehicleTypeId, positionId)` is unique per position.
- A position can only have **one current installation** at a time (enforced by application transaction logic).
- Inventory is **derived** from tyre records — never maintained through fragile counters.

---

## Tyre Status Lifecycle

```
AVAILABLE → INSTALLED
INSTALLED → REMOVED
REMOVED   → AVAILABLE   (reuse)
REMOVED   → WORN_OUT
REMOVED   → DAMAGED
REMOVED   → SCRAPPED
```

Status transitions are enforced in server actions. Arbitrary status manipulation is not allowed.

---

## Key Business Rules

### Purchase transaction (atomic)

1. Create purchase.
2. Create purchase item(s).
3. Create one `Tyre` record per physical tyre.
4. Generate unique internal tyre IDs (`TYR-000001`, ...).
5. Set each tyre to `AVAILABLE`.
6. Associate tyres with purchase/vendor/model.
7. Record lifecycle events + activity log.
8. Commit — any failure rolls back the entire purchase.

### Installation transaction (atomic)

1. Validate tyre is `AVAILABLE`, model is active, vehicle is active, position belongs to the vehicle's configuration, position is empty, tyre is compatible, odometer is valid.
2. Create installation record.
3. Update tyre → `INSTALLED`, link to vehicle/position/driver.
4. Record lifecycle event + activity log.

### Replacement transaction (atomic)

1. Validate current tyre + replacement tyre.
2. Close current installation (removal date, odometer, reason, notes).
3. Update old tyre status, free the position.
4. Create new installation, mark replacement tyre `INSTALLED`.
5. Record lifecycle events + activity log.
6. Any failure rolls back everything — never a half-replaced position.

### Odometer validation

- New reading must be `>=` previous reading.
- Lower readings are blocked by default with an explanation.
- Explicit override is allowed only with a documented reason, recorded in the audit log.

### Delete policy

- Transactional records are **never permanently deleted**.
- Master data uses `ACTIVE` / `INACTIVE` / `ARCHIVED` statuses.
- Historical data remains accessible.

---

## Setup

### Prerequisites

- Node.js 20+ (tested on Node 24)
- npm

### 1. Install dependencies

```bash
npm install
```

### 2. Generate the Prisma client

```bash
npx prisma generate
```

### 3. Create the database and run migrations

```bash
npx prisma migrate dev --name init
```

### 4. Seed demo data (optional but recommended)

```bash
npx prisma db seed
```

Seed data includes:

- 4 vehicle types (12-, 13-, 14-, 16-tyre configurations)
- 5 tyre models (MRF, CEAT, Apollo, JK Tyre)
- 3 vendors
- 4 drivers
- 4 vehicles
- 32 individual tyres
- 3 purchases
- 12 current installations + 1 historical replacement

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

This project uses SQLite with a local file (`dev.db`) — no environment variables are required for local development.

| Variable | Purpose | Required |
|----------|---------|----------|
| *(none)* | SQLite file-based database | — |

If migrating to PostgreSQL later, set `DATABASE_URL` in `prisma.config.ts` / `.env` and update the datasource provider.

---

## Database Setup & Migrations

- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`
- Config: `prisma.config.ts`

```bash
# Create a new migration after schema changes
npx prisma migrate dev --name <migration-name>

# Apply migrations in production
npx prisma migrate deploy

# Regenerate client after schema changes
npx prisma generate
```

---

## Local Development

```bash
npm run dev
```

- Mobile-first responsive UI — test with browser devtools device emulation.
- Bottom navigation on mobile; sidebar on desktop.
- All business logic runs in server actions with transactional integrity.

---

## Testing

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Production build
npm run build
```

### Manual test scenarios

1. **Purchase** — create a purchase with 10 tyres → inventory increases by 10.
2. **Install** — install 1 tyre → available −1, installed +1.
3. **Replace** — replace a tyre → old tyre becomes removed, new tyre installed, position occupied by new tyre.
4. **Invalid cases** — installing an already-installed tyre, incompatible tyre, occupied position, inactive model, negative inventory, invalid odometer — all must be rejected.
5. **History** — replacement/removal never destroys prior history.

---

## Production Build

```bash
npm run build
npm run start
```

---

## Deployment Notes

### SQLite (single instance)

- Deploy to any Node.js host (VPS, Railway, Render, Fly.io).
- Ensure the `dev.db` file is on persistent storage (not ephemeral).
- Back up `dev.db` regularly.

### PostgreSQL (multi-instance / scale)

1. Change `datasource db { provider = "sqlite" }` → `provider = "postgresql"` in `prisma/schema.prisma`.
2. Set `DATABASE_URL` in `prisma.config.ts`.
3. Run `npx prisma migrate deploy`.
4. Update `src/lib/db.ts` to use the standard Prisma client without the better-sqlite3 adapter.

### File uploads

- Uploads are stored under `public/uploads/`.
- In production, mount a persistent volume at that path, or move to S3-compatible object storage.

---

## Business Rules & Notes

- **Removed tyres can be reused** — a removed tyre can return to `AVAILABLE` and be reinstalled.
- **Tyres can move between vehicles** — installation is per vehicle/position; a tyre's history records every vehicle it has been on.
- **Tyre compatibility** is based on the **tyre model's compatible vehicle types** (configured per model).
- **Tax is exclusive** — `Final Amount = Subtotal + Tax − Discount`.
- **Odometer overrides are allowed** but require an explicit documented reason and are audit-logged.
- **Drivers are business records**, not application users. Authentication can be added later without a rewrite.

---

## License

Internal business application for **Ekdant Sales & Suppliers**.