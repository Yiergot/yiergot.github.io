/* ============================================================
   MAIN JS - arnaboldiluca.eu
   Theme toggle, publication filters, scroll animations
   ============================================================ */

// --- Theme Toggle ---
(function () {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  const icon = toggle.querySelector('i');
  const html = document.documentElement;

  function getPreferredTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    if (icon) {
      icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
  }

  applyTheme(getPreferredTheme());

  toggle.addEventListener('click', function () {
    var current = html.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!localStorage.getItem('theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
})();

// --- Active Nav Link ---
(function () {
  var path = window.location.pathname.split('/').pop() || 'index.html';
  var links = document.querySelectorAll('.site-nav .nav-link');
  links.forEach(function (link) {
    var href = link.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
})();

// --- Publications System ---
(function () {
  var container = document.getElementById('publications-list');
  var filtersContainer = document.getElementById('pub-filters');
  if (!container) return;

  var activeTags = new Set(['All']);

  // Load data: try global variable first (inline script), fallback to fetch
  function loadData(callback) {
    if (window.PUBLICATIONS_DATA) {
      callback(window.PUBLICATIONS_DATA);
    } else {
      fetch('data/publications.json')
        .then(function (r) { return r.json(); })
        .then(callback)
        .catch(function () {
          container.innerHTML = '<p style="color:var(--color-text-muted)">Unable to load publications. Please try a local server or visit the live site.</p>';
        });
    }
  }

  loadData(function (pubs) {
      pubs.sort(function (a, b) { return b.year - a.year || a.title.localeCompare(b.title); });

      // Extract unique tags
      var allTags = new Set();
      pubs.forEach(function (p) {
        (p.tags || []).forEach(function (t) { allTags.add(t); });
      });

      // Render filter tags
      if (filtersContainer) {
        var html = '<button class="pub-filter-tag active" data-tag="All">All</button>';
        Array.from(allTags).sort().forEach(function (tag) {
          html += '<button class="pub-filter-tag" data-tag="' + tag + '">' + tag + '</button>';
        });
        html += '<button class="pub-export-btn" id="export-bib"><i class="fa-solid fa-download"></i> Export All BibTeX</button>';
        filtersContainer.innerHTML = html;

        // Filter click handlers
        filtersContainer.addEventListener('click', function (e) {
          var btn = e.target.closest('.pub-filter-tag');
          if (!btn) return;
          var tag = btn.getAttribute('data-tag');

          if (tag === 'All') {
            activeTags.clear();
            activeTags.add('All');
            filtersContainer.querySelectorAll('.pub-filter-tag').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
          } else {
            activeTags.delete('All');
            filtersContainer.querySelector('[data-tag="All"]').classList.remove('active');
            if (activeTags.has(tag)) {
              activeTags.delete(tag);
              btn.classList.remove('active');
              if (activeTags.size === 0) {
                activeTags.add('All');
                filtersContainer.querySelector('[data-tag="All"]').classList.add('active');
              }
            } else {
              activeTags.add(tag);
              btn.classList.add('active');
            }
          }
          filterPublications();
        });

        // Export handler
        document.getElementById('export-bib').addEventListener('click', function () {
          var allBib = pubs.map(function (p) { return p.bibtex; }).join('\n\n');
          var blob = new Blob([allBib], { type: 'text/plain' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'luca-arnaboldi-publications.bib';
          a.click();
          URL.revokeObjectURL(url);
        });
      }

      // Render publications
      renderPublications(pubs);

      function renderPublications(pubs) {
        var html = '';
        var currentYear = null;

        pubs.forEach(function (pub, i) {
          if (pub.year !== currentYear) {
            currentYear = pub.year;
            html += '<div class="pub-year-group" data-year="' + currentYear + '">';
            html += '<h3 class="pub-year-heading">' + currentYear + '</h3>';
            html += '</div>';
          }

          var authorStr = (pub.authors || []).join(', ');
          var tagsAttr = (pub.tags || []).join(',');

          html += '<div class="pub-item" data-tags="' + tagsAttr + '">';
          html += '<div class="pub-title">' + pub.title + '</div>';
          html += '<div class="pub-authors">' + authorStr + '</div>';
          html += '<div class="pub-venue">' + (pub.venue || '') + (pub.venueShort ? ' (' + pub.venueShort + ')' : '') + '</div>';

          // Tags
          html += '<div class="pub-tags">';
          (pub.tags || []).forEach(function (t) {
            html += '<span class="pub-tag">' + t + '</span>';
          });
          html += '</div>';

          // Links
          html += '<div class="pub-links">';
          if (pub.links) {
            if (pub.links.pdf) html += '<a href="' + pub.links.pdf + '" target="_blank" class="pub-link-btn"><i class="fa-solid fa-file-pdf"></i> PDF</a>';
            if (pub.links.doi) html += '<a href="' + pub.links.doi + '" target="_blank" class="pub-link-btn"><i class="fa-solid fa-link"></i> DOI</a>';
            if (pub.links.arxiv) html += '<a href="' + pub.links.arxiv + '" target="_blank" class="pub-link-btn"><i class="ai ai-arxiv"></i> arXiv</a>';
            if (pub.links.tool) html += '<a href="' + pub.links.tool + '" target="_blank" class="pub-link-btn"><i class="fa-solid fa-wrench"></i> Tool</a>';
          }
          html += '<button class="pub-link-btn bibtex-toggle" data-index="' + i + '"><i class="fa-solid fa-quote-right"></i> BibTeX</button>';
          html += '</div>';

          // BibTeX block
          html += '<div class="pub-bibtex" id="bib-' + i + '">';
          html += '<button class="copy-btn" data-index="' + i + '">Copy</button>';
          html += '<pre>' + escapeHtml(pub.bibtex || '') + '</pre>';
          html += '</div>';

          html += '</div>';
        });

        container.innerHTML = html;

        // BibTeX toggle handlers
        container.addEventListener('click', function (e) {
          var toggleBtn = e.target.closest('.bibtex-toggle');
          if (toggleBtn) {
            var idx = toggleBtn.getAttribute('data-index');
            var block = document.getElementById('bib-' + idx);
            if (block) block.classList.toggle('show');
            return;
          }

          var copyBtn = e.target.closest('.copy-btn');
          if (copyBtn) {
            var idx2 = copyBtn.getAttribute('data-index');
            var pre = document.getElementById('bib-' + idx2).querySelector('pre');
            navigator.clipboard.writeText(pre.textContent).then(function () {
              copyBtn.textContent = 'Copied!';
              setTimeout(function () { copyBtn.textContent = 'Copy'; }, 2000);
            });
          }
        });
      }

      function filterPublications() {
        var items = container.querySelectorAll('.pub-item');
        var yearGroups = container.querySelectorAll('.pub-year-group');
        var visibleYears = new Set();

        items.forEach(function (item) {
          var itemTags = item.getAttribute('data-tags').split(',');
          var show = activeTags.has('All') || itemTags.some(function (t) { return activeTags.has(t); });
          item.classList.toggle('hidden', !show);
          if (show) {
            // Find previous year heading
            var prev = item.previousElementSibling;
            while (prev && !prev.classList.contains('pub-year-group')) {
              prev = prev.previousElementSibling;
            }
            if (prev) visibleYears.add(prev.getAttribute('data-year'));
          }
        });

        yearGroups.forEach(function (g) {
          g.classList.toggle('hidden', !visibleYears.has(g.getAttribute('data-year')));
        });
      }
    });

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();

// --- Scroll Animations (varied by element type) ---
(function () {
  var cards = document.querySelectorAll('.card-animate');
  var heroes = document.querySelectorAll('.hero-animate');
  var headings = document.querySelectorAll('.heading-animate');
  var generic = document.querySelectorAll('.animate-on-scroll');

  // Assign stagger delays to cards within the same grid
  var grids = document.querySelectorAll('.card-grid');
  grids.forEach(function (grid) {
    var gridCards = grid.querySelectorAll('.card-animate');
    gridCards.forEach(function (card, i) {
      card.style.setProperty('--card-delay', (i * 80) + 'ms');
    });
  });

  var allElements = [].concat(
    Array.from(heroes),
    Array.from(headings),
    Array.from(cards),
    Array.from(generic)
  );

  if (!allElements.length) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  allElements.forEach(function (el) { observer.observe(el); });
})();
