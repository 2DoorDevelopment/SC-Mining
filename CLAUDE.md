# Quantum Yield — Star Citizen Mining Co-op Tool

Star Citizen mining companion app for a two-person crew. Replaces Regolith.Rocks with a narrower scope: work order calculators, refinery timers, session tracking, and crew payout splits. No scouting reports, no rock location features.

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Build:** Vite (`base: '/quantum-yield/'` for GH Pages)
- **Styling:** Tailwind CSS
- **State (local):** Zustand
- **State (shared):** Firebase Firestore (real-time via `onSnapshot`)
- **Routing:** React Router v6 with `HashRouter` (required for GH Pages)
- **Auth:** Firebase anonymous auth (no accounts)
- **Data:** UEX API (`https://api.uexcorp.space/2.0/`) — cached 24h in localStorage
- **Deploy:** GitHub Actions → GH Pages

## Design

Industrial mining-rig HUD aesthetic. Amber/orange accents, dark slate backgrounds, mono headings. Orbitron/similar for headings, Inter for body, JetBrains Mono for numerics. **Mobile-first** — all critical actions one-thumb on a 380px-wide phone.

Color semantics: amber = active/refining, green = ready/profit, red = loss/error, slate = neutral, blue = informational.

## Repo Structure

```
src/
├── main.tsx
├── App.tsx
├── firebase.ts
├── routes/
│   ├── Landing.tsx        # create/join session
│   ├── Session.tsx        # active session shell + bottom nav
│   ├── WorkOrders.tsx
│   ├── Timers.tsx
│   ├── Crew.tsx
│   └── Payouts.tsx
├── components/
│   ├── WorkOrderForm.tsx
│   ├── WorkOrderCard.tsx
│   ├── MethodComparisonTable.tsx
│   ├── TimerCard.tsx
│   ├── CrewMemberRow.tsx
│   ├── PayoutBuilder.tsx
│   └── ui/                # buttons, inputs, cards, toasts
├── hooks/
│   ├── useSession.ts
│   ├── useWorkOrders.ts
│   ├── useCrew.ts
│   ├── useUexData.ts      # cached UEX fetch
│   └── useCountdown.ts
├── lib/
│   ├── refineryMath.ts    # pure calc functions (see below)
│   ├── sessionCode.ts     # wordlist + code generator
│   └── format.ts          # number/time/currency formatters
├── data/
│   ├── refineryMethods.ts # static method definitions — MUST be filled before Phase 2
│   ├── materialSpecs.ts   # station specializations — MUST be filled before Phase 2
│   ├── refineryStations.ts
│   └── sessionWords.ts    # SC-flavored 6–8 letter words for session codes
├── store/
│   └── useAppStore.ts     # Zustand: local UI state
└── styles/
    └── globals.css
```

## Firestore Data Model

```
sessions/{sessionId}
  code, createdAt, createdBy, members[], memberNames{}, shipName, location, status

  workOrders/{workOrderId}
    refineryStation, method, ores[{oreType, rawAmount}]
    quotedYield, quotedCost, quotedTime, sellPrice
    startedAt, completedAt, status: 'planning'|'refining'|'ready'|'sold'
    finalSalePrice

  crewMembers/{memberId}
    name, shares (default 100), role, bonusAUEC

  payouts/{payoutId}
    totalGross, totalExpenses, totalNet
    splits[{memberId, name, shares, amount}], paid
```

## Refinery Math (`src/lib/refineryMath.ts`)

Pure functions, no side effects:

```ts
calcRefinedAmount(rawAmount, oreBaseYield, methodYieldMultiplier, stationSpecYieldBonus) → number
calcRefineryCost(rawAmount, oreBaseCost, methodCostMultiplier, stationCapacityModifier) → number
calcRefineryTime(rawAmount, oreBaseTime, methodSpeedMultiplier, stationCapacityModifier) → number  // seconds
calcGrossSale(refinedAmount, sellPricePerUnit) → number
calcNetProfit(grossSale, refineryCost) → number
calcPayoutSplits(workOrders, crewMembers) → Array<{ memberId, shares, bonusAUEC, amount }>
```

Payout formula: `member.amount = member.bonusAUEC + (totalNet - sum(bonuses)) * (member.shares / sum(allShares))`

## Session Codes

6-letter codes from a curated SC-flavored wordlist (ship names, system names, ore names) in `src/data/sessionWords.ts`. On collision, regenerate. Both code and invite link (`/#/join/{CODE}`) must work for joining.

## UEX API Endpoints

- `GET /commodities_raw_prices` — raw ore sell-to-refinery prices
- `GET /commodities_prices` — refined commodity sell prices
- `GET /refineries_capacities` — refinery workload modifiers

Fetch once on app load, cache in localStorage with 24h TTL. Show "data last updated X hours ago". Manual refresh button.

## Key UX Rules

- Session codes displayed large + "Copy code" button always visible in session header
- "Save this code" notice on create screen — not dismissible on first appearance
- Auto-rejoin: on load, check localStorage `lastSessionCode`, rejoin if session+UID still valid
- All aUEC values: `Intl.NumberFormat` with comma separators, JetBrains Mono font
- Times: HH:MM:SS under 24h, "1d 4h 23m" beyond
- Timer source of truth: `startedAt + quotedTime - now()` from Firestore, not local state
- Every work order has "Was the in-game quote different? Click to override" for multiplier corrections
- Swipe left = delete (with undo toast), swipe right = quick action on list items

## Environment Variables

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Copy `.env.example` → `.env.local` for local dev. These also go in GitHub repo secrets for the deployed build.

## Build & Deploy

```bash
npm install
npm run dev       # http://localhost:5173/quantum-yield/
npm run build
```

GH Actions workflow (`.github/workflows/deploy.yml`): checkout → Node 20 → `npm ci` → `npm run build` → deploy `dist/` to GH Pages via `actions/deploy-pages@v4`.

After first deploy: add `<username>.github.io` to Firebase Auth → Settings → Authorized domains.

## Phase Order

1. **Phase 0** — Vite + React + TS + Tailwind scaffold, ESLint/Prettier, empty deploy workflow
2. **Phase 1** — Firebase wiring, anonymous auth, create/join session, real-time lobby
   - **Gate:** confirm real-time updates work across two browser tabs before Phase 2
3. **Phase 2** — Work order calculator + method comparison table
   - **Gate:** `src/data/refineryMethods.ts` and `src/data/materialSpecs.ts` must be filled with current in-game values (manual step) before starting
4. **Phase 3** — Refinery timers (live countdown cards, browser notifications, mark sold)
5. **Phase 4** — Crew management + payout splits + Discord text export
6. **Phase 5** — PWA, offline support, mobile bottom-nav, settings, polish

## Out of Scope (v1)

Scouting reports, rock location sharing, loadout planner, org-level management, voice/Discord integration, trade routes, email/password auth, analytics.
