# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-08-20

Built and verified against **LubeLogger v1.7.1** (API inventory pinned in `docs/`).

### Added

- `LubeLoggerApi` credential: API key (Viewer/Editor/Manager scopes) or Basic auth, base URL normalisation, self-signed-certificate toggle, credential test against the vehicle list.
- `LubeLogger` node with resources: Vehicle (get many/get/get info/create/update/delete), Service, Repair, Upgrade, Tax, Fuel, Odometer (incl. Get Latest), Reminder (incl. Get with computed urgency), Plan Record, and Document upload. Usable as an AI tool.
- Read-merge-write updates on every resource, guarding against LubeLogger's full-replace update endpoints wiping extra fields, files, tags, and notes.
- Locale-safe data handling: every request sends LubeLogger's `culture-invariant` header; dates are `yyyy-MM-dd` in both directions and the `0001-01-01` sentinel becomes `null`.
- `LubeLogger Trigger` polling node with events: Reminder Due (urgency-transition semantics), New Record, Odometer Threshold Crossed, Plan Status Changed. First poll baselines without firing; reminders fire once per transition, not while they remain due.
- Error mapping: credential hint on 401, and detection of HTML/non-JSON responses with a base-URL/reverse-proxy hint.
