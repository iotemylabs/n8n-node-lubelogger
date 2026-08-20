# @iotemy/n8n-nodes-lubelogger

n8n community nodes for [LubeLogger](https://lubelogger.com), the self-hosted vehicle maintenance and fuel mileage tracker. Built and tested against **LubeLogger v1.7.1** (every request and response shape in this package was verified against a live v1.7.1 instance; see [docs/API.md](https://github.com/iotemylabs/n8n-node-lubelogger/blob/main/docs/API.md) for the full verified inventory).

The package contains two nodes:

- **LubeLogger** — manage vehicles, service/repair/upgrade/tax records, fuel records, odometer readings, reminders, planner items, and document attachments. Usable as an AI tool.
- **LubeLogger Trigger** — start workflows when a reminder becomes due, a new record appears, an odometer threshold is crossed, or a planner item changes status.

## Installation

On self-hosted n8n: **Settings → Community Nodes → Install**, enter `@iotemy/n8n-nodes-lubelogger`.

Or from the command line in your n8n installation directory:

```bash
npm install @iotemy/n8n-nodes-lubelogger
```

then restart n8n. Requires Node.js ≥ 20.15 (the same as current n8n releases).

## Credentials

There is **no switch to enable the API** in LubeLogger — `/api` is always available. Create a **LubeLogger API** credential in n8n with:

| Field | Notes |
|---|---|
| Base URL | The instance root, e.g. `http://192.168.1.100:8080` — without a trailing slash and **without `/api`** |
| Authentication | **API Key** (recommended) or Basic Auth |
| API Key | Generate in LubeLogger under Settings. Keys are scoped: **Viewer** (read only), **Editor** (read/add/edit), **Manager** (read/add/edit/delete). For read-only workflows (e.g. the trigger node), use a Viewer key. |
| Username / Password | Basic Auth uses your LubeLogger login credentials and grants **full application access** — prefer a scoped API key. Neither may contain a colon. Single Sign-On accounts cannot use Basic Auth. |
| Ignore SSL Issues | Turn on for self-signed certificates |

Note: if your LubeLogger instance runs with `EnableAuth=false`, every API request acts as root regardless of credentials.

## Things worth knowing before you build

- **Units are never converted.** Odometer and fuel-volume values are in whatever unit your instance is configured for (miles/gallons or kilometres/litres). The API does not expose that setting, so the node passes numbers through untouched.
- **Dates**: give the node any normal date (an n8n date, ISO string, or expression); it sends LubeLogger the unambiguous `yyyy-MM-dd` form and returns all dates as `yyyy-MM-dd` strings, regardless of the instance locale. LubeLogger's "no date" sentinel (`0001-01-01`) is returned as `null`.
- **Updates are safe.** LubeLogger's own update endpoints replace the whole record — omitted fields get wiped. This node always reads the existing record first and merges your changes, so extra fields, attachments, tags, and notes survive an update that doesn't mention them.
- **Deletes are irreversible** — there is no trash in LubeLogger. Deleting a **fuel record** also changes the computed fuel economy of the records around it, and deleting a **vehicle** deletes every record it owns.
- **The trigger polls.** LubeLogger's outgoing webhook is a single server-wide URL set manually in Server Settings — it cannot be registered per workflow — so the trigger node polls the API instead. Vehicle data changes daily at most; an **hourly** poll interval is generous, and anything faster is wasted requests. (If you want push instead, point LubeLogger's Server Settings webhook at an n8n Webhook node — but you get one subscriber for the whole instance.)
- **Reminders fire on transition.** The "Reminder Due" trigger event emits a reminder when it *enters* one of the urgency states you selected (`Urgent`, `VeryUrgent`, `PastDue`, as computed by LubeLogger), not on every poll while it stays due. The lead time behind Urgent/Very Urgent (days and distance) is configured in LubeLogger itself. The first poll after activation only takes a baseline — enabling a workflow will not fire every already-overdue reminder.
- **No pagination.** The API returns full lists; the node's Limit option truncates client-side.

## Operations

| Resource | Operations |
|---|---|
| Vehicle | Get Many, Get, Get Info (aggregate stats), Create, Update, Delete |
| Service Record | Get Many, Create, Update, Delete |
| Repair Record | Get Many, Create, Update, Delete |
| Upgrade Record | Get Many, Create, Update, Delete |
| Tax Record | Get Many, Create, Update, Delete |
| Fuel Record | Get Many, Create, Update, Delete |
| Odometer Record | Get Many, Get Latest, Create, Update, Delete |
| Reminder | Get Many, Get, Create, Update, Delete |
| Plan Record | Get Many, Create, Update, Delete |
| Document | Upload (returns a `location` to reference in any record's Attached Files) |

Not exposed because the API does not offer them: marking a reminder complete (web-UI only), setting a plan's progress to `Done` (the API rejects it), recurring reminders, and reverting a vehicle's fuel type to Gasoline.

Trigger events: **Reminder Due** (urgency transition, configurable urgency set), **New Record** (any of the eight record types, per vehicle or whole garage), **Odometer Threshold Crossed** (fires once when the latest reading passes a value), **Plan Status Changed** (progress column transitions, including `Done` set via the web UI).

Fuel record specifics — these two flags feed LubeLogger's mileage math, so the node makes them explicit:

- **Filled to Full** — on for a complete fill-up. Off for a partial fill: the economy calculation is deferred and rolled into the next full fill-up.
- **Missed Fuel-Up** — on if a fill-up before this one was never recorded; it resets the calculation chain so the gap doesn't skew the vehicle's averages.

## Example: when a reminder goes due, create a task and get notified

1. **LubeLogger Trigger** — Event: *Reminder Due*; All Vehicles: on; Urgencies: *Urgent, Very Urgent, Past Due*. Poll hourly.
2. **Your task app node** (Todoist, Vikunja, Notion…) — create a task titled `{{ $json.description }}` with due date `{{ $json.dueDate }}`; the payload also carries `urgency`, `dueDays`, `dueDistance`, and `vehicleId`.
3. **Notification node** (Telegram, Pushover, email…) — "🔧 {{ $json.description }} is {{ $json.urgency === 'PastDue' ? 'overdue' : 'due soon' }}".

Each reminder arrives as its own item and fires once per transition, so the workflow will not re-notify every hour while a reminder stays overdue.

## Example: log a fill-up from a parsed receipt email

1. **Email Trigger (IMAP)** or Gmail trigger — watch for fuel receipts.
2. **Extraction step** (AI or regex) — pull total cost, volume, and date from the receipt.
3. **LubeLogger: Odometer Record → Get Latest** — optional sanity reference for the odometer prompt/estimate.
4. **LubeLogger: Fuel Record → Create** — Vehicle: your car; Date: `{{ $json.date }}`; Odometer: reading from step 3 plus trip distance, or a value you supply; Fuel Consumed: `{{ $json.volume }}`; Cost: `{{ $json.total }}`; **Filled to Full: on** (assuming you fill to full); **Missed Fuel-Up: off**.

Set the two flags deliberately — they determine how LubeLogger computes fuel economy across the whole history, not just this record.

## Development

```bash
npm install
npm run lint
npm run build
```

Publishing runs through the GitHub Actions provenance workflow in `.github/workflows/publish.yml` (required by n8n for community nodes since 1 May 2026): `npm run release` locally lints, builds, bumps, tags, and pushes; the tag triggers the provenance-signed publish.

## License

[MIT](LICENSE)
