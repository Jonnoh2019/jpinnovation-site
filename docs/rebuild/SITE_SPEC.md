# JP Innovation Site Specification — Source of Truth

Date: 2026-07-28

## Product areas

1. Public website
2. Client Portal
3. JP Innovation Hub
4. Separate Admin area

These areas share authentication, identity/profile data, notifications, header primitives, avatar styling and error handling. Permissions are explicit and never inferred from presentation.

## Roles and access

### Public

May browse public pages and the Client/Hub landing information, then register or sign in. No private data.

### Client

May use the Client Portal, view/request/respond to own quotes, view own projects, message JP Innovation, manage own profile/settings and request a Hub upgrade. No Hub discussions, directory, member resources or Admin routes.

### Paid Hub member

Retains client-work data inside the Hub experience and may use discussions, Hub projects, quotes, messages, directory, resources, events, reputation and profile. May submit moderated content. No Admin routes or Admin data.

### Admin

Has Hub/member access plus a separate Admin area for accounts, approvals, moderation, analytics, notifications, projects, quotes and audit history. The signed-in Admin cannot suspend, downgrade or delete their own Admin account.

## Canonical account state

One profile record is authoritative:

- `role`: `admin | hub_member | client`
- `account_status`: `pending | active | suspended | archived`
- `membership_status`: `free | pending | active | cancelled`
- `verified_at`: nullable timestamp
- `profile_photo_status`: `none | pending | approved | rejected`
- `profile_photo_url`: approved public photo only
- `pending_profile_photo_key`: private pending object reference

One permissions module derives access from these fields. Components never infer permission from text labels, colours, email addresses or local storage.

## Routes

Public:

- `/`
- `/client`
- `/hub`

Client:

- `/app/client/dashboard`
- `/app/client/quotes`
- `/app/client/projects`
- `/app/client/messages`
- `/app/profile`
- `/app/settings`

Hub member:

- `/app/hub/dashboard`
- `/app/hub/discussions`
- `/app/hub/projects`
- `/app/hub/quotes`
- `/app/hub/messages`
- `/app/hub/directory`
- `/app/hub/resources`
- `/app/hub/events`
- `/app/profile`
- `/app/settings`

Admin:

- `/app/admin`
- `/app/admin/accounts`
- `/app/admin/approvals`
- `/app/admin/moderation`
- `/app/admin/analytics`
- `/app/admin/notifications`

The router has one owner. Closing a menu changes menu state only. Route loading never renders Dashboard as a fallback. Browser Back first closes an open menu/modal, otherwise navigates history.

## Shared UI contracts

### Avatar

One component, three variants:

- Admin: premium dark-gold fill, white initials, blue outline.
- Hub member: deep blue fill, white initials, gold outline.
- Client: deep blue fill, white initials, white outline.

All variants use `aspect-ratio: 1 / 1`, mathematical centering, shared ring thickness, approved photo when present and initials fallback.

### Header

One responsive shell with the same logo source, header height, control sizes and spacing. Role-specific controls are slots rather than separate headers.

### Profile menu

One component, event owner, backdrop, scroll lock and cleanup path. Items come from the permission matrix. It resets internal scroll on open and fully unmounts on close/navigation.

### Navigation menu

One interaction primitive for Public, Client, Hub and Admin shells. Content differs by role/area; lifecycle logic does not.

### Feedback

One toast system and one confirmation modal. No browser alerts for application actions. Every mutation has idle, pending, success and error states.

## Authentication

Supabase Auth is the identity provider. Boot has three explicit states: loading, authenticated and unauthenticated. One session service owns `getSession` and the auth subscription. Profile/permissions load only after identity resolution. No redirect occurs while auth/profile state is unresolved.

Role changes invalidate profile/permission queries and refresh profile/session data before guards are re-evaluated.

## Data access

All Supabase access sits behind repositories/services for profiles, Admin accounts, approvals, quotes, projects, discussions/replies, messages, notifications, profile photos, analytics and presence. Views never call Supabase directly.

Every mutation returns a result object and UI refreshes from the database result. Optimistic changes require a rollback path.

## Membership upgrade

1. Client submits one request.
2. Canonical request becomes pending.
3. Admin task/notification derives from that record.
4. Admin approves/rejects through one transactional RPC.
5. Approval atomically updates role/membership and writes audit history.
6. Profile/permissions refetch.
7. User receives the new access after refresh.
8. Refresh and re-login preserve the change.

## Profile-photo approval

1. Member uploads to private pending storage.
2. One pending record is created atomically.
3. All Admin counters derive from that record.
4. Approval promotes it to the approved profile photo and records reviewer/time.
5. Rejection keeps the current public photo.
6. Query invalidation updates every avatar from the shared profile record.

## Notifications

One canonical notifications source, one browser dispatcher and one click-routing map. Stable event IDs prevent duplicates. PWA service worker displays and routes phone notifications; page scripts do not duplicate service-worker deliveries. Failures show a toast and never block navigation.

## Loading and errors

Every route supports loading, empty, success, recoverable error, unauthorized and offline/slow states where relevant. Route errors show Retry and Back to Dashboard. No blank black screen.

## Visual identity

Preserve the current dark JP Innovation theme, blue accents, premium gold hierarchy, logo, approved imagery and compact responsive direction. This is a functional reconstruction, not a visual redesign.