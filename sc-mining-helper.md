# Quantum Yield — Star Citizen Mining Co-op Tool

**Spec document for Claude Code implementation**
**Author:** Noah
**Target:** Mobile-first React 18 + TypeScript + Vite + Tailwind static site, deployed to GitHub Pages, with Firebase Firestore for shared session state.

---

## 1. Project Overview

A Star Citizen mining companion app replacing the soon-to-be-shutdown Regolith.Rocks for a two-person crew (Noah + friend). Scope is deliberately narrower than Regolith — we are building only the features actively used: **work order calculators, refinery timers, session tracking, and crew payout splits.** Scouting reports and rock-location features are explicitly out of scope.

Sharing model is **shareable session codes**: one user creates a session, the other joins via a short code, and both see the same data in real-time (Firestore handles sync automatically — better than Regolith's manual share model).

### Design vibe

Pick **one** aesthetic and commit to it across the whole app. Suggested: industrial mining-rig HUD — amber/orange accents (Regolith's color), dark slate backgrounds, mono headings, slight Aegis/Greycat industrial feel. Different enough from Holo-Manifest's likely sci-fi-fleet look that the two apps feel like distinct tools. Use Orbitron or similar for headings, Inter for body, JetBrains Mono for numerics. Mobile-first, all critical actions must work one-thumb on a phone — this gets used between mining runs, often on a second screen.

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | React 18 + TypeScript | Matches Holo-Manifest, familiar territory |
| Build | Vite | Fast, GH Pages friendly |
| Styling | Tailwind CSS | Same as Holo-Manifest |
| State (local) | Zustand | Tiny, simple, beats Context+Reducer here |
| State (shared) | Firebase Firestore | Free tier, real-time, no backend to run |
| Routing | React Router v6 | Hash router for GH Pages compat |
| Data source | UEX API (uexcorp.space) | Refinery + commodity data, updated against current patches |
| Deploy | GitHub Actions → GH Pages | Same as Holo-Manifest |
| Auth | Firebase anonymous auth | No accounts, just stable user IDs |

### Why Firebase over alternatives

- Free tier: 50k reads/20k writes/1GB storage per day — vastly more than two people will ever use.
- Real-time listeners built in — `onSnapshot` and the UI updates automatically.
- Anonymous auth gives every user a stable UID without making them sign up.
- The only setup is creating a project in console.firebase.google.com and pasting the config into `.env`. Firestore security rules will be in the repo.

### GH Pages routing note

Use `HashRouter`, not `BrowserRouter`. GH Pages will 404 on any path other than `/` otherwise. Vite config needs `base: '/quantum-yield/'` (or whatever the repo name is) for asset paths to resolve.

---

## 3. Data Model

### 3.1 Firestore collections

```
sessions/
  {sessionId}/
    - code: string              // 6-char human-readable, e.g. "TIBURON"
    - createdAt: timestamp
    - createdBy: string         // firebase anon uid
    - members: string[]         // array of uids
    - memberNames: { [uid]: string }
    - shipName: string          // optional, e.g. "Prospector"
    - location: string          // optional, e.g. "ARC-L1 Refinery"
    - status: 'active' | 'completed' | 'archived'

    workOrders/
      {workOrderId}/
        - createdAt, createdBy, name
        - refineryStation: string
        - method: string                  // 'Dinyx Solventation' etc
        - ores: [{ oreType, rawAmount }]
        - quotedYield, quotedCost, quotedTime  // user-entered from in-game quote
        - sellPrice: number                    // estimated aUEC/unit refined
        - startedAt: timestamp | null
        - completedAt: timestamp | null
        - status: 'planning' | 'refining' | 'ready' | 'sold'
        - finalSalePrice: number | null

    crewMembers/
      {memberId}/
        - name: string
        - shares: number          // default 100
        - role: string            // free text, "Pilot", "Turret", etc
        - bonusAUEC: number       // flat bonus before split

    payouts/
      {payoutId}/
        - createdAt
        - totalGross: number      // sum of work order sales
        - totalExpenses: number   // refinery costs etc
        - totalNet: number
        - splits: [{ memberId, name, shares, amount }]
        - paid: boolean
```

### 3.2 Local-only state (Zustand)

- Current session ID + join code
- User's display name (persisted to localStorage)
- UI preferences (last-used refinery, last-used method, etc)
- Cached UEX data with timestamp

### 3.3 Reference data (static + UEX)

UEX provides current refinery method multipliers and commodity prices via API: `https://api.uexcorp.space/2.0/`. Endpoints to use:

- `GET /commodities_raw_prices` — raw ore sell-to-refinery prices
- `GET /commodities_prices` — refined commodity sell prices
- `GET /refineries_capacities` — refinery workload modifiers
- See https://uexcorp.space/api/documentation for full schema

**Strategy:** On app load, fetch UEX data once, cache in localStorage with 24h TTL. Show a "data last updated X hours ago" indicator. Provide a manual "refresh data" button. This keeps the app functional offline and minimizes API hits.

For refinery **methods** (Dinyx Solventation, Cormack, Ferron Exchange, etc.) and their cost/yield/speed multipliers, hardcode these in a `refineryMethods.ts` constants file — they change only with patches and need manual verification against in-game data anyway. Pull current values from Regolith before it goes down (`https://regolith.rocks/tables/refinery`) and from the TEST Squadron guide as a cross-reference.

---

## 4. Features (Phased Build Plan)

### Phase 0 — Project scaffolding & data capture

- Vite + React + TS + Tailwind scaffold
- Repo structure (see §6)
- ESLint + Prettier config matching Holo-Manifest
- Empty GH Actions deploy workflow
- **Data capture task:** before Regolith shuts down, manually copy the refinery method multipliers and material specializations into `src/data/refineryMethods.ts` and `src/data/materialSpecs.ts`. This is a one-time human step but **must happen before Phase 2**.

### Phase 1 — Firebase wiring & session management

- Firebase project setup instructions in README (see §11)
- `.env.example` with `VITE_FIREBASE_*` keys
- Anonymous auth on app load, persist UID
- Create session → generate human-readable 6-letter code (use a word list, not random chars — "TIBURON" beats "X7K2Q9"), write to Firestore
- Join session by code → look up `sessionId` by `code` field, add UID to `members`
- **Both share methods exposed:** after creating a session, the lobby shows the code in large mono type alongside a "Copy invite link" button. The link format is `<base-url>/#/join/{CODE}` — opening it auto-fills and submits the join form. Build both; they're the same underlying mechanism.
- **Session code save reminder:** on the create-session screen and persistently in the session header, surface a clear "Save this code — you'll need it to rejoin from another browser or after clearing site data" notice. A one-click "Copy code" button next to it. Don't make this dismissible on first appearance — the user should actively see it once before it becomes background UI.
- **Auto-rejoin last session:** on app load, after anonymous auth resolves, check localStorage for `lastSessionCode`. If present and the session still exists in Firestore + the user's UID is in its `members`, route directly to that session. If the session was deleted or the user was removed, clear the stored code and route to landing. Write `lastSessionCode` whenever the user successfully creates or joins a session; clear it on explicit "Leave session". Note: this is convenience-only — wiping localStorage just means typing the code in once, server data is untouched.
- Session lobby screen: list members, edit your display name, copy code, copy invite link, leave session
- Routes: `/` (landing/create/join), `/join/:code` (deep-link join handler), `/session/:code` (active session)
- Firestore security rules: session readable/writable only by members; codes globally readable for join lookup

### Phase 2 — Work order calculator

The core feature. A work order represents one refinery job.

**Input form:**
- Refinery station (dropdown: ARC-L1, ARC-L2, MIC-L1, MIC-L2, HUR-L1, HUR-L2, CRU-L1, MAGNUS, PYRO refineries as of 4.0)
- Refining method (dropdown: 7 methods, show their cost/speed/yield multipliers inline)
- Ore rows — add/remove dynamically:
  - Ore type (autocomplete from UEX raw commodities list)
  - Raw cSCU amount
- Sell price per refined unit (auto-fill from UEX, editable override)

**Calculated outputs (live as user types):**
- Estimated yield per ore (with method + station specialization applied)
- Estimated total refinery cost
- Estimated refinery time (HH:MM:SS, accounting for method speed multiplier)
- Estimated gross sale value
- Estimated net profit
- Per-ore breakdown table

**Comparison view:** "Compare all methods" button — shows a table of all 7 methods side-by-side for the current ore mix, highlights the best by net profit, best by time, best by cost.

**Saving:** "Start refining" button locks the work order, sets `startedAt`, begins the timer (see Phase 3). "Save draft" persists without starting.

### Phase 3 — Refinery timers

- For each work order with status `refining`, show a live countdown card
- Use `requestAnimationFrame` or `setInterval(1000)` for ticking; compute remaining time from `startedAt + quotedTime - now()` (don't rely on local clock drift over hours-long refines)
- Card shows: work order name, ore mix, time remaining (DDd HHh MMm SSs), progress bar
- When complete, status flips to `ready`, card turns green, optional browser notification (request permission on first refine start)
- "Mark sold" button → status `sold`, prompt for actual final sale price, feeds into payout
- Sort: refining first (soonest done at top), then ready, then sold (collapsible section)

### Phase 4 — Crew & payouts

**Crew tab:**
- Add member: name, role, shares (default 100), bonus aUEC (default 0)
- Inline edit, delete with confirm
- Members are *session-scoped*, not Firebase users — represents who was on this mining run, not who has app access

**Payouts tab:**
- "Create payout" — selects all `sold` work orders not yet in a payout
- Shows: total gross, expenses (refinery costs), net
- Each crew member's row: shares input (defaults to their saved value), bonus input, computed amount
- Math: `member.amount = member.bonusAUEC + (totalNet - sum(bonuses)) * (member.shares / sum(allShares))`
- "Lock payout" → snapshots all values, work orders get `payoutId` reference
- History view: list of past payouts, expandable to see breakdown
- Export payout as text block ("Mining run 2026-05-17 — Noah: 1,247,000 aUEC, Friend: 1,247,000 aUEC") for pasting into Discord

### Phase 5 — Polish & QOL

- Settings: dark/light toggle (default dark — this is a mining app, it lives in dark cockpits), Firebase project status indicator, manual data refresh, clear local cache
- "About" page: credit Regolith.Rocks as inspiration, link to UEX, version number, GitHub link
- Loading states for every async action (skeleton screens, not spinners where possible)
- Empty states for every list (no work orders yet, no crew, no payouts)
- Error boundaries with friendly recovery
- Offline indicator if Firestore disconnects, queue writes locally
- PWA manifest + service worker (you've done this on the floor-unit tracker) — installable to phone home screen
- Mobile bottom-nav: Sessions / Work Orders / Timers / Crew / Payouts

---

## 5. UX Details Worth Pinning Down Now

- **Session codes** use a curated wordlist of 200–500 Star Citizen-flavored 6–8 letter words (ship names, system names, ore names). Collision risk is negligible at 2-person scale; on collision regenerate.
- **No accounts.** Display name is editable any time, stored in `sessions/{id}/memberNames`. Firebase anon UID is the identity primitive.
- **Real-time updates**: every screen subscribes to Firestore via `onSnapshot`. When one user edits a work order, the other sees it update within ~1s. No manual refresh.
- **Mobile gestures:** swipe left on a list item = delete (with undo toast). Swipe right = quick action (start refining, mark sold).
- **Numerics:** all aUEC values use `Intl.NumberFormat` with comma separators. Times are HH:MM:SS for under 24h, "1d 4h 23m" beyond. Mono font for all numbers.
- **Color semantics:** amber = active/refining, green = ready/profit, red = loss/error, slate = neutral, blue = informational. Never use red for a normal state.

---

## 6. Repo Structure

```
quantum-yield/
├── .github/workflows/deploy.yml
├── public/
│   ├── icon-192.png, icon-512.png
│   └── manifest.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── firebase.ts                    # init, auth, exported db
│   ├── routes/
│   │   ├── Landing.tsx                # create/join session
│   │   ├── Session.tsx                # active session shell with bottom nav
│   │   ├── WorkOrders.tsx
│   │   ├── Timers.tsx
│   │   ├── Crew.tsx
│   │   └── Payouts.tsx
│   ├── components/
│   │   ├── WorkOrderForm.tsx
│   │   ├── WorkOrderCard.tsx
│   │   ├── MethodComparisonTable.tsx
│   │   ├── TimerCard.tsx
│   │   ├── CrewMemberRow.tsx
│   │   ├── PayoutBuilder.tsx
│   │   └── ui/                        # buttons, inputs, cards, toasts
│   ├── hooks/
│   │   ├── useSession.ts              # subscribes to session doc
│   │   ├── useWorkOrders.ts
│   │   ├── useCrew.ts
│   │   ├── useUexData.ts              # cached fetch from UEX
│   │   └── useCountdown.ts
│   ├── lib/
│   │   ├── refineryMath.ts            # yield/cost/time calculations
│   │   ├── sessionCode.ts             # wordlist + generator
│   │   └── format.ts                  # number, time, currency formatters
│   ├── data/
│   │   ├── refineryMethods.ts         # static method definitions
│   │   ├── materialSpecs.ts           # station specializations
│   │   ├── refineryStations.ts        # station list
│   │   └── sessionWords.ts            # session code wordlist
│   ├── store/
│   │   └── useAppStore.ts             # Zustand: local UI state
│   └── styles/
│       └── globals.css
├── firestore.rules
├── firestore.indexes.json
├── .env.example
├── README.md
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

---

## 7. Refinery Math (single source of truth)

In `src/lib/refineryMath.ts`, every calculation goes through these pure functions. They take inputs and method/station data, return numbers. No side effects. Easy to unit test.

```ts
calcRefinedAmount(rawAmount, oreBaseYield, methodYieldMultiplier, stationSpecYieldBonus) → number
calcRefineryCost(rawAmount, oreBaseCost, methodCostMultiplier, stationCapacityModifier) → number
calcRefineryTime(rawAmount, oreBaseTime, methodSpeedMultiplier, stationCapacityModifier) → number  // seconds
calcGrossSale(refinedAmount, sellPricePerUnit) → number
calcNetProfit(grossSale, refineryCost) → number

calcPayoutSplits(workOrders, crewMembers) → Array<{ memberId, shares, bonusAUEC, amount }>
```

Comparison view simply maps over all 7 methods and calls these.

Reference: TEST Squadron's refinery guide and current in-game values. **Verify against in-game quotes before relying on math.** Add a "Was the in-game quote different? Click to override" affordance on every work order so users can correct stale multiplier data without waiting for an app update.

---

## 8. Open Questions for Implementation

These are decisions Claude Code should make based on what fits cleanly during the build — flagged here so they aren't forgotten:

1. **Drag-to-reorder work orders?** Probably not needed in v1, sort by status + time.
2. **Multi-session history?** v1 only shows the current active session. Past sessions list is Phase 5+ stretch.
3. **PDF/image export of payout?** Text export is enough for Discord. Skip image export unless trivial.
4. **Push notifications when refinery completes?** Browser `Notification` API works, but only fires when the tab is open. Worth doing for the in-tab case; true push requires a service worker + FCM and isn't worth the complexity for 2 users.

---

## 9. Acceptance Checklist (v1.0)

- [ ] Two browsers in different cities can create + join a session via code
- [ ] Work order math matches in-game quote within rounding error for at least 3 different ore mixes
- [ ] Method comparison table correctly identifies best-profit method for a given input
- [ ] Refinery timer stays accurate across page reload (uses Firestore `startedAt`, not local state)
- [ ] Payout splits with 2 members at 100 shares each produce equal halves (after bonuses)
- [ ] PWA installs to iOS and Android home screens
- [ ] All actions reachable one-thumb on a 380px-wide phone
- [ ] Site loads and is usable offline (cached data only) after first visit
- [ ] Firestore security rules prevent reading sessions you're not a member of

---

## 10. Out of Scope for v1

Explicit non-features so Claude Code doesn't drift into them:

- Scouting reports / rock location sharing
- Loadout planner (mining heads, gadgets, consumables)
- Org-level multi-crew management beyond 2–4 people
- Voice chat / Discord integration
- Trade route planner
- Account system with email/password
- Analytics / leaderboards

---

## 11. Setup & Deployment Guide

This section is for the human (Noah) to follow once. Claude Code should generate a README that walks through these same steps for future reference.

### 11.1 Firebase project setup (one-time, ~5 minutes)

1. Go to https://console.firebase.google.com and sign in with a Google account.
2. Click **Add project**. Name it something like `quantum-yield` (the name is internal, not user-visible).
3. **Disable Google Analytics** when prompted — not needed, just adds noise.
4. Once the project is created, you'll land on the project dashboard.

**Enable Anonymous Authentication:**

5. Left sidebar → **Build → Authentication** → **Get started**.
6. **Sign-in method** tab → click **Anonymous** → toggle **Enable** → **Save**.

**Enable Firestore Database:**

7. Left sidebar → **Build → Firestore Database** → **Create database**.
8. Choose **Start in production mode** (we'll paste real rules in shortly — don't use test mode, it's wide open).
9. Pick a location close to you — `us-central1` or `us-east1` are good for Wichita. **This is permanent**, can't be changed later, but it doesn't really matter for a 2-person app.
10. Once created, go to the **Rules** tab and paste the contents of `firestore.rules` from the repo (Claude Code will generate this). Click **Publish**.

**Get the config keys for the web app:**

11. Top of dashboard → click the **⚙ gear icon** → **Project settings**.
12. Scroll to **Your apps** → click the **`</>`** (Web) icon to register a web app.
13. App nickname: `quantum-yield-web`. **Do NOT check** "Also set up Firebase Hosting" — we're using GitHub Pages, not Firebase Hosting.
14. Click **Register app**. Firebase shows you a config object that looks like this:

    ```js
    const firebaseConfig = {
      apiKey: "AIzaSy...",
      authDomain: "quantum-yield.firebaseapp.com",
      projectId: "quantum-yield",
      storageBucket: "quantum-yield.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abc123"
    };
    ```

15. Copy these six values somewhere temporary — you'll paste them into `.env.local` (for local dev) and GitHub repo secrets (for the deployed build) next.

> **Free tier reminder:** Spark plan is the default. Firebase will never auto-charge you. There is no credit card on file. The only way you get billed is if you explicitly upgrade to the Blaze (pay-as-you-go) plan, which there is zero reason to do for this app.

### 11.2 GitHub repo setup

1. Create a new GitHub repo, public or private (doesn't matter for GH Pages on a free account if you only need public Pages — for private repos with Pages you need GH Pro, but public works fine and the source being public isn't sensitive here since all secrets are in env).
2. Clone it locally and let Claude Code scaffold into it, OR let Claude Code generate the project and push it.
3. In the repo settings → **Pages** → Source: **GitHub Actions** (not "Deploy from a branch" — the workflow handles deployment).

### 11.3 Local development setup

1. After Claude Code scaffolds the project: `cp .env.example .env.local`
2. Paste your six Firebase config values into `.env.local`:

    ```
    VITE_FIREBASE_API_KEY=AIzaSy...
    VITE_FIREBASE_AUTH_DOMAIN=quantum-yield.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=quantum-yield
    VITE_FIREBASE_STORAGE_BUCKET=quantum-yield.appspot.com
    VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
    VITE_FIREBASE_APP_ID=1:123456789:web:abc123
    ```

3. `npm install`
4. `npm run dev` — should boot at `http://localhost:5173/quantum-yield/`
5. Open two browser windows (or one regular + one incognito) and confirm: create session in window A, join via code in window B, edits in either window appear in the other within ~1s. If that works, Firebase is wired correctly.

### 11.4 GitHub Actions secrets (for deployed build)

1. Repo → **Settings → Secrets and variables → Actions** → **New repository secret**.
2. Add each of the six `VITE_FIREBASE_*` keys as a separate secret with the same name and value as your `.env.local`.
3. The deploy workflow reads these and injects them at build time.

### 11.5 Vite config for GH Pages

In `vite.config.ts`, the `base` option must match the repo name:

```ts
export default defineConfig({
  base: '/quantum-yield/',   // <- must match repo name exactly
  plugins: [react()],
});
```

If the repo is named differently, update this string. Wrong `base` = blank page on the deployed site with 404s on every asset in the console.

### 11.6 Authorized domains in Firebase

After the first successful deploy, Firebase Auth needs to know your GH Pages URL is allowed:

1. Firebase console → **Authentication** → **Settings** tab → **Authorized domains**.
2. Add `<your-username>.github.io` (just the bare domain, no path).
3. `localhost` is already in the list by default for local dev.

If you skip this, anonymous auth will silently fail on the deployed site and the app will appear broken with no obvious error.

### 11.7 Deploy workflow

GH Actions workflow on push to `main`:

1. Checkout
2. Setup Node 20
3. `npm ci`
4. `npm run build` (with `VITE_FIREBASE_*` injected from repo secrets)
5. Deploy `dist/` to GitHub Pages via `actions/deploy-pages@v4`

Claude Code should generate this workflow at `.github/workflows/deploy.yml`. First successful run will publish to `https://<username>.github.io/quantum-yield/`.

### 11.8 Sanity checks after first deploy

- Visit the deployed URL → app loads, no console errors
- Open browser DevTools → Network → confirm Firebase requests succeed (not 403)
- Create a session, copy invite link, open it in incognito → joins cleanly
- Edit something in one tab → updates within ~1s in the other
- Close all tabs, reopen the deployed URL → auto-rejoins last session

If all of those pass, you're done.

---

## 12. First Session Instructions for Claude Code

Start with Phase 0 + Phase 1. Get the scaffold deployed to GH Pages with a working create/join-session flow before touching any mining math. Confirm Firebase wiring is solid (real-time updates across two browser tabs) before moving to Phase 2.

Phase 2 is the biggest single chunk. Do not start Phase 2 until the static refinery method data has been captured into `src/data/refineryMethods.ts` — that data is the foundation of every calculation in the app.

Phases 3–4 build on Phase 2's math. Phase 5 polish should happen iteratively as features land, not saved for the end.
