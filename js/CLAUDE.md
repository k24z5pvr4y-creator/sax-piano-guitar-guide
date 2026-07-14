# js/ — app source

Read the root `CLAUDE.md` first for the full architecture picture; this file
is just a map of this subtree.

```
js/app.js      hash router + shared `state` + route table (imports every view)
js/theory/     pure pitch/scale/chord math — no DOM, no fetch. See theory/CLAUDE.md
js/render/     instrument renderers + shared controls — DOM building, no theory math.
               See render/CLAUDE.md
js/views/      one module per route, composing controls + theory + renderer.
               See views/CLAUDE.md
```

**Layering rule:** `theory/` never touches the DOM, `render/` never imports
scale/chord interval logic (it receives already-computed pitch classes/notes
from the view), `views/` is the only layer allowed to import from all three.
If you find yourself computing an interval or transposing a pitch inside a
`render/` or `views/` file, that logic almost certainly belongs in `theory/`
instead — check there first before adding it inline.

**Adding a new route:** add the view module, import it in `app.js`, add one
line to the `routes` table there (path → `{ title, crumbs, render }`). The
router has no unmount hook — `viewEl.innerHTML = ""` just clears DOM on
navigation — so any listener a view attaches must be scoped to an element
inside `#view` (torn down for free when cleared), never to `document` or
`window`, or it leaks across navigations. See `sax-translator.js`'s
`#kbwrap`-scoped keydown listener for the pattern.

**State:** `js/app.js` owns the shared `state` object (`instrument`,
`octaveLow/High`, `root`). Views lazily attach their own fields the first
time they render (`state.foo ??= …`) so per-view state persists across
navigation without polluting the shared shape. Full field-by-field
breakdown is in the root `CLAUDE.md`'s "Architecture" section — don't add a
new shared field there without checking it's actually needed by more than
one view; single-view state should be lazily attached instead.
