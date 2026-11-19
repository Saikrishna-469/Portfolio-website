/* ============================================================
   Saikrishna Vennam — Portfolio v2  (script.js)
   - Typewriter role rotation (verified titles only)
   - Canvas particle field in the hero
   - Animated counters, scroll-reveal, skill bars
   - LIVE projects from the GitHub API, with a curated fallback
     if the API is unreachable / rate-limited.
   No build step. No tracking.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- multi-tab navigation (hash routing) ----------
     All 7 tabs are always visible in the nav bar;
     on narrow screens the nav row scrolls horizontally. ---------- */
  var TABS = ['home', 'about', 'experience', 'projects', 'skills', 'education', 'contact'];
  var panels = {};
  TABS.forEach(function (t) { panels[t] = document.getElementById(t); });
  var tabLinks = document.querySelectorAll('.nav-links a[data-tab]');

  function tabFromHash() {
    var h = (window.location.hash || '#home').replace('#', '');
    return TABS.indexOf(h) !== -1 ? h : 'home';
  }

  function showTab(name) {
    if (TABS.indexOf(name) === -1) name = 'home';
    TABS.forEach(function (t) {
      if (panels[t]) panels[t].classList.toggle('active', t === name);
    });
    tabLinks.forEach(function (a) {
      var on = a.getAttribute('data-tab') === name;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
    /* reveal / counters are driven by IntersectionObserver, which fires
       once the newly visible panel intersects the viewport */
    if (name === 'projects' && typeof loadRepos === 'function') loadRepos();
  }

  tabLinks.forEach(function (a) {
    a.addEventListener('click', function () {
      /* hashchange covers a new hash; call directly too so re-clicking
         the current tab still switches (hashchange does not fire then) */
      showTab(a.getAttribute('data-tab'));
    });
  });
  window.addEventListener('hashchange', function () { showTab(tabFromHash()); });
  showTab(tabFromHash());

  /* ---------- typewriter (verified titles only) ---------- */
  var roles = [
    'Data Analyst',
    'SQL · Python · Power BI',
    'Business Analyst',
    'Data Engineer',
    'Tableau · Excel · Azure'
  ];
  var typedEl = document.getElementById('typedRole');
  if (typedEl) {
    var ri = 0, ci = 0, deleting = false;
    (function tick() {
      var word = roles[ri];
      typedEl.textContent = word.slice(0, ci);
      var delay = deleting ? 35 : 70;
      if (!deleting && ci === word.length) { delay = 1800; deleting = true; }
      else if (deleting && ci === 0) { deleting = false; ri = (ri + 1) % roles.length; delay = 350; }
      else { ci += deleting ? -1 : 1; }
      setTimeout(tick, delay);
    })();
  }

  /* ---------- hero particle field ---------- */
  var canvas = document.getElementById('particles');
  if (canvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var ctx = canvas.getContext('2d');
    var W, H, pts = [];
    function resize() {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
      pts = [];
      var n = Math.min(70, Math.floor(W * H / 22000));
      for (var i = 0; i < n; i++) {
        pts.push({ x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 1.8 + 0.6,
          c: Math.random() > 0.5 ? '163,230,53' : '34,211,238' });
      }
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + p.c + ',0.7)'; ctx.fill();
        for (var j = i + 1; j < pts.length; j++) {
          var q = pts[j], dx = p.x - q.x, dy = p.y - q.y, d = dx * dx + dy * dy;
          if (d < 120 * 120) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = 'rgba(34,211,238,' + (0.12 * (1 - d / 14400)) + ')';
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }
    resize();
    window.addEventListener('resize', resize);
    draw();
  }

  /* ---------- scroll reveal + skill bars ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal, .skills-grid').forEach(function (el) { io.observe(el); });

  /* ---------- animated counters ---------- */
  function fmt(v, kind) {
    if (kind === 'comma') return v.toLocaleString('en-US');
    if (kind === 'plus') return v.toLocaleString('en-US') + '+';
    if (kind === 'pct') return v + '%';
    return String(v);
  }
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target, target = parseInt(el.dataset.target, 10), kind = el.dataset.format;
      var start = null, dur = 1600;
      (function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(Math.round(target * eased), kind);
        if (p < 1) requestAnimationFrame(step);
      })(performance.now());
      cio.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.count').forEach(function (el) { cio.observe(el); });

  /* ---------- LIVE GitHub projects ---------- */
  var grid = document.getElementById('repoGrid');
  var badge = document.getElementById('liveBadge');
  var updatedEl = document.getElementById('repoUpdated');
  var footStats = document.getElementById('footStats');

  /* Curated fallback — only repos that exist, with verified facts. */
  var FALLBACK = [
    { name: 'flight-delay-analysis', description: '7,049,869 flights analysed with DuckDB, SQL and Python — 77.3% on-time, root causes by airline, airport, route and time of day.', language: 'Python', stargazers_count: 0, updated_at: '2026-11-18T00:00:00Z', html_url: 'https://github.com/Saikrishna-469/flight-delay-analysis' },
    { name: 'hospital-readmission-analysis', description: '69,985 patients from the UCI Diabetes 130-US Hospitals dataset — 8.98% readmitted within 30 days, with risk profiles and a logistic regression model.', language: 'Python', stargazers_count: 0, updated_at: '2026-11-18T00:00:00Z', html_url: 'https://github.com/Saikrishna-469/hospital-readmission-analysis' },
    { name: 'Azure-realtime-data-platform', description: 'End-to-end realtime data platform: Airflow + Python ingestion, PySpark transforms, dbt modelling, PostgreSQL serving — 3 medallion layers.', language: 'Python', stargazers_count: 0, updated_at: '2026-11-18T00:00:00Z', html_url: 'https://github.com/Saikrishna-469/Azure-realtime-data-platform' },
    { name: 'Student-Success-Intelligence-System', description: 'SLU Canvas attendance pipeline — Python + Canvas API, SQL star schema, advisor dashboard for early at-risk outreach.', language: 'Python', stargazers_count: 0, updated_at: '2026-11-18T00:00:00Z', html_url: 'https://github.com/Saikrishna-469/Student-Success-Intelligence-System' }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderRepos(repos, live) {
    var shown = repos
      .filter(function (r) { return !r.fork; })
      .sort(function (a, b) { return new Date(b.updated_at) - new Date(a.updated_at); })
      .slice(0, 9);
    if (!shown.length) shown = FALLBACK;
    grid.innerHTML = shown.map(function (r) {
      var date = r.updated_at ? new Date(r.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
      return '<article class="repo-card"><h4><a href="' + esc(r.html_url) + '" target="_blank" rel="noopener">' + esc(r.name) + ' ↗</a></h4>' +
        '<p>' + esc(r.description || 'A data project by Saikrishna Vennam.') + '</p>' +
        '<div class="repo-meta"><span>' + esc(r.language || '—') + '</span>' +
        '<span>★ ' + (r.stargazers_count || 0) + '</span>' +
        '<span>updated ' + esc(date) + '</span></div></article>';
    }).join('');
    if (badge) {
      badge.textContent = live ? '● live from GitHub' : '● showing curated list — GitHub API unavailable';
      badge.classList.toggle('off', !live);
    }
    var latest = shown[0] && shown[0].updated_at;
    if (updatedEl && latest) updatedEl.textContent = 'last updated ' + new Date(latest).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    if (footStats) footStats.textContent = shown.length + ' repositories shown · ' + (live ? 'live from api.github.com' : 'curated fallback');
  }

  /* Lazy-loaded on first visit to the Projects tab (or on load when the
     URL hash is #projects) — so the API is not hit for other tabs. */
  var reposLoaded = false;
  function loadRepos() {
    if (reposLoaded) return;
    reposLoaded = true;
    fetch('https://api.github.com/users/Saikrishna-469/repos?sort=updated&per_page=100', { headers: { 'Accept': 'application/vnd.github+json' } })
      .then(function (res) { if (!res.ok) throw new Error('GitHub API ' + res.status); return res.json(); })
      .then(function (data) { renderRepos(Array.isArray(data) ? data : FALLBACK, true); })
      .catch(function () { renderRepos(FALLBACK, false); });
  }

  /* ---------- stats snapshot (written weekly by GitHub Actions) ---------- */
  fetch('projects.json')
    .then(function (res) { if (!res.ok) throw new Error('no snapshot'); return res.json(); })
    .then(function (snap) {
      if (footStats && snap.generated_at) {
        footStats.textContent += ' · snapshot ' + snap.generated_at + ' · ' + (snap.repo_count || 0) + ' repos on GitHub';
      }
    })
    .catch(function () { /* snapshot is optional; live API + fallback cover it */ });
})();
