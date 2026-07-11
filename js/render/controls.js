// controls.js — shared, working control widgets used across views.
// They mutate the shared `state` and call an onChange callback to re-render.

import { CHROMATIC_SHARP } from "../theory/pitch.js";

export function rootPicker(state, onChange) {
  const wrap = document.createElement("label");
  wrap.textContent = "Root ";
  const sel = document.createElement("select");
  for (const n of CHROMATIC_SHARP) {
    const o = document.createElement("option");
    o.value = n; o.textContent = n;
    if (n === state.root) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener("change", () => { state.root = sel.value; onChange(); });
  wrap.appendChild(sel);
  return wrap;
}

export function octaveRangePicker(state, onChange, { minOctave = 0, maxOctave = 8 } = {}) {
  const wrap = document.createElement("label");
  wrap.textContent = "Octaves ";
  const mk = (val, key) => {
    const s = document.createElement("select");
    for (let o = minOctave; o <= maxOctave; o++) {
      const opt = document.createElement("option");
      opt.value = o; opt.textContent = o;
      if (o === val) opt.selected = true;
      s.appendChild(opt);
    }
    s.addEventListener("change", () => {
      state[key] = parseInt(s.value, 10);
      if (state.octaveLow > state.octaveHigh) [state.octaveLow, state.octaveHigh] = [state.octaveHigh, state.octaveLow];
      onChange();
    });
    return s;
  };
  wrap.append(mk(state.octaveLow, "octaveLow"), document.createTextNode(" – "), mk(state.octaveHigh, "octaveHigh"));
  return wrap;
}
