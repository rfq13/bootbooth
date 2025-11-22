# Visual & Animation Guidelines

## Branding Palette
- Accent: `#DDBFA2`
- Accent 2: `#E8D3BA`
- Text (light): `#111827`
- Text (dark): `#e5e7eb`
- Panel (light): `#ffffff`
- Panel (dark): `#171a1d`

Tokens are defined in `src/styles/tokens.css` and include a centralized gradient `--accent-gradient`. Dark mode is enabled via `prefers-color-scheme`.

## Accessibility (WCAG AA)
- Text on light backgrounds uses `#111827` for contrast ≥ 7.0.
- Text on dark backgrounds uses `#e5e7eb` for contrast ≥ 7.0.
- Accent colors are used for backgrounds, with text falling back to high-contrast colors.

## Images
- Hero image must be ≥ 1920px width.
- Use `<picture>` with WebP source and JPEG fallback.
- Above-the-fold assets are preloaded in `index.html`.
- Below-the-fold images use `loading="lazy"`, `decoding="async"`.

## Animations
- GSAP is loaded dynamically for client-only rendering.
- ScrollTrigger is registered when available, with:
  - Section transitions: duration 0.8s, ease `power2.out`.
  - Trigger points: `top 75%`, `top 50%`, `top 25%` depending on section importance.
  - Parallax: `yPercent: -20` with `scrub: true` for hero figure.
- Fallback uses IntersectionObserver with CSS `reveal`/`reveal-visible`.

## Performance
- Ensure Lighthouse Performance ≥ 90 by keeping animation work GPU-friendly and minimizing layout thrashing.
- Prefer transforms (`translate`, `scale`) over properties that trigger reflow.

## Cross-Browser
- Tested with Chrome, Firefox, Safari, Edge.
- Fallback ensures functionality where GSAP/ScrollTrigger is unavailable.