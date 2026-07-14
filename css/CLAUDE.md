# css/ — tokens, reset, component skins

```
tokens.css       single source of truth for color/spacing/type. Change a
                  value here, not in a component rule.
base.css         reset + editorial typography + app shell layout (#app,
                  .topbar, .breadcrumb, .view). Global element defaults
                  (button/select/input sizing) live here.
components.css   one skin section per component the render/ layer generates
                  markup for. The renderer owns the DOM structure; this file
                  only owns how it looks.
```

**Orange accent only** (`--tone-accent` / `--tone-accent-light`) is the
app-wide default — teal is fully retired, don't reintroduce it. The one
exception is Guitar ▸ Scales' 7-color per-letter note scheme
(`noteColors.js`, wired in via `colorByNote`) — that's scoped to that single
view; don't reuse those hex values elsewhere without checking with the user
first, it was an explicit scoped request.

**Dark mode** flips ONLY `--surface`/`--ink`/`--border`/black-key/pressed/
fret-wire tokens in `tokens.css`'s `:root[data-theme="dark"]` block — white
piano keys and the accent tokens stay identical in both themes by design.
If you add a new color token, decide explicitly whether it needs a dark
override or is meant to stay constant; don't assume.

**Touch targets:** every interactive element needs the 44px `--touch-min`
floor (`env(safe-area-inset-*)`-aware layout). `button` and `select` both
carry this in `base.css`; if you add a new interactive element type, it
needs its own explicit rule — the shared `button, select, input { font:
inherit }` reset selector does NOT also grant touch sizing (this exact gap
shipped once: every dropdown in the app rendered ~20px tall until fixed).

**Before adding a new class:** check `components.css`'s existing sections
first — most new UI in this app has been built by adding a section here to
skin markup a renderer already produces, not by inventing a parallel style
system. See the root `CLAUDE.md` and `docs/app-cosmetic-adjustments.md` for
the full cosmetic spec and its design-iteration history.
