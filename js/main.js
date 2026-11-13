/* IRON PULSE — shared site behaviour */
document.documentElement.classList.add('js');

(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const hasGsap = typeof gsap !== 'undefined';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Image fallback: if a stock photo fails, show a branded gradient ---------- */
  function fallback(img) {
    img.classList.add('img-fallback');
    if (img.parentElement) img.parentElement.classList.add('has-fallback');
  }
  $$('img').forEach((img) => {
    if (img.complete && img.naturalWidth === 0 && img.src) fallback(img);
    img.addEventListener('error', () => fallback(img), { once: true });
  });

  /* ---------- Language toggle (Arabic RTL <-> English LTR) ---------- */
  function setLang(lang) {
    const en = lang === 'en';
    document.documentElement.lang = en ? 'en' : 'ar';
    document.documentElement.dir = en ? 'ltr' : 'rtl';
    $$('[data-en]').forEach((el) => {
      if (el.dataset.ar === undefined) el.dataset.ar = el.innerHTML;
      el.innerHTML = en ? el.dataset.en : el.dataset.ar;
    });
    $$('[data-en-ph]').forEach((el) => {
      if (el.dataset.arPh === undefined) el.dataset.arPh = el.placeholder;
      el.placeholder = en ? el.dataset.enPh : el.dataset.arPh;
    });
    $$('.lang-toggle').forEach((b) => { b.textContent = en ? 'ع' : 'EN'; b.setAttribute('aria-label', en ? 'التحويل للعربية' : 'Switch to English'); });
    store.set('ip-lang', lang);
    document.dispatchEvent(new Event('langchange'));
    if (hasGsap && window.ScrollTrigger) ScrollTrigger.refresh();
  }
  if (store.get('ip-lang') === 'en') setLang('en');
  $$('.lang-toggle').forEach((b) => b.addEventListener('click', () => setLang(document.documentElement.lang === 'en' ? 'ar' : 'en')));

  /* ---------- Navbar ---------- */
  const nav = $('.nav');
  const onScroll = () => nav && nav.classList.toggle('is-scrolled', window.scrollY > 30);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  $('.burger') && $('.burger').addEventListener('click', () => nav.classList.toggle('is-open'));
  $$('.nav__links a').forEach((a) => a.addEventListener('click', () => nav.classList.remove('is-open')));

  /* ---------- Loader ---------- */
  const loader = $('.loader');
  const hideLoader = () => { if (loader) loader.classList.add('done'); intro(); };
  let introDone = false;
  if (document.readyState === 'complete') setTimeout(hideLoader, 300);
  else window.addEventListener('load', () => setTimeout(hideLoader, 300));
  setTimeout(() => { if (!introDone) hideLoader(); }, 3500); // never block on slow images

  /* ---------- Page transition wipe ---------- */
  const wipe = $('.page-wipe');
  $$('a[href$=".html"], a[href*=".html#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!wipe || !hasGsap || reduce || e.metaKey || e.ctrlKey || a.target === '_blank') return;
      if (href.split('#')[0] === location.pathname.split('/').pop()) return;
      e.preventDefault();
      gsap.to(wipe, { scaleY: 1, transformOrigin: 'bottom', duration: 0.45, ease: 'power3.in', onComplete: () => { location.href = href; } });
    });
  });
  window.addEventListener('pageshow', (e) => { if (e.persisted && wipe && hasGsap) gsap.set(wipe, { scaleY: 0 }); });

  /* ---------- Intro + scroll animations (GSAP) ---------- */
  function intro() {
    if (introDone) return; introDone = true;
    // Reveal-on-scroll uses CSS transitions (smooth even on slow devices) + IntersectionObserver
    const show = (el, i) => {
      el.style.transitionDelay = (i * 0.1) + 's';
      el.classList.add('in');
      setTimeout(() => { el.classList.add('done'); el.style.transitionDelay = ''; }, 1000 + i * 100);
    };
    const heroItems = $$('.hero .reveal, .page-hero .reveal');
    heroItems.forEach((el, i) => show(el, i + 1));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.filter((en) => en.isIntersecting).forEach((en, i) => { show(en.target, i); io.unobserve(en.target); });
      }, { rootMargin: '0px 0px -10% 0px' });
      $$('.reveal').filter((el) => !heroItems.includes(el)).forEach((el) => io.observe(el));
    } else $$('.reveal').forEach((el) => show(el, 0));

    if (!hasGsap || reduce) return;
    gsap.registerPlugin(ScrollTrigger);

    // parallax layers: data-speed="0.2" moves slower than scroll
    $$('[data-speed]').forEach((el) => {
      const sp = parseFloat(el.dataset.speed) || 0.2;
      gsap.fromTo(el, { yPercent: -sp * 50 }, {
        yPercent: sp * 50, ease: 'none',
        scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // hero content fades as you scroll past
    const hc = $('.hero__content');
    if (hc) gsap.to(hc, { yPercent: -15, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    // big headline highlight
    $$('.scrub-text').forEach((el) => {
      gsap.fromTo(el, { backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%', ease: 'none', scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 40%', scrub: true } });
    });

    // counters
    $$('[data-count]').forEach((el) => {
      const end = parseFloat(el.dataset.count);
      const obj = { v: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 95%', once: true,
        onEnter: () => gsap.to(obj, { v: end, duration: 2, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString('en-US'); } }),
      });
    });
  }

  /* ---------- 3D tilt + glass spotlight ---------- */
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  $$('.tilt').forEach((card) => {
    if (!fine || reduce) return;
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 10}deg) rotateY(${(x - 0.5) * 12}deg) translateY(-4px)`;
      card.style.setProperty('--mx', x * 100 + '%'); card.style.setProperty('--my', y * 100 + '%');
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });

  /* ---------- Cursor glow ---------- */
  const glow = $('.cursor-glow');
  if (glow && fine) {
    let gx = 0, gy = 0, cx = 0, cy = 0;
    window.addEventListener('pointermove', (e) => { gx = e.clientX; gy = e.clientY; });
    (function loop() { cx += (gx - cx) * 0.12; cy += (gy - cy) * 0.12; glow.style.transform = `translate(${cx}px, ${cy}px)`; requestAnimationFrame(loop); })();
  } else if (glow) glow.remove();

  /* ---------- BMI calculator ---------- */
  const bmiForm = $('#bmiForm');
  if (bmiForm) {
    const L = () => document.documentElement.lang === 'en';
    const cats = [
      { max: 18.5, ar: 'وزن أقل من الطبيعي', en: 'Underweight', tipAr: 'برنامج تضخيم + خطة تغذية عالية السعرات', tipEn: 'Bulking program + high-calorie meal plan' },
      { max: 25, ar: 'وزن مثالي 💪', en: 'Healthy weight 💪', tipAr: 'حافظ عليه ببرنامج قوة وتنشيف', tipEn: 'Keep it with strength & toning' },
      { max: 30, ar: 'وزن زائد', en: 'Overweight', tipAr: 'برنامج حرق دهون + كارديو HIIT', tipEn: 'Fat-burn program + HIIT cardio' },
      { max: 99, ar: 'سمنة', en: 'Obese', tipAr: 'متابعة شخصية مع مدرب + أخصائي تغذية', tipEn: '1-on-1 coaching + nutritionist' },
    ];
    const calc = (e) => {
      e && e.preventDefault();
      const h = parseFloat($('#bmiH').value) / 100, w = parseFloat($('#bmiW').value);
      if (!h || !w) return;
      const bmi = w / (h * h);
      const c = cats.find((x) => bmi < x.max);
      const valEl = $('#bmiVal');
      if (hasGsap) { const o = { v: parseFloat(valEl.textContent) || 0 }; gsap.to(o, { v: bmi, duration: 0.8, onUpdate: () => (valEl.textContent = o.v.toFixed(1)) }); }
      else valEl.textContent = bmi.toFixed(1);
      $('#bmiCat').textContent = L() ? c.en : c.ar;
      $('#bmiTip').textContent = L() ? c.tipEn : c.tipAr;
      const pct = Math.max(0, Math.min(100, ((bmi - 15) / (40 - 15)) * 100));
      $('.bmi__pin').style.insetInlineStart = pct + '%';
    };
    bmiForm.addEventListener('submit', calc);
    document.addEventListener('langchange', () => calc());
    calc();
  }

  /* ---------- Pricing monthly / yearly ---------- */
  const seg = $('#billing');
  if (seg) {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('button', seg).forEach((x) => x.classList.toggle('on', x === b));
      const yearly = b.dataset.period === 'year';
      $$('[data-month]').forEach((el) => {
        const v = yearly ? el.dataset.year : el.dataset.month;
        if (hasGsap) gsap.fromTo(el, { y: -14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, onStart: () => (el.textContent = v) });
        else el.textContent = v;
      });
      $$('.per').forEach((el) => {
        const en = document.documentElement.lang === 'en';
        el.dataset.ar = yearly ? 'ج.م / شهر (سنوي)' : 'ج.م / شهر';
        el.dataset.en = yearly ? 'EGP / mo (yearly)' : 'EGP / month';
        el.textContent = en ? el.dataset.en : el.dataset.ar;
      });
    });
  }

  /* ---------- Class schedule tabs ---------- */
  const tabs = $('#dayTabs');
  if (tabs) {
    tabs.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('button', tabs).forEach((x) => x.classList.toggle('on', x === b));
      const day = b.dataset.day;
      $$('.schedule .slot').forEach((s) => {
        const show = s.dataset.days.split(' ').includes(day);
        s.style.display = show ? '' : 'none';
      });
      if (hasGsap) gsap.fromTo('.schedule .slot:not([style*="none"])', { opacity: 0, x: 30 }, { opacity: 1, x: 0, stagger: 0.06, duration: 0.5, ease: 'power3.out' });
    });
    const first = tabs.querySelector('button.on') || tabs.querySelector('button'); first && first.click();
  }

  /* ---------- Opening hours: highlight today ---------- */
  $$('.hours tr[data-day]').forEach((tr) => { if (tr.dataset.day.split(' ').includes(String(new Date().getDay()))) tr.classList.add('today'); });

  /* ---------- Join form (demo — no backend) ---------- */
  const join = $('#joinForm');
  if (join) {
    // preselect plan from ?plan= in URL
    const plan = new URLSearchParams(location.search).get('plan');
    if (plan && $('#plan')) $('#plan').value = plan;
    join.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!join.checkValidity()) { join.reportValidity(); return; }
      const name = $('#name').value.trim().split(' ')[0];
      $$('.js-name').forEach((n) => (n.textContent = name));
      join.style.display = 'none';
      $('.form-success').classList.add('show');
    });
  }

  /* ---------- Newsletter ---------- */
  $$('.newsletter').forEach((f) => f.addEventListener('submit', (e) => {
    e.preventDefault(); const btn = f.querySelector('button');
    btn.textContent = document.documentElement.lang === 'en' ? '✓ Done' : '✓ تم';
    f.reset();
  }));

  /* ---------- Footer year ---------- */
  $$('.year').forEach((y) => (y.textContent = new Date().getFullYear()));
})();
