# JP Innovation Controlled Rebuild Audit

Date: 2026-07-28

Production: `main`  
Protected snapshot: `backup/production-pre-rebuild-2026-07-28`  
Rebuild branch: `refactor/controlled-rebuild`

## Executive finding

The recurring freezes and regressions are architectural. The live Hub is a large monolithic application followed by many corrective scripts that independently replace rendering, attach global event listeners, inject CSS, normalize roles, and manage overlays. These layers do not share one lifecycle or navigation owner, so one fix can leave stale listeners, backdrops, body locks, or route state created by another.

The live failure was reproduced on the signed-in production Hub at a 390px mobile viewport: the profile menu opened, but selecting **Admin review** caused the page interaction to hang until the controlled browser session timed out.

## Measured production state

- `hub-portal/app.js`: 335,321 bytes, 6,536 lines and 245 named functions.
- It contains 129 event-listener registrations, 69 `renderView` calls, 18 Supabase RPC calls and 59 direct table queries.
- `hub-portal/index.html` loads the main app plus 18 subsequent custom JavaScript layers.
- At least seven loaded files reference or control the profile menu, notifications or related navigation.
- Several loaded files wrap or replace the global `renderView` function.
- `hub-portal/styles.css`: 111,232 bytes and 4,319 lines, before CSS injected by later scripts.
- The repository contains many files labelled fix, override, final, critical, regression, bridge, workflow, polish and sync for the same features.
- No automated test suite or GitHub workflow validates the application.
- SQL is stored as independent scripts rather than one ordered migration history.

## Confirmed root causes

### Multiple interaction owners

Profile-menu, notification, sign-out, Admin navigation and account-action behavior are spread across `app.js` and multiple later scripts. They bind to window, document and controls, sometimes in capture mode. One tap can therefore be handled by more than one owner.

Consequences include frozen menus, wrong routes, retained overlays, repeat actions and device-dependent behavior.

### Global renderer monkey-patching

Admin dashboard, Admin review, notification, directory/profile and other layers wrap or replace `renderView` after the base app loads. Navigation depends on script order and mutable globals rather than one router.

This explains Dashboard flashes, route loops, blank content, stale state and shell remounting.

### Monolithic UI, business logic and persistence

The 6,536-line Hub file mixes templates, events, authentication, permissions, data queries, mutations, routing, cache/state and presentation. Changes cannot be isolated and backend success can disagree with optimistic UI state.

### Repeated role and permission logic

Admin/member/client plus active/free/pending/approved/removed/suspended/vetted/verified states are interpreted independently in the base app, access-tier layer, profile sync, directory code and SQL.

This permits client/Hub access confusion, upgrades that appear to succeed then revert, and different mobile/desktop account state.

### Split notification ownership

Website notifications, PWA notifications, counters, profile-photo approvals and click navigation are calculated or handled in multiple files. There is no single canonical task source or dispatcher.

This explains duplicate Android notifications, bell freezes and counters disagreeing with approval lists.

### Database drift

Duplicate SQL object definitions found:

- `admin_reset_site_analytics`: 7
- `is_hub_admin`: 3
- `moderate_board_post`: 2
- `admin_notifications` table: 2
- `admin_audit_log` table: 2
- `request_hub_access`: 2
- `admin_remove_member`: 2
- `resolve_moderation_item`: 2
- `queue_profile_notifications`: 2

The effective live behavior therefore depends on which SQL script was last applied.

### CSS and cache layering

The 4,319-line base stylesheet is followed by scripts that inject more CSS and override menu sizing, pointer events, overflow and scroll locking. Dated query strings plus a service worker allow different devices to execute different combinations of code.

## Configuration baseline

- Static HTML/CSS/JavaScript site.
- Domain: `www.jpinnovation.co.uk`.
- Supabase Auth and data access through `@supabase/supabase-js` v2 loaded from CDN.
- Supabase project URL and public anonymous key are present in client code; no server secret was found in the inventory.
- No `.env` file or `.openai/hosting.json` was found.
- No repository GitHub workflow directory was found in the checked working tree.
- Repository SQL cannot prove the live schema because scripts overlap and are manually applied.

## Retirement candidates

After feature-equivalent replacements pass tests, the rebuild entry point must stop loading the legacy Admin overrides, profile-menu fixes, notification fixes, directory/profile sync fixes, access-tier fix, thread/profile/sign-out fix and overlapping approval/account bridges. Working behavior will be migrated before deletion.

## Recommendation

Do not continue patching `main`. Build a modular application on `refactor/controlled-rebuild`, reconcile the live Supabase schema into ordered migrations, and migrate one tested vertical journey at a time. Production remains unchanged until the acceptance suite and rollback checklist pass.