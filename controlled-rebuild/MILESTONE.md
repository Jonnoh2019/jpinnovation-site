# Controlled rebuild — foundation milestone

Status: isolated rebuild branch only. Not deployed to production.

## Implemented

- One canonical role model: public, client, Hub member and Admin.
- One central route table and access check.
- One client-side router using the History API.
- One overlay manager that owns scroll locking and cleanup.
- One profile menu implementation that is removed from the DOM when closed.
- One shared role-avatar implementation.
- Separate Admin, Hub member and Client dashboard routes.
- Neutral denial routing: a user is returned to their own home route, never granted a higher role.

## Verified

- 8 automated unit/source regression tests pass.
- JavaScript syntax checks pass.
- Profile menu opened and closed successfully 10 consecutive times.
- Admin → My Profile navigation opens the destination directly.
- Browser Back returns to Admin Review without a reload.
- Overlay count returns to zero after close and after navigation.
- Body scroll locking is restored after close and navigation.
- Client and Hub member attempts to open Admin routes are redirected to their own dashboards.
- No browser warning or error logs were produced during the checks.
- At 390 × 844 the complete profile menu remains inside the visible viewport.

## Defect found and corrected during testing

The first version registered the profile trigger with a one-shot event listener. That
made the menu stop opening after its first close until the page rerendered. The
listener is now persistent for the lifetime of the rendered shell, and a regression
test prevents `once: true` being reintroduced.

## Next migration gate

Connect the shell to the existing Supabase session through a single auth store, then
migrate account/profile reads behind repository modules. Production remains unchanged
until the authenticated role tests and account-management workflows pass.
