/* ============================================================
   MONTANA CAPITAL — shared site chrome & interactions
   Injects nav + footer on every page, wires up the UI.
   ============================================================ */
(function () {
  /* Backend API base — en local el mismo servidor sirve la API ('');
     en producción (Vercel) la API vive en el backend de Render. */
  const MC_API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? '' : 'https://montana-capital-panel.onrender.com';
  /* Main nav — reduced for lower cognitive load (CRO).
     Secondary pages (Ecosistema, Roadmap, Noticias) live in the footer. */
  const PAGES = [
    { id: 'home',       href: 'index.html',      label: 'Inicio' },
    { id: 'nosotros',   href: 'nosotros.html',   label: 'Nosotros' },
    { id: 'tecnologia', href: 'tecnologia.html', label: 'Servicios' },
    { id: 'proyectos',  href: 'proyectos.html',  label: 'Casos de Éxito' },
  ];
  const current = document.body.dataset.page || 'home';

  /* ---- contact + social (edita estos enlaces cuando tengas las cuentas) ---- */
  const WHATSAPP = '573153252155';                       // línea de WhatsApp
  const WA_MSG = 'Hola Montana Capital, quiero cotizar un proyecto.';
  const SOCIAL = {
    facebook:  '#',   // TODO: pega aquí la URL de tu Facebook
    instagram: '#',   // TODO: pega aquí la URL de tu Instagram
    tiktok:    '#',   // TODO: pega aquí la URL de tu TikTok
  };

  const BRAND = `
    <a href="index.html" class="nav__brand" aria-label="Montana Capital inicio">
      <span class="brand-mark"><img src="assets/logo-mark.png" alt="Logo Montana Capital SAS" width="44" height="44" fetchpriority="high" decoding="async"/></span>
      <span class="brand-txt">MONTANA<small>CAPITAL · SAS</small></span>
    </a>`;

  /* ---------- NAV ---------- */
  const links = PAGES.map(p =>
    `<a href="${p.href}"${p.id === current ? ' class="is-active"' : ''}>${p.label}</a>`
  ).join('');
  const nav = document.createElement('header');
  nav.className = 'nav';
  nav.id = 'nav';
  nav.innerHTML = `${BRAND}
    <nav class="nav__links" id="navLinks">
      ${links}
      <a href="cotizador.html" class="nav__cta${current === 'cotizador' ? ' is-active' : ''}">Cotizar</a>
      <a href="/admin" class="nav__panel" title="Acceso interno (panel de control)">Acceso interno</a>
    </nav>
    <button class="nav__burger" id="burger" aria-label="Menú"><span></span><span></span><span></span></button>`;

  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.id = 'scrollProgress';

  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  glow.id = 'cursorGlow';

  document.body.prepend(nav);
  document.body.prepend(progress);
  document.body.appendChild(glow);

  /* ---------- WhatsApp floating button ---------- */
  const wa = document.createElement('a');
  wa.className = 'wa-fab';
  wa.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(WA_MSG)}`;
  wa.target = '_blank';
  wa.rel = 'noopener';
  wa.setAttribute('aria-label', 'Escríbenos por WhatsApp');
  wa.innerHTML = `<svg viewBox="0 0 24 24"><path d="M.06 24l1.68-6.16a11.87 11.87 0 01-1.6-5.95C.14 5.33 5.5 0 12.08 0a11.82 11.82 0 018.42 3.49 11.78 11.78 0 013.48 8.4c0 6.56-5.36 11.9-11.95 11.9a12 12 0 01-5.72-1.46L.06 24zM6.6 20.13l.36.21a9.9 9.9 0 005.05 1.38h.01c5.45 0 9.9-4.42 9.9-9.86a9.78 9.78 0 00-2.9-6.99 9.82 9.82 0 00-6.99-2.9c-5.46 0-9.9 4.43-9.9 9.88a9.8 9.8 0 001.5 5.22l.24.38-1 3.65 3.73-.98zM17.5 14.3c-.07-.12-.27-.2-.57-.35-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07a8.1 8.1 0 01-2.38-1.47 8.97 8.97 0 01-1.65-2.05c-.17-.3 0-.45.13-.6.13-.13.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.91-2.2-.24-.58-.49-.5-.67-.5l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.46s1.06 2.86 1.21 3.06c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42z"/></svg><span>Cotiza por WhatsApp</span>`;
  document.body.appendChild(wa);

  /* ---------- FOOTER ---------- */
  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.innerHTML = `
    <div class="footer__top">
      <div class="footer__brand">
        <span class="brand-mark"><img src="assets/logo-mark.png" alt="Logo Montana Capital SAS" width="46" height="46" loading="lazy" decoding="async"/></span>
        <div>
          <b>MONTANA CAPITAL SAS</b>
          <small>Tecnología que transforma. Soluciones que impulsan.</small>
          <div class="footer__social">
            <a href="${SOCIAL.facebook}" target="_blank" rel="noopener" aria-label="Facebook de Montana Capital">
              <svg viewBox="0 0 24 24"><path d="M13 22v-9h3l.5-4H13V6.5c0-1.1.3-1.9 2-1.9h2V1.1C16.7 1 15.5.9 14.2.9 11.4.9 9.5 2.6 9.5 5.8V9H6.5v4H9.5v9z"/></svg>
            </a>
            <a href="${SOCIAL.instagram}" target="_blank" rel="noopener" aria-label="Instagram de Montana Capital">
              <svg viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.2 1 .5 1.4 1 .5.4.8.8 1 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-1 1.4-.4.5-.8.8-1.4 1-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-1-.5-.4-.8-.8-1-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 1-1.4.4-.5.8-.8 1.4-1 .4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.07-1.1.05-1.7.24-2.1.4-.5.2-.9.45-1.3.85-.4.4-.65.8-.85 1.3-.16.4-.35 1-.4 2.1C2.6 9.5 2.6 9.9 2.6 13s0 3.5.07 4.7c.05 1.1.24 1.7.4 2.1.2.5.45.9.85 1.3.4.4.8.65 1.3.85.4.16 1 .35 2.1.4 1.2.07 1.6.07 4.7.07s3.5 0 4.7-.07c1.1-.05 1.7-.24 2.1-.4.5-.2.9-.45 1.3-.85.4-.4.65-.8.85-1.3.16-.4.35-1 .4-2.1.07-1.2.07-1.6.07-4.7s0-3.5-.07-4.7c-.05-1.1-.24-1.7-.4-2.1-.2-.5-.45-.9-.85-1.3-.4-.4-.8-.65-1.3-.85-.4-.16-1-.35-2.1-.4C15.5 4 15.1 4 12 4zm0 3.1a4.9 4.9 0 100 9.8 4.9 4.9 0 000-9.8zm0 8.1a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4zm6.2-8.3a1.15 1.15 0 11-2.3 0 1.15 1.15 0 012.3 0z"/></svg>
            </a>
            <a href="${SOCIAL.tiktok}" target="_blank" rel="noopener" aria-label="TikTok de Montana Capital">
              <svg viewBox="0 0 24 24"><path d="M16.6 5.8a4.3 4.3 0 01-2.6-3.8h-3v13.4a2.5 2.5 0 11-2.5-2.5c.2 0 .5 0 .7.1V7.8a5.6 5.6 0 00-.7 0 5.5 5.5 0 105.5 5.5V8.6a7.2 7.2 0 004.3 1.4V7a4.3 4.3 0 01-1.7-1.2z"/></svg>
            </a>
          </div>
        </div>
      </div>
      <nav class="footer__nav">
        <a href="nosotros.html">Nosotros</a><a href="tecnologia.html">Servicios</a>
        <a href="proyectos.html">Casos de Éxito</a><a href="ecosistema.html">Ecosistema</a>
        <a href="contacto.html">Contacto</a>
      </nav>
    </div>
    <div class="footer__bottom">
      <span>© <span id="year"></span> Montana Capital SAS · Cali, Colombia</span>
      <span class="footer__tag">INNOVAMOS HOY · CONSTRUIMOS EL FUTURO</span>
    </div>`;
  if (!document.body.classList.contains('portal-page')) {
    document.body.appendChild(footer);
  }
  const yearEl = footer.querySelector('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- mobile burger ---------- */
  const burger = nav.querySelector('#burger');
  const navLinks = nav.querySelector('#navLinks');
  burger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    burger.classList.toggle('open', open);
    document.body.classList.toggle('lock', open);
  });
  navLinks.addEventListener('click', e => {
    if (e.target.tagName === 'A') { navLinks.classList.remove('open'); burger.classList.remove('open'); document.body.classList.remove('lock'); }
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') { navLinks.classList.remove('open'); burger.classList.remove('open'); document.body.classList.remove('lock'); }
  });

  /* ---------- cursor glow (seguimiento suavizado con lerp + rAF) ---------- */
  const gpos = { x: innerWidth / 2, y: innerHeight / 2 };   // posición renderizada
  const gtgt = { x: gpos.x, y: gpos.y };                    // objetivo (puntero)
  let glowRaf = null;
  function glowLoop() {
    gpos.x += (gtgt.x - gpos.x) * 0.18;
    gpos.y += (gtgt.y - gpos.y) * 0.18;
    glow.style.left = gpos.x + 'px';
    glow.style.top = gpos.y + 'px';
    if (Math.abs(gtgt.x - gpos.x) > 0.1 || Math.abs(gtgt.y - gpos.y) > 0.1) glowRaf = requestAnimationFrame(glowLoop);
    else glowRaf = null;
  }
  window.addEventListener('pointermove', e => {
    glow.style.opacity = '1';
    gtgt.x = e.clientX; gtgt.y = e.clientY;
    if (!glowRaf) glowRaf = requestAnimationFrame(glowLoop);
  });
  window.addEventListener('pointerleave', () => { glow.style.opacity = '0'; });

  /* ---------- scroll progress + nav state ---------- */
  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const p = max > 0 ? h.scrollTop / max : 0;
    progress.style.width = (p * 100) + '%';
    nav.classList.toggle('scrolled', h.scrollTop > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* ---------- GSAP reveals (inner pages) ---------- */
  if (window.gsap && !reduce) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.utils.toArray('[data-reveal]').forEach(el => {
      gsap.fromTo(el, { opacity: 0, y: 52, filter: 'blur(12px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.15, ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 86%' } });
    });
    ['.tcard', '.bcard', '.step', '.tl-item', '.mvp', '.pact__item', '.feature-grid > *', '.price', '.hstat'].forEach(sel => {
      const items = gsap.utils.toArray(sel);
      if (items.length) gsap.from(items, {
        opacity: 0, y: 54, filter: 'blur(10px)', duration: .95, ease: 'expo.out', stagger: .09,
        scrollTrigger: { trigger: items[0].parentElement, start: 'top 88%' }
      });
    });
  }

  /* ---------- counters ---------- */
  function countUp(el) {
    const to = +el.dataset.to, suf = el.dataset.suffix || '', dur = 1600, t0 = performance.now();
    (function step(now) {
      const k = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(to * e) + suf;
      if (k < 1) requestAnimationFrame(step);
    })(performance.now());
  }
  document.querySelectorAll('.count').forEach(el => {
    if (window.gsap) ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => countUp(el) });
    else countUp(el);
  });

  /* ---------- tilt ---------- */
  if (!reduce) document.querySelectorAll('.tilt').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `perspective(900px) rotateY(${px * 6}deg) rotateX(${-py * 6}deg)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });

  /* ---------- tech card spotlight ---------- */
  document.querySelectorAll('.tech__grid').forEach(grid => {
    grid.addEventListener('pointermove', e => {
      const card = e.target.closest('.tcard'); if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- contact form → backend (con respaldo a correo) ---------- */
  const form = document.getElementById('contactForm');
  if (form) {
    const note = document.getElementById('formNote');
    const g = id => (document.getElementById(id)?.value || '').trim();
    const mailtoFallback = (name, email, comp, msg, type) => {
      const body = encodeURIComponent(`Nombre: ${name}\nEmpresa: ${comp || '—'}\nCorreo: ${email}\nInterés: ${type || '—'}\n\n${msg}`);
      window.location.href = `mailto:montanacapital.sas@gmail.com?subject=${encodeURIComponent('Nuevo proyecto — ' + name)}&body=${body}`;
    };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const name = g('cName'), email = g('cEmail'), msg = g('cMsg'), comp = g('cCompany');
      const type = g('cType'), budget = g('cBudget'), website = g('cWebsite'); // cWebsite = honeypot
      if (!name || !email || !msg) { note.textContent = 'Por favor completa nombre, correo y mensaje.'; note.classList.add('err'); return; }
      note.classList.remove('err');
      note.textContent = 'Enviando…';
      try {
        const r = await fetch(MC_API + '/api/quote', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, company: comp, message: msg, type, budget, website, source: 'web' }),
        });
        if (!r.ok) throw new Error('bad');
        note.textContent = '¡Gracias! Recibimos tu solicitud y te contactaremos muy pronto.';
        form.reset();
      } catch {
        // si el backend no está disponible, abrimos el correo del usuario
        note.textContent = 'Abriendo tu correo…';
        mailtoFallback(name, email, comp, msg, type);
        form.reset();
      }
    });
  }

  /* ---------- Asistente comercial (agente de IA) ---------- */
  (function initAgent() {
    // cabeza de robot (avatar del encabezado) — estilo blanco con ojos de anillo
    const ROBOT = `<svg class="mc-bot" viewBox="0 0 64 60" aria-hidden="true">
      <defs>
        <linearGradient id="hdHead" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dbe3ee"/></linearGradient>
        <linearGradient id="hdFace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#272c37"/><stop offset="1" stop-color="#0a0d13"/></linearGradient>
      </defs>
      <circle cx="9" cy="32" r="8" fill="#14181f"/>
      <circle cx="55" cy="32" r="8" fill="#14181f"/>
      <ellipse cx="32" cy="30" rx="25" ry="23" fill="url(#hdHead)"/>
      <ellipse cx="22" cy="18" rx="8" ry="4.5" fill="#ffffff" opacity=".5"/>
      <rect x="12" y="15" width="40" height="27" rx="13" fill="url(#hdFace)"/>
      <circle class="r-eye" cx="24" cy="28" r="5.2" fill="none" stroke="#5cccff" stroke-width="2.6"/>
      <circle class="r-eye" cx="40" cy="28" r="5.2" fill="none" stroke="#5cccff" stroke-width="2.6"/>
      <rect x="29.5" y="37" width="5" height="2" rx="1" fill="#3a4150"/>
    </svg>`;
    // Nova para el botón flotante: cabeza + bracitos y manitos (sin cuerpo)
    const ROBOT_FAB = `<svg class="mc-bot mc-bot--fab" viewBox="0 0 64 72" aria-hidden="true">
      <defs>
        <linearGradient id="fbHead" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dbe3ee"/></linearGradient>
        <linearGradient id="fbFace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#272c37"/><stop offset="1" stop-color="#0a0d13"/></linearGradient>
      </defs>
      <path d="M19 48 q-7 6 -9 12" stroke="#dbe3ee" stroke-width="5.5" stroke-linecap="round" fill="none"/>
      <path d="M45 48 q7 6 9 12" stroke="#dbe3ee" stroke-width="5.5" stroke-linecap="round" fill="none"/>
      <circle cx="9.6" cy="62" r="4.6" fill="#14181f"/>
      <circle cx="54.4" cy="62" r="4.6" fill="#14181f"/>
      <circle cx="9" cy="32" r="8" fill="#14181f"/>
      <circle cx="55" cy="32" r="8" fill="#14181f"/>
      <ellipse cx="32" cy="30" rx="25" ry="23" fill="url(#fbHead)"/>
      <ellipse cx="22" cy="18" rx="8" ry="4.5" fill="#ffffff" opacity=".5"/>
      <rect x="12" y="15" width="40" height="27" rx="13" fill="url(#fbFace)"/>
      <circle class="r-eye" cx="24" cy="28" r="5.2" fill="none" stroke="#5cccff" stroke-width="2.6"/>
      <circle class="r-eye" cx="40" cy="28" r="5.2" fill="none" stroke="#5cccff" stroke-width="2.6"/>
      <rect x="29.5" y="37" width="5" height="2" rx="1" fill="#3a4150"/>
    </svg>`;
    // robot de cuerpo entero (Nova) — estilo blanco brillante, cara negra, ojos de anillo cian
    const ROBOT_FULL = `<svg class="mc-bot mc-bot--full" viewBox="0 0 100 112" aria-hidden="true">
      <defs>
        <linearGradient id="nvHead" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dae2ed"/></linearGradient>
        <linearGradient id="nvBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d2dbe9"/></linearGradient>
        <linearGradient id="nvFace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#272c37"/><stop offset="1" stop-color="#0a0d13"/></linearGradient>
      </defs>
      <ellipse cx="50" cy="107" rx="30" ry="4" fill="#02060f" opacity=".22"/>
      <rect x="15" y="66" width="13" height="30" rx="6.5" fill="url(#nvBody)"/>
      <rect x="72" y="66" width="13" height="30" rx="6.5" fill="url(#nvBody)"/>
      <rect x="15" y="82" width="13" height="3.4" rx="1.7" fill="#4cc5ff"/>
      <rect x="72" y="82" width="13" height="3.4" rx="1.7" fill="#4cc5ff"/>
      <ellipse cx="21.5" cy="96" rx="7" ry="5.2" fill="#14181f"/>
      <ellipse cx="78.5" cy="96" rx="7" ry="5.2" fill="#14181f"/>
      <ellipse cx="50" cy="85" rx="28" ry="24" fill="url(#nvBody)"/>
      <ellipse cx="50" cy="65" rx="16" ry="5" fill="#14181f"/>
      <circle cx="50" cy="78" r="4" fill="#14181f"/>
      <circle cx="48.6" cy="76.6" r="1.2" fill="#3a4150"/>
      <rect x="42" y="86" width="16" height="3.2" rx="1.6" fill="#4cc5ff"/>
      <rect x="43" y="55" width="14" height="11" rx="3.5" fill="#14181f"/>
      <circle cx="20" cy="36" r="11" fill="#14181f"/>
      <circle cx="80" cy="36" r="11" fill="#14181f"/>
      <circle cx="20" cy="36" r="6.5" fill="#23272f"/>
      <circle cx="80" cy="36" r="6.5" fill="#23272f"/>
      <ellipse cx="50" cy="33" rx="30" ry="27" fill="url(#nvHead)"/>
      <ellipse cx="37" cy="19" rx="10" ry="5.5" fill="#ffffff" opacity=".55"/>
      <rect x="28" y="17" width="44" height="30" rx="15" fill="url(#nvFace)"/>
      <circle cx="40" cy="31" r="8.5" fill="none" stroke="#4cc5ff" stroke-width="2" opacity=".3"/>
      <circle cx="60" cy="31" r="8.5" fill="none" stroke="#4cc5ff" stroke-width="2" opacity=".3"/>
      <circle class="r-eye" cx="40" cy="31" r="6" fill="none" stroke="#5cccff" stroke-width="3"/>
      <circle class="r-eye" cx="60" cy="31" r="6" fill="none" stroke="#5cccff" stroke-width="3"/>
      <rect x="47.5" y="41" width="5" height="2.2" rx="1.1" fill="#3a4150"/>
    </svg>`;
    const wrap = document.createElement('div');
    wrap.className = 'mc-agent';
    wrap.innerHTML = `
      <button class="mc-agent__fab" id="mcAgentFab" aria-label="Abrir asistente Nova">
        ${ROBOT_FAB}
        <span class="mc-agent__ping"></span>
      </button>
      <section class="mc-agent__panel" id="mcAgentPanel" aria-hidden="true">
        <header class="mc-agent__head">
          <div class="mc-agent__id"><span class="mc-agent__ava sm">${ROBOT}</span>
            <div><b>Nova · Asistente Montana</b><small>En línea · responde al instante</small></div>
          </div>
          <button class="mc-agent__close" id="mcAgentClose" aria-label="Cerrar">✕</button>
        </header>
        <div class="mc-agent__body" id="mcAgentBody"></div>
        <div class="mc-agent__opts" id="mcAgentOpts"></div>
        <form class="mc-agent__input" id="mcAgentForm">
          <input id="mcAgentText" type="text" autocomplete="off" placeholder="Escribe tu mensaje…" />
          <button type="submit" aria-label="Enviar">➤</button>
        </form>
      </section>`;
    document.body.appendChild(wrap);

    const fab = wrap.querySelector('#mcAgentFab');
    const panel = wrap.querySelector('#mcAgentPanel');
    const body = wrap.querySelector('#mcAgentBody');
    const opts = wrap.querySelector('#mcAgentOpts');
    const form = wrap.querySelector('#mcAgentForm');
    const input = wrap.querySelector('#mcAgentText');

    let messages = [];      // {role, content}
    let lead = {};          // datos recopilados
    let started = false, done = false, sending = false;

    const esc = s => (s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    function bubble(role, text) {
      const d = document.createElement('div');
      d.className = 'mc-msg mc-msg--' + role;
      d.innerHTML = esc(text).replace(/\n/g, '<br>');
      body.appendChild(d);
      body.scrollTop = body.scrollHeight;
      return d;
    }
    function typing(on) {
      let t = body.querySelector('.mc-typing');
      if (on && !t) { t = document.createElement('div'); t.className = 'mc-msg mc-msg--bot mc-typing'; t.innerHTML = '<span></span><span></span><span></span>'; body.appendChild(t); body.scrollTop = body.scrollHeight; }
      else if (!on && t) t.remove();
    }
    function renderOptions(list) {
      opts.innerHTML = '';
      if (!list || !list.length || done) return;
      list.forEach(o => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'mc-chip'; b.textContent = o;
        b.onclick = () => send(o);
        opts.appendChild(b);
      });
    }

    async function send(text) {
      text = (text || '').trim();
      if (!text || sending || done) return;
      sending = true;
      input.value = ''; opts.innerHTML = '';
      bubble('user', text);
      messages.push({ role: 'user', content: text });
      typing(true);
      try {
        const r = await fetch(MC_API + '/api/agent/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, lead }),
        });
        const d = await r.json();
        typing(false);
        if (d.lead) lead = d.lead;
        if (d.reply) { bubble('bot', d.reply); messages.push({ role: 'assistant', content: d.reply }); }
        if (d.done) { done = true; input.disabled = true; input.placeholder = 'Conversación finalizada · ¡gracias!'; opts.innerHTML = ''; }
        else renderOptions(d.options);
      } catch {
        typing(false);
        bubble('bot', 'Ups, tuve un problema de conexión. Intenta de nuevo o escríbenos por WhatsApp 🙏');
      }
      sending = false;
    }

    async function start() {
      if (started) return; started = true;
      typing(true);
      try {
        const r = await fetch(MC_API + '/api/agent/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [], lead: {} }),
        });
        const d = await r.json();
        typing(false);
        if (d.lead) lead = d.lead;
        if (d.reply) { bubble('bot', d.reply); messages.push({ role: 'assistant', content: d.reply }); }
        renderOptions(d.options);
      } catch { typing(false); bubble('bot', '¡Hola! 👋 Soy el asistente de Montana Capital. ¿En qué te ayudo?'); }
    }

    function toggle(open) {
      panel.classList.toggle('open', open);
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      fab.classList.toggle('hide', open);
      if (open) { start(); setTimeout(() => input.focus(), 200); }
    }
    fab.onclick = () => toggle(true);
    wrap.querySelector('#mcAgentClose').onclick = () => toggle(false);
    form.addEventListener('submit', e => { e.preventDefault(); send(input.value); });
  })();

  /* ---------- ambient constellation (inner page heroes) ---------- */
  document.querySelectorAll('canvas.ambient').forEach(cv => initAmbient(cv));
  function initAmbient(cv) {
    if (reduce) return;
    const ctx = cv.getContext('2d');
    let w, h, dpr, nodes, raf;
    const mouse = { x: -999, y: -999 };
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.scale(dpr, dpr);
      const count = Math.round(Math.min(70, w / 18));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25,
        r: Math.random() * 1.6 + .6
      }));
    }
    cv.addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    cv.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.283);
        ctx.fillStyle = 'rgba(150,205,255,.7)'; ctx.fill();
      }
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
        if (d < 120) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(98,180,255,${(1 - d / 120) * .22})`; ctx.lineWidth = 1; ctx.stroke();
        }
      }
      for (const n of nodes) {
        const dx = n.x - mouse.x, dy = n.y - mouse.y, d = Math.hypot(dx, dy);
        if (d < 150) {
          ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(231,194,100,${(1 - d / 150) * .4})`; ctx.lineWidth = 1; ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    }
    resize(); draw();
    window.addEventListener('resize', () => { cancelAnimationFrame(raf); ctx.setTransform(1, 0, 0, 1, 0, 0); resize(); draw(); });
  }
})();
