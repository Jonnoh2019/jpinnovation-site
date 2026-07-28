# Production Baseline Record

Date: 2026-07-28

## Protected references

- Production source snapshot: `backup/production-pre-rebuild-2026-07-28`
- Rebuild work: `refactor/controlled-rebuild`
- Production remains: `main`

## Local evidence

A local archive was created outside the repository:

- `outputs/jpinnovation-pre-rebuild-2026-07-28.zip`
- Size: 5,760,187 bytes

The local checkout was deliberately not committed because it is 17 commits ahead of its tracked origin and contains many modified/untracked files. It is preserved as evidence rather than treated as the authoritative production source.

Visual baselines:

- `outputs/baseline-home-desktop-2026-07-28.png`
- `outputs/baseline-home-mobile-390-2026-07-28.png`
- `outputs/baseline-hub-landing-mobile-390-2026-07-28.png`

## Deployment and configuration

- Domain: `www.jpinnovation.co.uk`
- Repository: `Jonnoh2019/jpinnovation-site`
- Production branch: `main`
- Application: static website
- Backend/auth: Supabase
- Client: `@supabase/supabase-js` v2 from CDN
- PWA: `site.webmanifest` and `jp-service-worker.js`
- No server secret is recorded here.
- No `.env` file was found in the working-tree inventory.
- SQL is manually applied; no ordered migration runner is currently present.

## Live verification

The public homepage loaded on desktop and 390px mobile with no initial warning/error console entries captured.

The signed-in Hub loaded the Admin dashboard and opened the profile menu. Selecting **Admin review** caused the browser-controlled interaction to time out, confirming the live freeze/navigation defect.