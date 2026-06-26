(function () {
  const main = document.querySelector('[data-archive="diary"]');
  const tree = document.querySelector('#archive-tree');
  const reader = document.querySelector('#archive-reader');
  if (!main || !tree || !reader) return;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  waitForTree().then(() => {
    fetch('data/diary-latest.json', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : []))
      .then((entries) => {
        if (!Array.isArray(entries)) return;
        entries
          .filter((entry) => entry && entry.date)
          .sort((a, b) => String(b.date).localeCompare(String(a.date)))
          .forEach(addEntryToTree);
      })
      .catch(() => {});
  });

  function waitForTree() {
    return new Promise((resolve) => {
      const check = () => {
        if (tree.querySelector('.tree-group')) resolve();
        else window.setTimeout(check, 80);
      };
      check();
    });
  }

  function addEntryToTree(entry) {
    const [year, month, day] = String(entry.date).split('-');
    const monthLabel = monthNames[Number(month) - 1] || month;
    const yearGroup = findGroup(tree, year);
    const monthGroup = yearGroup ? findGroup(yearGroup, monthLabel) : null;
    const children = monthGroup ? getChildren(monthGroup) : null;
    if (!children) return;

    const exists = Array.from(children.querySelectorAll('.tree-leaf')).some((leaf) => {
      return leaf.dataset.date === entry.date || leaf.textContent.trim() === String(Number(day));
    });
    if (exists) return;

    const leaf = document.createElement('button');
    leaf.className = 'tree-leaf';
    leaf.type = 'button';
    leaf.textContent = String(Number(day));
    leaf.dataset.date = entry.date;
    leaf.addEventListener('click', () => {
      document.querySelectorAll('.tree-leaf.active').forEach((item) => item.classList.remove('active'));
      leaf.classList.add('active');
      renderDiaryEntry(entry);
    });

    children.prepend(leaf);
  }

  function findGroup(root, label) {
    return Array.from(root.querySelectorAll('.tree-group')).find((group) => {
      const toggle = Array.from(group.children).find((child) => child.classList && child.classList.contains('tree-toggle'));
      return toggle && toggle.textContent.trim() === label;
    });
  }

  function getChildren(group) {
    return Array.from(group.children).find((child) => child.classList && child.classList.contains('tree-children'));
  }

  function renderDiaryEntry(entry) {
    const body = Array.isArray(entry.body) ? entry.body.filter((item) => typeof item === 'string') : [];
    reader.innerHTML = `
      <h1>${escapeHtml(formatDate(entry.date))}</h1>
      <div class="entry-body">
        ${body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      </div>
    `;
  }

  function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value || '';
    return new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}());
