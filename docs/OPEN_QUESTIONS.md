# Open questions

Items Phase 0 could not settle from the spec, docs, or source, or that need live verification against the target instance. Everything here is tracked; nothing here has been guessed at in code.

## Pending live verification (blocked on instance access)

1. **Target instance version** — record `GET /api/version`. All source reading was pinned to v1.7.1; if the instance is older, some endpoints (e.g. vehicle delete/update, `/api/info`, SoC fields) may be missing.
2. **Every request/response shape marked only `spec+source`** in `API.md` needs an `observed` confirmation pass: vehicles list, vehicle info, one full CRUD cycle per record type, odometer latest, reminder urgency output, document upload, and the 400/401/403 error shapes.
3. **Basic-auth vs API-key behaviour on this instance** — confirm which the instance has configured (`EnableAuth`?), generate an API key if possible, and confirm Viewer/Editor/Manager role enforcement matches source reading.
4. **Locale of the instance** — `GET /api/info`; confirms what non-invariant responses would look like (the node always sends `culture-invariant`, but the credential test should still work either way).

## Genuinely unsettled / design notes

5. **Reminder "mark done"** — no API endpoint exists (web UI only, `ReminderController.PushbackRecurringReminder` is cookie-auth MVC, not `/api`). v1 omits the operation. If upstream adds it, wire it in.
6. **Recurring reminders via API** — `isRecurring`/interval fields are not accepted by the API's `ReminderExportModel`. Reminders created by the node are non-recurring. Documented in the node's create description.
7. **Plan record `Done` progress** — API rejects it on create and update. The trigger can still *observe* Done (set via web UI). A "plan completed" workflow therefore works as a trigger event but not as an action.
8. **Vehicle fuelType downgrade** — the API update handler only ever sets `IsDiesel`/`IsElectric` to true; changing a vehicle back to Gasoline via API is impossible (source, v1.7.1). Documented in the vehicle update description; not worked around.
9. **Instance units** — not exposed by any endpoint. The node labels all odometer/volume fields as "instance-configured units" and never converts. If upstream ever exposes user config via API, field labels could become dynamic.
10. **Webhook alternative to polling** — LubeLogger's server-wide webhook (Server Settings) could push events to an n8n Webhook node, but it is single-subscriber, instance-global, and not API-manageable, so the packaged trigger polls. Documented in README instead.
11. **`odometerrecords/latest` semantics** — returns `VehicleLogic.GetMaxMileage`, the max reading across gas/service/repair/upgrade/odometer records, not merely the latest odometer *record*. Node description says "highest known odometer reading". Verify live that the response is a bare number under both invariant and default modes (source says it bypasses the invariant serializer — it is a bare `Json(int)` either way).
12. **`/api/vehicle/info` without `vehicleId` for non-root Basic users** — source filters to accessible vehicles; verify live that a Viewer API key sees only shared vehicles (affects loadOptions completeness for collaborator setups).
