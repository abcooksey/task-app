# Performance Measurements

This document tracks performance metrics for Homestead.

## Bundle Size Analysis

**Measured:** Phase 4 completion (Avatar & Wardrobe)

### Production Build Output

```
dist/assets/index-bbXuZ6PL.js   2,329.28 kB │ gzip: 570.67 kB
```

### Breakdown

| Category | Estimated Size | Notes |
|----------|----------------|-------|
| Phaser 3 | ~1,200 KB | Game engine (expected) |
| React + ReactDOM | ~140 KB | Core framework |
| TanStack Query | ~40 KB | Data fetching |
| Supabase Client | ~80 KB | Backend SDK |
| Application Code | ~200 KB | Components, hooks, game logic |
| Other Dependencies | ~100 KB | Zod, chrono-node, utilities |

### Targets vs Actual

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Total JS (gzipped) | < 400 KB (excl. Phaser) | ~570 KB total | Phaser accounts for ~300 KB gzipped |
| App JS (excl. Phaser) | < 400 KB | ~270 KB | ✅ Pass |

### Recommendations for Phase 5

1. **Code-split Phaser** - Load game engine only when navigating to `/home`
2. **Lazy load game scenes** - Split HouseScene, PlacementScene into chunks
3. **Tree-shake Phaser** - Import only used modules if possible

---

## Asset Budget

### Sprite Assets

| Category | File Count | Total Size | Budget |
|----------|------------|------------|--------|
| Furniture sprites | 86 | ~500 KB | 2 MB |
| Avatar placeholders | 132 | 84.6 KB | 500 KB |
| Holiday/Seasonal | 35 | ~200 KB | 500 KB |
| **Total** | 253 | ~785 KB | 4 MB |

✅ Well under 4 MB asset budget

---

## Runtime Performance

### Today Screen

| Metric | Target | Notes |
|--------|--------|-------|
| First Contentful Paint | < 1s | Measure with Lighthouse |
| Time to Interactive | < 1.5s | Tasks visible and clickable |

### House Scene (/home)

| Metric | Target | Notes |
|--------|--------|-------|
| Scene load time | < 2s | From navigation to playable |
| 60 FPS during play | Yes | Monitor with Phaser debug |
| Memory usage | < 150 MB | Check Chrome DevTools |

### Wardrobe Page

| Metric | Target | Notes |
|--------|--------|-------|
| Avatar preview render | < 500ms | Sprite composition |
| Category switch | < 100ms | Tab navigation |

---

## Measurement Commands

```bash
# Production build with size analysis
npm run build

# Run Lighthouse audit
npx lighthouse http://localhost:4173 --view

# Bundle analysis (add to package.json if needed)
npx vite-bundle-visualizer
```

---

## Historical Measurements

| Phase | Date | Bundle Size (gzip) | Notes |
|-------|------|-------------------|-------|
| Phase 4 Complete | 2024-01 | 570.67 KB | Includes Phaser, Avatar system |

---

## Next Steps

- [ ] Implement Phaser code-splitting in Phase 5
- [ ] Add performance monitoring (Web Vitals)
- [ ] Set up CI bundle size checks
