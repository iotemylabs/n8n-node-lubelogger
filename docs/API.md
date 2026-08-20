# LubeLogger API — verified inventory

**Pinned against:** LubeLogger **v1.7.1** (source commit `d5a5832045267ac3d9c31addb280c774120ab0a3`, fetched 2026-08-20).
**Target instance version:** _pending — will be recorded from `GET /api/version` once instance credentials are provided._

**Spec:** LubeLogger serves its own machine-readable endpoint catalogue at `GET /api` (rendered from `wwwroot/defaults/api.json`). It is **not OpenAPI** — a custom format with paths, query params, and body samples. The v1.7.1 copy is pinned at [`docs/lubelogger-api-doc.json`](lubelogger-api-doc.json). Field-level semantics below were read from the controllers and models themselves.

**Confirmation sources** used in the tables:
- **spec** — listed in the pinned `api.json`
- **docs** — stated in [lubelog_docs](https://github.com/hargata/lubelog_docs) (docs.lubelogger.com)
- **source** — read from the v1.7.1 controller/model code (ground truth)
- **observed** — verified live against the target instance (_pending; nothing is marked observed yet_)

---

## Findings that shape the node design

1. **Auth: API keys exist and are preferred.** `x-api-key` header (or `?apiKey=`), scoped **Viewer / Editor / Manager**. Basic auth (RFC2617, full account credentials) also works; SSO accounts must use keys. A **Viewer** key is the read-only credential to recommend. *(docs + source)*
2. **No "enable API" setting exists.** `/api` is always routed. If the instance runs `EnableAuth=false`, every request acts as root with no credentials. *(source: `Program.cs`, `Middleware/Authen.cs`)*
3. **`culture-invariant` header solves locale.** With the header present, dates serialize as **`yyyy-MM-dd`**, numbers as JSON numbers, booleans as JSON booleans. Without it, *everything* is a locale-formatted string (dates in the server's short-date pattern, e.g. `1/3/2026`). The node sends the header on every request and additionally normalises dates to ISO in its output. Input dates are parsed server-side with culture-aware `DateTime.Parse`; ISO `yyyy-MM-dd` is unambiguous in every .NET culture, so the node always sends ISO. *(docs + source: `Models/API/TypeConverter.cs`)*
4. **Update is full-replace — a real data-loss hazard.** Every `update` handler overwrites the whole record: omitted `extraFields`, `files`, `tags`, `notes` are replaced with empty values. The node performs **read-merge-write** on every update: it GETs the record by id, merges only the fields the user set, and PUTs the merged object back. *(source: every `Update*` handler)*
5. **Gas record flags** *(docs "Fuel Records" + source `GasHelper`)*:
   - `isFillToFull` — tank filled to full. `false` = partial fill-up; economy calculation is **deferred** and rolled into the next full fill.
   - `missedFuelUp` — a fill-up before this one was never recorded; **resets** the calculation chain so the gap doesn't corrupt averages.
   - Both are **required** on create/update. Getting them wrong misstates computed economy for neighbouring records, hence explicit booleans with these exact explanations in the node UI.
   - EV vehicles: optional `startingSoc`/`endingSoc` (server defaults **20/80** when omitted).
   - GET responses include the **computed `fuelEconomy`** per record; `useMPG`/`useUKMPG` query params override the calculation basis.
6. **Units are invisible to the API.** `/api/info` returns only version, locale, currency symbol, decimal separator, date format. The miles/km + gallons/litres configuration is a user setting not exposed anywhere. Every relevant node field says values are in the instance's configured unit and the node does not convert. *(source: `ServerInformation.cs`)*
7. **Reminders return computed status.** GET reminders returns `urgency` ∈ `NotUrgent | Urgent | VeryUrgent | PastDue` plus `dueDays`, `dueDistance`, and resolved `metric`. Urgent/VeryUrgent thresholds (days & distance) are **instance-configured**. This is the trigger's whole basis: the trigger fires on *transition into* a chosen urgency set. There is **no markComplete endpoint** — the web UI's "mark done" for recurring reminders is not in the API, so the node does not offer it. *(source: `ReminderHelper.cs`, `API/ReminderController.cs`)*
8. **No pagination anywhere.** Controllers materialize full lists and filter in memory. The node's `getAll` offers `startDate`/`endDate`/`tags` server-side filters plus a client-side `limit`, documented as such. *(source)*
9. **Envelopes:** GETs return bare arrays (or a bare number for `odometerrecords/latest`). Mutations return `{ success, message, data? }` (`data.recordId` / `data.vehicleId` on create). Errors: 400/403/500 with that same JSON; **401 has an empty body** (`WWW-Authenticate: Basic`). Wrong paths / proxy failures can return HTML — the node detects non-JSON and surfaces a URL/proxy hint instead of a parse error. *(source)*
10. **Attachments are supported**: `POST /api/documents/upload` (multipart, field `documents`) returns `[{ name, location }]`; the `location` is then embedded in a record's `files` array. *(spec + source)*
11. **Webhooks exist — but not per-workflow.** Contrary to expectation, LubeLogger has (a) a single **server-wide webhook URL** set manually in Server Settings (fires on all record CRUD, incl. API-initiated), and (b) a SignalR **WebSocket** at `/api/ws`. Neither can be registered via the API per workflow, so **LubeLoggerTrigger is a polling trigger**. The server-wide webhook is documented in the README as a manual alternative (point it at an n8n Webhook node). *(docs "Advanced/Webhook", source `Logic/Event`)*
12. **Plan records:** `type` ∈ `ServiceRecord | RepairRecord | UpgradeRecord`, `priority` ∈ `Critical | Normal | Low`, `progress` ∈ `Backlog | InProgress | Testing` — the API **rejects `Done`** on create *and* update. Plans have no tags; date filters run on `dateCreated`. Status-change trigger events can only observe transitions between the three settable states plus Done reached via the UI. *(source)*
13. **Vehicle identification is integer `id` only.** No endpoint accepts name/VIN lookup. The node's vehicle selector (loadOptions, shared with the trigger) lists `Year Make Model (identifier)` → id. `getInfo` always returns an **array** of `VehicleInfo`, even for one vehicle. *(source)*
14. **Reminders have no extraFields/files**; all other exposed record types carry both. Vehicles carry extraFields (used for VIN etc. via the `identifier` mechanism) but not files. *(source: `ImportModel.cs`)*

---

## Per-resource endpoint tables

Legend: **V** = Viewer, **E** = Editor, **M** = Manager (API-key role required; Basic auth passes all three subject to vehicle collaborator access). Confirmation `spec+docs+source` abbreviated; **obs** appended once verified live.

### Vehicle

| Verb | Path | Auth | Confirmed | v1 |
|---|---|---|---|---|
| GET | `/api/vehicles` | V | spec+docs+source | **getAll** (also credential test + loadOptions) |
| GET | `/api/vehicle/info?vehicleId=` | V | spec+source | **get** / **getInfo** (aggregate stats incl. lastReportedOdometer) |
| POST | `/api/vehicles/add` | E | spec+source | **create** |
| PUT | `/api/vehicles/update` | E | spec+source | **update** (read-merge-write) |
| DELETE | `/api/vehicles/delete?id=` | M | spec+source | **delete** (destroys all vehicle records — flagged) |
| GET | `/api/vehicle/adjustedodometer` | V | spec+source | skipped (niche) |

Create requires `year, make, model, identifier, fuelType(Gasoline|Diesel|Electric)`; `identifier: "LicensePlate"` requires `licensePlate`, any other identifier must exist as an extra field. Caveat *(source)*: the API cannot revert `fuelType` from Diesel/Electric back to Gasoline on update.

### Service / Repair / Upgrade records (identical `GenericRecordExportModel` shape)

| Verb | Path pattern | Auth | Confirmed | v1 |
|---|---|---|---|---|
| GET | `/api/vehicle/{servicerecords\|repairrecords\|upgraderecords}?vehicleId=&id=&startDate=&endDate=&tags=` | V | spec+docs+source | **getAll** |
| GET | `…/all` (whole garage) | V | spec+source | **getAll** with "All vehicles" |
| POST | `…/add?vehicleId=` | E | spec+source | **create** (req: date, odometer, description, cost) |
| PUT | `…/update` | E | spec+source | **update** (read-merge-write) |
| DELETE | `…/delete?id=` | M | spec+source | **delete** |

Fields: `date, odometer, description, cost, notes, tags, extraFields[], files[]`.

### Tax records

Same table as above with base `…/taxrecords`, **no odometer field** (req: date, description, cost). Root-only `GET /api/vehicle/taxrecords/check` (recurring refresh) is skipped.

### Gas (fuel) records

| Verb | Path | Auth | Confirmed | v1 |
|---|---|---|---|---|
| GET | `/api/vehicle/gasrecords?vehicleId=&id=&startDate=&endDate=&tags=&useMPG=&useUKMPG=` | V | spec+docs+source | **getAll** (returns computed `fuelEconomy`) |
| GET | `…/all` | V | spec+source | **getAll** with "All vehicles" |
| POST | `…/add?vehicleId=` | E | spec+docs+source | **create** (req: date, odometer, fuelConsumed, cost, **isFillToFull**, **missedFuelUp**; EV: startingSoc/endingSoc default 20/80) |
| PUT | `…/update` | E | spec+source | **update** (read-merge-write) |
| DELETE | `…/delete?id=` | M | spec+source | **delete** (flagged: changes neighbouring records' computed economy) |

Server-side note *(source)*: if the authenticated user has `EnableAutoOdometerInsert` on, `add` also creates an odometer record.

### Odometer records

| Verb | Path | Auth | Confirmed | v1 |
|---|---|---|---|---|
| GET | `/api/vehicle/odometerrecords?vehicleId=&…` | V | spec+docs+source | **getAll** |
| GET | `…/all` | V | spec+source | **getAll** with "All vehicles" |
| GET | `…/latest?vehicleId=` | V | spec+source | **getLatest** — returns a **bare number** (max across all record types) |
| POST | `…/add?vehicleId=[&autoIncludeEquipment=]` | E | spec+source | **create** (req: date, odometer; initialOdometer auto-defaults) |
| PUT | `…/update` | E | spec+source | **update** (req adds initialOdometer; read-merge-write) |
| DELETE | `…/delete?id=` | M | spec+source | **delete** |
| PUT | `…/recalculate?vehicleId=` | E | spec+source | skipped (maintenance) |

### Reminders

| Verb | Path | Auth | Confirmed | v1 |
|---|---|---|---|---|
| GET | `/api/vehicle/reminders?vehicleId=&id=&tags=&urgencies=` | V | spec+docs+source | **getAll** / **get** (by id param) — computed urgency, dueDays, dueDistance |
| GET | `…/all` | V | spec+source | **getAll** with "All vehicles" (trigger uses this) |
| POST | `…/add?vehicleId=` | E | spec+source | **create** (req: description, metric ∈ Date\|Odometer\|Both, dueDate/dueOdometer per metric) |
| PUT | `…/update` | E | spec+source | **update** |
| DELETE | `…/delete?id=` | M | spec+source | **delete** |
| — | *(markComplete)* | — | source | **does not exist — not exposed** |
| GET | `/api/vehicle/reminders/send` | root | spec+source | skipped (root-only email blast) |
| GET | `/api/calendar` | V | spec+docs+source | skipped (ICS, not JSON) |

Reminders carry `tags` but **no extraFields/files**. Recurring flag not settable via API.

### Plan (planner) records

| Verb | Path | Auth | Confirmed | v1 |
|---|---|---|---|---|
| GET | `/api/vehicle/planrecords?vehicleId=&id=&startDate=&endDate=` | V | spec+docs+source | **getAll** (filters on dateCreated; no tags) |
| GET | `…/all` | V | spec+source | **getAll** with "All vehicles" |
| POST | `…/add?vehicleId=` | E | spec+source | **create** (req: description, cost, type, priority, progress ≠ Done) |
| PUT | `…/update` | E | spec+source | **update** (read-merge-write; Done rejected) |
| DELETE | `…/delete?id=` | M | spec+source | **delete** |

### Documents / attachments

| Verb | Path | Auth | Confirmed | v1 |
|---|---|---|---|---|
| POST | `/api/documents/upload` (multipart `documents`) | any authed | spec+source | **exposed** — returns `[{name, location}]` for use in `files[]` |

### System / miscellaneous

| Verb | Path | Auth | Confirmed | v1 |
|---|---|---|---|---|
| GET | `/health` | anonymous | source | internal |
| GET | `/api/whoami` | any | spec+source | internal |
| GET | `/api/info` | any | spec+source | internal (locale) |
| GET | `/api/version` | any | spec+source | internal (version pin) |

### Deliberately out of v1 scope

Supply records, Notes, Equipment records (full CRUD exists, same pattern — candidates for v1.1), root-only admin endpoints (`/api/makebackup`, `/api/tempfiles`, `/api/cleanup`, `/api/demo/restore`), `/api/vehicle/reminders/send`, `/api/calendar` (ICS), `/api/vehicle/adjustedodometer`, `/api/vehicle/odometerrecords/recalculate`, `/api/vehicle/taxrecords/check`.
