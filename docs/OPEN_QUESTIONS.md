# Open questions

Items Phase 0 could not settle from the spec, docs, or source, or that need live verification against the target instance. Everything here is tracked; nothing here has been guessed at in code.

## Resolved by the observed pass (2026-08-20)

1. ~~Target instance version~~ — **1.7.1**, matches the source pin exactly.
2. ~~Shape verification~~ — full pass done on a throwaway test vehicle; see `api-inventory.json` `meta.observedPass`. Corrections found: envelope key is `additionalData`; bad-key 401 returns an HTML login page; odometer-only reminders return `dueDate: "0001-01-01"`; blanked `notes` returns `null`; `fuelEconomy` defaults to per-100-distance when `useMPG` omitted.
3. Auth — instance runs with auth enabled; the provided API key acts as **root**. Viewer/Editor/Manager *role downgrade* enforcement was **not** exercised (only a root key was available); source reading stands for non-root keys.
4. ~~Locale~~ — `en-US`, `M/d/yyyy`; non-invariant dates confirmed `MM/DD/YYYY`.

## Still pending

- **Document upload** (`/api/documents/upload`) not yet exercised live; will be verified when the attachment support is implemented.
- **Non-root API key role enforcement** (403 on insufficient role) — needs a Viewer/Editor key to verify; source is unambiguous.

## Genuinely unsettled / design notes

5. **Reminder "mark done"** — no API endpoint exists (web UI only, `ReminderController.PushbackRecurringReminder` is cookie-auth MVC, not `/api`). v1 omits the operation. If upstream adds it, wire it in.
6. **Recurring reminders via API** — `isRecurring`/interval fields are not accepted by the API's `ReminderExportModel`. Reminders created by the node are non-recurring. Documented in the node's create description.
7. **Plan record `Done` progress** — API rejects it on create and update. The trigger can still *observe* Done (set via web UI). A "plan completed" workflow therefore works as a trigger event but not as an action.
8. **Vehicle fuelType downgrade** — the API update handler only ever sets `IsDiesel`/`IsElectric` to true; changing a vehicle back to Gasoline via API is impossible (source, v1.7.1). Documented in the vehicle update description; not worked around.
9. **Instance units** — not exposed by any endpoint. The node labels all odometer/volume fields as "instance-configured units" and never converts. If upstream ever exposes user config via API, field labels could become dynamic.
10. **Webhook alternative to polling** — LubeLogger's server-wide webhook (Server Settings) could push events to an n8n Webhook node, but it is single-subscriber, instance-global, and not API-manageable, so the packaged trigger polls. Documented in README instead.
11. **`odometerrecords/latest` semantics** — returns `VehicleLogic.GetMaxMileage`, the max reading across gas/service/repair/upgrade/odometer records, not merely the latest odometer *record*. Node description says "highest known odometer reading". Verify live that the response is a bare number under both invariant and default modes (source says it bypasses the invariant serializer — it is a bare `Json(int)` either way).
12. **`/api/vehicle/info` without `vehicleId` for non-root Basic users** — source filters to accessible vehicles; verify live that a Viewer API key sees only shared vehicles (affects loadOptions completeness for collaborator setups).
