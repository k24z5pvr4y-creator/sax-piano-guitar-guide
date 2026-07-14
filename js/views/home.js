// home.js — the "Choose Instrument" root of the tree.
// Fully working: three instrument cards, each expanding to its sub-branches.

const TREE = [
  { name: "Saxophone",
    children: [
      { name: "Note Translator",   path: "#/sax/translator" },
      { name: "Scales",            path: "#/sax/scales" },
      { name: "Fingering Intuition", path: "#/learn/how-it-works" },
    ] },
  { name: "Piano",
    children: [
      { name: "Scales", path: "#/piano/scales" },
      { name: "Chords", path: "#/piano/chords" },
    ] },
  { name: "Guitar",
    children: [
      { name: "Scales", path: "#/guitar/scales" },
      { name: "Chords", path: "#/guitar/chords" },
    ] },
];

export function renderHome(el) {
  el.innerHTML = `
    <p class="eyebrow">Shadi's reference for</p>
    <h1>Sax · Piano · Guitar</h1>
    <div class="instrument-grid">
      ${TREE.map(inst => `
        <div class="nav-card">
          <h3>${inst.name}</h3>
          <div class="controls" style="margin-top:14px">
            ${inst.children.map(c => `<a class="nav-card" style="min-height:auto;padding:10px 14px" href="${c.path}">${c.name} →</a>`).join("")}
          </div>
        </div>`).join("")}
    </div>`;
}
