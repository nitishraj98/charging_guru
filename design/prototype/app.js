/* Charging Guru prototype — tiny router + interactions (no deps) */
(function () {
  function showApp(id) {
    document.querySelectorAll('.app').forEach(a => a.classList.toggle('on', a.id === id));
    document.querySelectorAll('[data-app]').forEach(b =>
      b.classList.toggle('on', b.dataset.app === id));
    const first = document.querySelector('#' + id + ' .screen');
    if (first) showScreen(first.id, id);
    const stage = document.querySelector('.stage');
    if (stage) stage.scrollTop = 0;
  }

  function showScreen(screenId, appId) {
    const scope = appId ? document.getElementById(appId) : document;
    if (!scope) return;
    scope.querySelectorAll('.screen').forEach(s =>
      s.classList.toggle('on', s.id === screenId));
    // highlight any nav control pointing at this screen (menus, tabbars, rails)
    scope.querySelectorAll('[data-goto]').forEach(b => {
      if (b.closest('.screenmenu') || b.closest('.rail') || b.closest('.tabbar'))
        b.classList.toggle('on', b.dataset.goto === screenId);
    });
  }

  document.addEventListener('click', e => {
    const appBtn = e.target.closest('[data-app]');
    if (appBtn) { showApp(appBtn.dataset.app); return; }

    const goto = e.target.closest('[data-goto]');
    if (goto) {
      const app = goto.closest('.app');
      showScreen(goto.dataset.goto, app ? app.id : null);
      const v = goto.closest('.viewport') || goto.closest('.display') || goto.closest('.content');
      if (v) v.scrollTop = 0;
    }
  });

  const t = document.getElementById('themeToggle');
  if (t) t.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', cur === 'light' ? 'dark' : 'light');
    t.textContent = cur === 'light' ? '🌙 Dark' : '☀ Light';
  });

  // boot on the cover screen
  showApp('cover');
})();
