const archive = document.querySelector("[data-archive]");
const tree = document.querySelector("#archive-tree");
const reader = document.querySelector("#archive-reader");

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

if (archive && tree && reader) {
  const type = archive.dataset.archive;
  const source = type === "letters" ? "data/letters.json" : "data/diary.json";

  loadEntries(type, source)
    .then((entries) => {
      if (!Array.isArray(entries) || entries.length === 0) {
        renderEmpty(type);
        return;
      }

      const sorted = sortEntries(type, entries);
      if (type === "letters") {
        buildLetters(sorted);
        renderEntry(sorted[0], type);
        const firstLeaf = tree.querySelector(".tree-leaf");
        if (firstLeaf) firstLeaf.classList.add("active");
      } else {
        buildDiary(sorted);
        renderDiaryIntro();
      }
    })
    .catch(() => renderEmpty(type));
}

function loadEntries(type, source) {
  return fetchJson(source).then((entries) => {
    if (type !== "diary") return entries;

    return fetchJson("data/diary-updates.json", true).then((updates) => [
      ...entries,
      ...updates
    ]);
  });
}

function fetchJson(source, optional = false) {
  return fetch(source)
    .then((response) => {
      if (!response.ok) {
        if (optional) return [];
        throw new Error(`Could not load ${source}`);
      }
      return response.json();
    })
    .then((entries) => (Array.isArray(entries) ? entries : []));
}

function sortEntries(type, entries) {
  return [...entries].sort((a, b) => {
    if (type === "letters") {
      return `${a.person || ""}${b.date || ""}`.localeCompare(`${b.person || ""}${a.date || ""}`);
    }
    return String(b.date || "").localeCompare(String(a.date || ""));
  });
}

function buildDiary(entries) {
  const grouped = new Map();
  const activeDate = String(entries[0]?.date || "");
  const [activeYear, activeMonth] = activeDate.split("-");

  entries.forEach((entry) => {
    const [year, month] = String(entry.date).split("-");
    if (!grouped.has(year)) grouped.set(year, new Map());
    if (!grouped.get(year).has(month)) grouped.get(year).set(month, []);
    grouped.get(year).get(month).push(entry);
  });

  grouped.forEach((months, year) => {
    const yearGroup = makeGroup(year, year === activeYear);
    months.forEach((items, month) => {
      const monthLabel = monthNames[Number(month) - 1] || month;
      const monthGroup = makeGroup(monthLabel, year === activeYear && month === activeMonth);
      items.forEach((entry) => monthGroup.children.append(makeLeaf(diaryLeafLabel(entry), entry, "diary")));
      yearGroup.children.append(monthGroup.root);
    });
    tree.append(yearGroup.root);
  });
}

function buildLetters(entries) {
  const grouped = new Map();

  entries.forEach((entry) => {
    const person = entry.person || "Unnamed";
    if (!grouped.has(person)) grouped.set(person, []);
    grouped.get(person).push(entry);
  });

  grouped.forEach((items, person) => {
    const personGroup = makeGroup(person, true);
    items.forEach((entry) => personGroup.children.append(makeLeaf(entry.title || entry.date, entry, "letters")));
    tree.append(personGroup.root);
  });
}

function makeGroup(label, open = false) {
  const root = document.createElement("div");
  root.className = "tree-group";

  const toggle = document.createElement("button");
  toggle.className = "tree-toggle";
  toggle.type = "button";
  toggle.textContent = label;
  toggle.setAttribute("aria-expanded", String(open));

  const children = document.createElement("div");
  children.className = "tree-children";
  setGroupOpen(toggle, children, open);

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    setGroupOpen(toggle, children, !expanded);
  });

  root.append(toggle, children);
  return { root, children };
}

function setGroupOpen(toggle, children, open) {
  toggle.setAttribute("aria-expanded", String(open));
  children.hidden = !open;
  children.classList.toggle("is-collapsed", !open);
  children.style.display = open ? "" : "none";
}

function makeLeaf(label, entry, type) {
  const leaf = document.createElement("button");
  leaf.className = "tree-leaf";
  leaf.type = "button";
  leaf.textContent = label;
  leaf.addEventListener("click", () => {
    document.querySelectorAll(".tree-leaf.active").forEach((item) => item.classList.remove("active"));
    leaf.classList.add("active");
    renderEntry(entry, type);
  });
  return leaf;
}

function diaryLeafLabel(entry) {
  const date = new Date(`${entry.date}T00:00:00`);
  if (Number.isNaN(date.getTime())) return entry.date || "Untitled";

  return String(date.getDate());
}

function renderEntry(entry, type) {
  const body = Array.isArray(entry.body) ? entry.body : [];
  const meta = type === "letters" ? `<span class="person">${escapeHtml(entry.person || "")}</span>` : "";
  const title = type === "letters" ? entry.title || "Untitled" : formatDate(entry.date);

  reader.innerHTML = `
    ${meta}
    <h1>${escapeHtml(title)}</h1>
    <div class="entry-body">
      ${body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
    </div>
  `;
}

function renderEmpty(type) {
  const label = type === "letters" ? "letters" : "diary entries";
  tree.innerHTML = "";
  reader.innerHTML = `<p class="empty-state">No ${label} yet.</p>`;
}

function renderDiaryIntro() {
  reader.innerHTML = `
    <h1>Diary</h1>
    <div class="entry-body">
      <p>This space is reserved for an introduction to the diary.</p>
    </div>
  `;
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value || "";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
