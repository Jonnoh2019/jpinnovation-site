# Controlled Rebuild Plan

## Delivery gates

Production `main` is not changed by rebuild work.

### Gate 1 — Baseline and specification

- Protected production branch.
- Local working-tree archive.
- Technical audit.
- Site/role specification.
- Database/configuration inventory.

### Gate 2 — Foundation

- Modular build preserving static deployability.
- Single router.
- Supabase client adapter.
- Session/profile/permission stores.
- Design tokens and shared application shell.
- Unit and browser-test infrastructure.
- Environment example containing public configuration names only.

### Gate 3 — Vertical journeys

Implement and test in this order:

1. Public website and Client/Hub landing/auth entry.
2. Authentication and role routing.
3. Shared header, navigation, avatar and profile menu.
4. Client Portal quotes/projects/messages.
5. Hub discussions, directory, projects, resources and events.
6. Admin accounts and approvals.
7. Profile-photo workflow.
8. Notifications and PWA.
9. Analytics and remaining Admin tools.

Each journey replaces its legacy equivalent only in the rebuild entry point.

### Gate 4 — Database reconciliation

- Introspect the actual live Supabase schema.
- Create one baseline migration from verified live state.
- Add ordered correction migrations.
- Consolidate duplicate functions and policies.
- Add transaction-safe RPCs for role changes, approvals, moderation and analytics reset.
- Test RLS as Admin, Hub member, Client and unauthenticated user.

No destructive live migration without reviewed backup and rollback SQL.

### Gate 5 — Regression suite

Automated:

- Role/permission matrix tests.
- Menu cleanup and avatar component tests.
- API failure and slow-response tests.
- Mobile and desktop browser journeys.
- Repeated open/close/navigation loops.
- Accessibility checks.
- Image and route smoke tests.

Manual:

- Android Chrome/PWA.
- Notification permission/display/click.
- Browser Back.
- Signed-in/out cache behavior.
- Supabase workflows with dedicated test accounts.

### Gate 6 — Release candidate

- Build artifact.
- Console/network error report.
- Screenshots/recording of key journeys.
- Database migration report.
- Exact file replacement list.
- Rollback rehearsal.

### Gate 7 — Production

Only after explicit approval:

1. Confirm protected production reference.
2. Apply reviewed database migrations.
3. Deploy the tested release commit.
4. Run production smoke tests.
5. Monitor errors and critical journeys.
6. Roll back immediately if acceptance fails.

## Proposed source structure

```text
src/
  app/
    router.js
    routes.js
    bootstrap.js
    error-boundary.js
  config/
    environment.js
  auth/
    session-service.js
    profile-store.js
    permissions.js
    route-guards.js
  data/
    supabase-client.js
    profiles-repository.js
    accounts-repository.js
    approvals-repository.js
    discussions-repository.js
    projects-repository.js
    quotes-repository.js
    messages-repository.js
    notifications-repository.js
    analytics-repository.js
  components/
    AppHeader.js
    Avatar.js
    RoleBadge.js
    NavigationMenu.js
    ProfileMenu.js
    Modal.js
    Toast.js
    LoadingState.js
    EmptyState.js
    ErrorState.js
  features/
    public/
    client/
    hub/
    admin/
    profile/
    notifications/
  styles/
    tokens.css
    base.css
    layout.css
    components.css
  pwa/
    service-worker.js
tests/
  unit/
  integration/
  e2e/
supabase/
  migrations/
  tests/
```

## Rollback

- Protected production snapshot remains unchanged.
- Local source archive and visual baseline are retained.
- Database changes have compensating/rollback scripts where safe.
- Release deploy is one commit and can be reverted to the protected production SHA.
- Service-worker cache version changes only at release and is rolled back with the application.