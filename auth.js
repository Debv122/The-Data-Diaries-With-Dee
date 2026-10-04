/* Data Diaries With Dee - accounts, progress and submissions (Supabase). 
   One file, no build step. Add <script src="/auth.js" defer></script> to any page.
   Until the two values below are filled in, the site behaves exactly as before (nothing is gated). */
(function () {
  'use strict';

  // ====== 1. FILL THESE IN (Supabase > Project Settings > API). Both are PUBLIC values, safe in the browser.
  var CONFIG = {
    SUPABASE_URL: 'https://agudnmzrbvrqtpsxcugl.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFndWRubXpyYnZycXRwc3hjdWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMDY2MzgsImV4cCI6MjEwNjY4MjYzOH0.0yA7CRGl1jLYa6Yf-FNZQDsufuzvkP7Ii-IUtlF6MZU', // anon public key, NEVER the service_role key
    GOOGLE_LOGIN: false,   // leave false. Set true only after enabling Google in Supabase (see guide)
    FREE_MODULES: 3,       // modules 1..N stay open to everyone; later modules and capstones need an account
    // Course ids come from the file names: course-01-module-04.html -> "01", course-cyber-module-02.html -> "cyber".
    // modules = number of modules (a capstone counts as one extra step).
    // Checked 2026-10-04 against the Emberlern catalogue (the source curriculum this site's courses were built from):
    //   01 Data Analyst: 10 modules + capstone  -- matches, unchanged.
    //   03 Assistant (VA): 10 modules + capstone -- matches, unchanged.
    //   04 Ticket (Customer Support): 10 modules + capstone -- ADDED, was missing.
    //   02 AI Ops: catalogue says 8 modules + capstone, but the guide flagged that this repo's
    //              course-02-module-xx files already go up to module-10. UNRESOLVED -- see note below.
    //              Left at 8 here; raise to 10 ONLY once you've confirmed modules 09-10 have real
    //              lesson content (not blank/placeholder pages), otherwise free visitors get sent to empty pages.
    COURSES: {
      '01':    { title: 'How to Be a Top-Notch Data Analyst',   modules: 10, url: '/course-01' },
      '02':    { title: 'AI for Business Operations',           modules: 8,  url: '/course-02' }, // see note above - unresolved 8 vs 10
      '03':    { title: "The Assistant They Can't Replace",     modules: 10, url: '/course-03-module-01' },
      '04':    { title: "The Ticket That Doesn't Come Back",    modules: 10, url: '/course-04-module-01' },
      'cyber': { title: 'Cyber Security Fundamentals',          modules: 8,  url: '/course-cyber' }
    }
  };
  // ======

  var configured = CONFIG.SUPABASE_URL.indexOf('http') === 0 && CONFIG.SUPABASE_ANON_KEY.length > 40;
  var path = location.pathname.replace(/\.html$/, '');
  var m = path.match(/\/course-([a-z0-9]+)-(?:module-(\d+)|(capstone))$/);
  var page = m ? { course: m[1], unit: m[3] ? 'capstone' : 'module-' + ('0' + parseInt(m[2], 10)).slice(-2),
                   num: m[3] ? 99 : parseInt(m[2], 10) } : null;
  var gated = !!(page && page.num > CONFIG.FREE_MODULES);

  var css = '' +
    '.dd-gated body>*:not(#dd-gate):not(#dd-bar){display:none!important}' +
    '#dd-gate{max-width:520px;margin:12vh auto;padding:32px;border:1px solid rgba(25,20,32,.2);border-radius:14px;background:#FBF8FA;color:#2E2733;font:17px/1.6 Inter,system-ui,sans-serif;text-align:center}' +
    '#dd-gate h2{font:400 1.6rem Fraunces,Georgia,serif;color:#191420;margin:0 0 10px}' +
    '.dd-btn{display:inline-block;border:0;border-radius:8px;background:#B0522F;color:#fff;padding:11px 20px;font:600 15px Inter,system-ui,sans-serif;cursor:pointer;text-decoration:none}' +
    '.dd-btn.alt{background:transparent;color:#B0522F;border:1px solid #B0522F}' +
    '#dd-bar{position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#191420;color:#F6F0F3;font:14px/1.4 Inter,system-ui,sans-serif;padding:10px 16px;box-shadow:0 -4px 20px rgba(0,0,0,.25)}' +
    '#dd-bar .row{max-width:860px;margin:0 auto;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}' +
    '#dd-bar a{color:#E4906F}' +
    '#dd-bar .dd-btn{padding:8px 14px;font-size:14px}' +
    '#dd-bar textarea{width:100%;min-height:120px;margin-top:10px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:#100C13;color:#F6F0F3;padding:10px;font:15px/1.5 Inter,system-ui,sans-serif}' +
    '#dd-panel{max-width:860px;margin:0 auto;display:none}#dd-panel.open{display:block}' +
    '.dd-pill{position:fixed;top:12px;right:12px;z-index:9999;background:#191420;color:#F6F0F3!important;border-radius:999px;padding:8px 14px;font:600 13px Inter,system-ui,sans-serif;text-decoration:none}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  if (configured && gated) document.documentElement.classList.add('dd-gated');
  var buf = page && configured ? 1 : 0; void buf;

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text; return e;
  }
  function safeNext(n) { return (n && n.charAt(0) === '/' && n.charAt(1) !== '/') ? n : '/account'; }

  var DD = { configured: configured, config: CONFIG, client: null, user: null, page: page };
  window.DD = DD;

  DD.ready = new Promise(function (resolve) {
    if (!configured) { resolve(DD); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload = function () {
      DD.client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      DD.client.auth.getSession().then(function (r) {
        DD.user = r.data.session ? r.data.session.user : null; resolve(DD);
      });
    };
    s.onerror = function () { resolve(DD); };
    document.head.appendChild(s);
  });

  // ---- auth helpers used by login.html and account.html
  DD.signUp = function (email, pw) {
    return DD.client.auth.signUp({ email: email, password: pw, options: { emailRedirectTo: location.origin + '/account' } });
  };
  DD.signIn = function (email, pw) { return DD.client.auth.signInWithPassword({ email: email, password: pw }); };
  DD.signOut = function () { return DD.client.auth.signOut(); };
  DD.reset = function (email) { return DD.client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/login' }); };
  DD.setPassword = function (pw) { return DD.client.auth.updateUser({ password: pw }); };
  DD.google = function (next) {
    return DD.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + safeNext(next) } });
  };
  DD.safeNext = safeNext;
  DD.myProgress = function () { return DD.client.from('progress').select('course,unit,completed_at'); };
  DD.mySubmissions = function () { return DD.client.from('submissions').select('course,unit,content,updated_at').order('updated_at', { ascending: false }); };

  // ---- nav link ("Sign in" / "My courses")
  function addNavLink() {
    var label = DD.user ? 'My courses' : 'Sign in';
    var ul = document.querySelector('ul.nav-links'), nav = document.querySelector('.nav-links');
    if (document.getElementById('dd-nav')) return;
    if (ul) { var li = el('li'); var a = el('a', { id: 'dd-nav', href: '/account' }, label); li.appendChild(a); ul.insertBefore(li, ul.lastElementChild); return; }
    if (nav) { nav.appendChild(el('a', { id: 'dd-nav', href: '/account' }, label)); return; }
    var strip = document.body.firstElementChild;
    if (strip && strip.tagName === 'DIV' && /Emberlern/.test(strip.textContent) && strip.textContent.length < 120) {
      var a2 = el('a', { id: 'dd-nav', href: '/account', style: 'float:right;color:#E8734A;text-decoration:none' }, label); strip.appendChild(a2); return;
    }
    if (!/\/(login|account)$/.test(path)) document.body.appendChild(el('a', { id: 'dd-nav', class: 'dd-pill', href: '/account' }, label));
  }

  // ---- gate + progress bar on course pages
  function showGate() {
    var g = el('div', { id: 'dd-gate' });
    g.appendChild(el('h2', {}, 'Create a free account to continue'));
    g.appendChild(el('p', {}, 'Create a free account (or sign in) to keep going, save your progress and submit your drill answers.'));
    var next = encodeURIComponent(location.pathname + location.search);
    var a = el('a', { class: 'dd-btn', href: '/login?next=' + next }, 'Sign in or create account');
    var wrap = el('p', { style: 'margin-top:18px' }); wrap.appendChild(a); g.appendChild(wrap);
    var b = el('p', { style: 'margin-top:14px;font-size:14px' }); b.appendChild(el('a', { href: '/emberlern' }, '\u2190 Back to courses')); g.appendChild(b);
    document.body.appendChild(g);
  }

  function showBar() {
    var isCap = page.unit === 'capstone';
    var bar = el('div', { id: 'dd-bar' });
    var row = el('div', { class: 'row' });
    var msg = el('span');
    row.appendChild(msg);
    var btns = el('span');
    row.appendChild(btns); bar.appendChild(row);
    document.body.appendChild(bar); document.body.style.paddingBottom = '70px';

    if (!DD.user) {
      msg.appendChild(document.createTextNode('Want to save your progress? '));
      msg.appendChild(el('a', { href: '/login?next=' + encodeURIComponent(location.pathname) }, 'Sign in free'));
      return;
    }
    var done = false;
    var doneBtn = el('button', { class: 'dd-btn', type: 'button' }, isCap ? 'Mark capstone complete' : 'Mark module complete');
    var subBtn = el('button', { class: 'dd-btn alt', type: 'button', style: 'margin-left:8px' }, isCap ? 'Submit capstone' : 'Submit drill answer');
    btns.appendChild(doneBtn); btns.appendChild(subBtn);
    msg.textContent = 'Signed in as ' + DD.user.email;
    var panel = el('div', { id: 'dd-panel' });
    var ta = el('textarea', { placeholder: isCap ? 'Paste your capstone work or a link to it' : 'Write your drill answers here. You can edit and resubmit any time.', maxlength: '20000' });
    var save = el('button', { class: 'dd-btn', type: 'button', style: 'margin-top:8px' }, 'Save');
    var note = el('span', { style: 'margin-left:10px' });
    panel.appendChild(ta); panel.appendChild(save); panel.appendChild(note); bar.appendChild(panel);

    function paint() { doneBtn.textContent = done ? '\u2713 Completed (tap to undo)' : (isCap ? 'Mark capstone complete' : 'Mark module complete'); }
    DD.client.from('progress').select('unit').eq('course', page.course).eq('unit', page.unit).then(function (r) {
      done = !!(r.data && r.data.length); paint();
    });
    DD.client.from('submissions').select('content').eq('course', page.course).eq('unit', page.unit).then(function (r) {
      if (r.data && r.data.length) ta.value = r.data[0].content;
    });
    doneBtn.onclick = function () {
      doneBtn.disabled = true;
      var q = done ? DD.client.from('progress').delete().eq('course', page.course).eq('unit', page.unit)
                   : DD.client.from('progress').upsert({ user_id: DD.user.id, course: page.course, unit: page.unit });
      q.then(function (r) { doneBtn.disabled = false; if (!r.error) { done = !done; paint(); } else { msg.textContent = 'Could not save: ' + r.error.message; } });
    };
    subBtn.onclick = function () { panel.classList.toggle('open'); };
    save.onclick = function () {
      var text = ta.value.trim(); if (!text) { note.textContent = 'Write something first.'; return; }
      save.disabled = true; note.textContent = 'Saving...';
      DD.client.from('submissions').upsert({ user_id: DD.user.id, course: page.course, unit: page.unit, content: text, updated_at: new Date().toISOString() })
        .then(function (r) { save.disabled = false; note.textContent = r.error ? 'Could not save: ' + r.error.message : 'Saved.'; });
    };
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!configured) return;           // not set up yet: site unchanged
    DD.ready.then(function () {
      if (!DD.client) { document.documentElement.classList.remove('dd-gated'); return; }  // CDN blocked: fail open
      addNavLink();
      if (page) {
        if (gated && !DD.user) { showGate(); return; }
        document.documentElement.classList.remove('dd-gated');
        showBar();
      }
      DD.client.auth.onAuthStateChange(function (ev, s) { DD.user = s ? s.user : null; });
    });
  });
})();
