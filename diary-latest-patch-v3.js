(function () {
  var main = document.querySelector('[data-archive=diary]');
  var tree = document.querySelector('#archive-tree');
  var reader = document.querySelector('#archive-reader');
  if (!main || !tree || !reader) return;

  var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  waitForTree().then(function () {
    loadEntries().then(function (entries) {
      entries
        .filter(function (entry) { return entry && entry.date; })
        .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); })
        .forEach(addEntryToTree);
    });
  });

  function loadEntries() {
    var embedded = Array.isArray(window.DIARY_LATEST_ENTRIES) ? window.DIARY_LATEST_ENTRIES : [];
    return fetch('data/diary-latest.json', { cache: 'no-store' })
      .then(function (response) { return response.ok ? response.json() : []; })
      .catch(function () { return []; })
      .then(function (jsonEntries) {
        var byDate = {};
        embedded.concat(Array.isArray(jsonEntries) ? jsonEntries : []).forEach(function (entry) {
          if (entry && entry.date) byDate[entry.date] = entry;
        });
        return Object.keys(byDate).map(function (date) { return byDate[date]; });
      });
  }

  function waitForTree() {
    return new Promise(function (resolve) {
      var check = function () {
        if (tree.querySelector('.tree-group')) resolve();
        else window.setTimeout(check, 80);
      };
      check();
    });
  }

  function addEntryToTree(entry) {
    var parts = String(entry.date).split('-');
    var year = parts[0];
    var month = parts[1];
    var day = parts[2];
    var monthLabel = monthNames[Number(month) - 1] || month;
    var yearGroup = ensureGroup(tree, year, true);
    var monthGroup = ensureGroup(getChildren(yearGroup), monthLabel, true);
    var monthChildren = getChildren(monthGroup);
    if (!monthChildren) return;

    var exists = Array.from(monthChildren.querySelectorAll('.tree-leaf')).some(function (leaf) {
      return leaf.dataset.date === entry.date || leaf.textContent.trim() === String(Number(day));
    });
    if (exists) return;

    var leaf = document.createElement('button');
    leaf.className = 'tree-leaf';
    leaf.type = 'button';
    leaf.textContent = String(Number(day));
    leaf.dataset.date = entry.date;
    leaf.addEventListener('click', function () {
      document.querySelectorAll('.tree-leaf.active').forEach(function (item) { item.classList.remove('active'); });
      leaf.classList.add('active');
      renderDiaryEntry(entry);
    });
    monthChildren.prepend(leaf);
  }

  function ensureGroup(root, label, open) {
    var existing = findDirectGroup(root, label);
    if (existing) {
      setGroupOpen(existing, open);
      return existing;
    }
    var group = document.createElement('div');
    group.className = 'tree-group';
    var toggle = document.createElement('button');
    toggle.className = 'tree-toggle';
    toggle.type = 'button';
    toggle.textContent = label;
    var children = document.createElement('div');
    children.className = 'tree-children';
    toggle.addEventListener('click', function () {
      setGroupOpen(group, toggle.getAttribute('aria-expanded') !== 'true');
    });
    group.append(toggle, children);
    root.prepend(group);
    setGroupOpen(group, open);
    return group;
  }

  function findDirectGroup(root, label) {
    if (!root) return null;
    return Array.from(root.children).find(function (group) {
      if (!group.classList || !group.classList.contains('tree-group')) return false;
      var toggle = Array.from(group.children).find(function (child) { return child.classList && child.classList.contains('tree-toggle'); });
      return toggle && toggle.textContent.trim() === label;
    });
  }

  function getChildren(group) {
    if (!group) return null;
    return Array.from(group.children).find(function (child) { return child.classList && child.classList.contains('tree-children'); });
  }

  function setGroupOpen(group, open) {
    var toggle = Array.from(group.children).find(function (child) { return child.classList && child.classList.contains('tree-toggle'); });
    var children = getChildren(group);
    if (!toggle || !children) return;
    toggle.setAttribute('aria-expanded', String(open));
    children.hidden = !open;
    children.classList.toggle('is-collapsed', !open);
    children.style.display = open ? '' : 'none';
  }

  function renderDiaryEntry(entry) {
    var body = Array.isArray(entry.body) ? entry.body.filter(function (item) { return typeof item === 'string'; }) : [];
    reader.innerHTML = '<h1>' + escapeHtml(formatDate(entry.date)) + '</h1><div class=entry-body>' + body.map(function (paragraph) {
      return '<p>' + escapeHtml(paragraph) + '</p>';
    }).join('') + '</div>';
  }

  function formatDate(value) {
    var date = new Date(String(value) + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return value || '';
    return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  }

  function escapeHtml(value) {
    return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }
}());
