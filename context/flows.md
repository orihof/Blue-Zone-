# Blue Zone — User Flows

## Competition Prep Onboarding
A 5-step wizard triggered when the user selects "Competition Prep"
as their training mode.

| Step | Name      | File                        | Status    |
|------|-----------|-----------------------------|-----------|
| 1    | Profile   | —                           | Not built |
| 2    | Goals     | —                           | Not built |
| 3    | Wearables | bluezone-wearables-v23.html | Active    |
| 4    | Protocol  | —                           | Not built |
| 5    | Review    | —                           | Not built |

## Step 3 — Wearables (Active Screen)

File: bluezone-wearables-v23.html
Goal: User connects at least one biometric data source.

### Three integration tiers
- Live sync: WHOOP (hero card), Oura, Strava
- Manual import: Apple Health, Samsung Health
- Coming soon: Garmin, Polar

### State logic
- connectedCount tracks live connections and imports
- maybeShowContinue() fires on connect, shows CTA when count reaches 1
- maybeHideContinue() fires on disconnect, hides CTA when count reaches 0
- updateSkip(bool) updates skip footer copy to reflect connected state

### Success condition
connectedCount >= 1 triggers continue-cta and updates skip footer

### Competition Prep-specific elements
- Chip: "Competition Prep — 14 days to race day"
- "Recommended for Comp Prep" badge on Live sync header
- These do not appear in other flows

### Step track
- 5 dots, 4 gaps
- Dots 1 and 2 are done, dot 3 is active
- Fill width: 50% — do not change on this screen

## Step 4 — Protocol (Not Built)
Three configuration areas:
1. Training intensity
2. Supplement timing windows
3. Recovery thresholds

Step track fill: 75%
Breadcrumb: Track › Protocol

## Step 5 — Review (Not Built)
Summary of all choices from steps 1 through 4.
Step track fill: 100%
Primary action: Activate my plan
