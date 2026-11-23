/* ═══════════════════════════════════════════════════════════
   SYNATECH SRL — main.js
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Header: scroll state ──────────────────────────────── */
  const header = document.getElementById('header');

  /* ── Active nav (declarado antes de onScroll para evitar TDZ) ── */
  const sections = Array.from(document.querySelectorAll('section[id]'));
  const navLinks = document.querySelectorAll('.nav__link');

  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 10);
    updateActiveNav();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function updateActiveNav() {
    /* Línea de referencia: debajo del header sticky + el mismo margen que usa scroll-margin-top */
    const y = window.scrollY + header.offsetHeight + 24 + 1;
    let active = null;

    sections.forEach(sec => {
      if (y >= sec.getBoundingClientRect().top + window.scrollY) active = sec.id;
    });

    /* Al llegar al final de la página, la última sección queda activa */
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      active = sections[sections.length - 1].id;
    }

    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${active}`);
    });
  }

  /* ── Mobile menu ───────────────────────────────────────── */
  const menuToggle  = document.getElementById('menu-toggle');
  const mobileMenu  = document.getElementById('mobile-menu');
  const mobileLinks = mobileMenu.querySelectorAll('a');

  function openMenu() {
    mobileMenu.classList.add('is-open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Cerrar menú');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      const first = mobileMenu.querySelector('a');
      if (first) first.focus();
    });
  }

  function closeMenu() {
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Abrir menú');
    document.body.style.overflow = '';
    menuToggle.focus();
  }

  menuToggle.addEventListener('click', () => {
    mobileMenu.classList.contains('is-open') ? closeMenu() : openMenu();
  });

  mobileLinks.forEach(link => link.addEventListener('click', closeMenu));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) closeMenu();
  });

  /* ── Carousel ──────────────────────────────────────────── */
  const carousel = document.getElementById('hero-carousel');

  if (carousel) {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      /* Solo mostrar primer GIF sin rotación */
      carousel.querySelector('.carousel__slide').classList.add('carousel__slide--active');
    } else {
      const slides     = carousel.querySelectorAll('.carousel__slide');
      const indicators = carousel.querySelectorAll('.carousel__indicator');
      const progBars   = carousel.querySelectorAll('.indicator__progress');
      const pauseBtn   = document.getElementById('carousel-pause');
      const iconPause  = pauseBtn.querySelector('.icon-pause');
      const iconPlay   = pauseBtn.querySelector('.icon-play');
      const liveRegion = carousel.querySelector('[aria-live]');

      const DURATION   = 6000;
      let current      = 0;
      let isPaused     = false;
      let isInView     = true;
      let isTabVisible = !document.hidden;
      let timer        = null;
      let rafId        = null;
      let progressStart = null;

      function activateSlide(idx) {
        slides[current].classList.remove('carousel__slide--active');
        indicators[current].classList.remove('carousel__indicator--active');
        indicators[current].setAttribute('aria-selected', 'false');
        progBars[current].style.width = '0%';

        current = ((idx % slides.length) + slides.length) % slides.length;

        slides[current].classList.add('carousel__slide--active');
        indicators[current].classList.add('carousel__indicator--active');
        indicators[current].setAttribute('aria-selected', 'true');

        if (liveRegion) {
          liveRegion.setAttribute('aria-label', `Imagen ${current + 1} de ${slides.length}`);
        }
      }

      function tickProgress(now) {
        if (!progressStart) progressStart = now;
        const pct = Math.min(((now - progressStart) / DURATION) * 100, 100);
        progBars[current].style.width = `${pct}%`;
        if (pct < 100) rafId = requestAnimationFrame(tickProgress);
      }

      function canRun() {
        return !isPaused && isInView && isTabVisible;
      }

      function startCycle() {
        clearTimeout(timer);
        cancelAnimationFrame(rafId);
        progBars[current].style.width = '0%';
        progressStart = null;
        rafId = requestAnimationFrame(tickProgress);

        timer = setTimeout(() => {
          if (canRun()) {
            activateSlide(current + 1);
            startCycle();
          }
        }, DURATION);
      }

      function pauseCycle() {
        clearTimeout(timer);
        cancelAnimationFrame(rafId);
      }

      /* Indicator clicks */
      indicators.forEach((btn, i) => {
        btn.addEventListener('click', () => {
          pauseCycle();
          activateSlide(i);
          if (canRun()) startCycle();
        });
      });

      /* Pause/play button */
      pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        pauseBtn.setAttribute('aria-pressed', String(isPaused));
        pauseBtn.setAttribute('aria-label', isPaused ? 'Reanudar carrusel' : 'Pausar carrusel');
        iconPause.style.display = isPaused ? 'none' : 'block';
        iconPlay.style.display  = isPaused ? 'block' : 'none';

        isPaused ? pauseCycle() : startCycle();
      });

      /* IntersectionObserver: pausar fuera de viewport */
      const viewObserver = new IntersectionObserver(entries => {
        isInView = entries[0].isIntersecting;
        isInView ? (canRun() && startCycle()) : pauseCycle();
      }, { threshold: 0.3 });
      viewObserver.observe(carousel);

      /* Page Visibility API */
      document.addEventListener('visibilitychange', () => {
        isTabVisible = !document.hidden;
        isTabVisible ? (canRun() && startCycle()) : pauseCycle();
      });

      startCycle();
    }
  }

  /* ── Animaciones de scroll ─────────────────────────────── */
  const animatables = document.querySelectorAll('.animate-on-scroll');

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && animatables.length) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    animatables.forEach(el => observer.observe(el));
  } else {
    animatables.forEach(el => el.classList.add('in-view'));
  }

  /* ── Año en footer ─────────────────────────────────────── */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ── Formulario de contacto ────────────────────────────── */
  const form      = document.getElementById('contact-form');
  const statusEl  = document.getElementById('form-status');
  const submitBtn = document.getElementById('form-submit');

  if (form) {

    function showStatus(msg, type) {
      statusEl.textContent = msg;
      statusEl.className   = `form-status ${type}`;
      statusEl.hidden      = false;
      statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideStatus() {
      statusEl.hidden    = true;
      statusEl.className = 'form-status';
    }

    function validateEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      hideStatus();

      const nombre   = form.nombre.value.trim();
      const email    = form.email.value.trim();
      const area     = form.area.value;
      const mensaje  = form.mensaje.value.trim();
      const honeypot = form.website ? form.website.value : '';

      /* Honeypot: bot silencioso */
      if (honeypot) return;

      /* Validación client-side */
      if (!nombre || nombre.length < 2) {
        showStatus('Por favor ingrese su nombre y apellido.', 'error');
        form.nombre.focus();
        return;
      }
      if (!email || !validateEmail(email)) {
        showStatus('Por favor ingrese un correo electrónico válido.', 'error');
        form.email.focus();
        return;
      }
      if (!area) {
        showStatus('Por favor seleccione un área de interés.', 'error');
        form.area.focus();
        return;
      }
      if (!mensaje || mensaje.length < 10) {
        showStatus('Por favor cuéntenos un poco sobre su proyecto (mínimo 10 caracteres).', 'error');
        form.mensaje.focus();
        return;
      }

      /* Envío */
      submitBtn.disabled    = true;
      submitBtn.textContent = 'Enviando…';

      try {
        const body = new FormData(form);

        const res  = await fetch('contacto.php', {
          method:  'POST',
          headers: { 'Accept': 'application/json' },
          body
        });

        if (!res.ok && res.status !== 400 && res.status !== 429) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        if (data.ok) {
          showStatus('¡Consulta enviada con éxito! Nos comunicaremos pronto.', 'success');
          form.reset();
        } else {
          showStatus(data.message || 'Hubo un problema al enviar. Intente de nuevo.', 'error');
        }

      } catch {
        showStatus('Error de conexión. Revise su conexión a internet e intente de nuevo.', 'error');
      } finally {
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Enviar consulta';
      }
    });
  }

})();
