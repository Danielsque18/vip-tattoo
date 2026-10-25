// VIP Tattoo — сцены при прокрутке без сторонних библиотек.
// Появление (слова, блоки, шторки на фото) — CSS-переходы по IntersectionObserver.
// Всё, что привязано к прокрутке (3D, портал, параллакс, лазер), — в одном requestAnimationFrame без CSS-переходов.
window.addEventListener('error', function () { var c = document.documentElement.classList; c.add('ready', 'safe'); });
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.min(b === undefined ? 1 : b, Math.max(a || 0, v)); };
  var seg = function (p, a, b) { return clamp((p - a) / (b - a)); };
  var smooth = function (t) { return t * t * (3 - 2 * t); };
  window.VIP = window.VIP || { p: 0 };

  /* ---------- плавная прокрутка колесом (Lenis, только мышь/тачпад; на телефоне — родная прокрутка) ---------- */
  var lenis = null;
  if (typeof Lenis !== 'undefined' && !reduce && matchMedia('(pointer: fine)').matches) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
    window.VIP.lenis = lenis;
  }
  function goTo(y) { if (lenis) lenis.scrollTo(y, { duration: 1.5 }); else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href'); if (id.length < 2) return;
      var el = document.querySelector(id); if (!el) return;
      e.preventDefault();
      goTo(id === '#hero' ? 0 : el.getBoundingClientRect().top + scrollY - 60);
    });
  });

  /* ---------- шапка и меню ---------- */
  var top = document.getElementById('top'), burger = top.querySelector('.burger');
  burger.addEventListener('click', function () { var o = top.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
  top.querySelectorAll('.nav a').forEach(function (a) { a.addEventListener('click', function () { top.classList.remove('open'); burger.setAttribute('aria-expanded', false); }); });
  var navLinks = {};
  top.querySelectorAll('.nav a').forEach(function (a) { navLinks[a.getAttribute('href').slice(1)] = a; });
  var nio = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) Object.keys(navLinks).forEach(function (k) { navLinks[k].classList.toggle('on', k === e.target.id); }); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(navLinks).forEach(function (k) { var el = document.getElementById(k); if (el) nio.observe(el); });

  /* ---------- заголовки по словам ---------- */
  document.querySelectorAll('[data-split]').forEach(function (h) {
    var text = h.textContent.trim();
    h.setAttribute('aria-label', text);
    h.innerHTML = text.split(/\s+/).map(function (w, i) {
      return '<span class="sw" aria-hidden="true"><span style="transition-delay:' + (i * 0.07).toFixed(2) + 's">' + w + '</span></span>';
    }).join(' ');
  });
  var fill = document.querySelector('[data-fill]'), fws = [];
  if (fill) {
    fill.setAttribute('aria-label', fill.textContent.trim());
    fill.innerHTML = fill.textContent.trim().split(/\s+/).map(function (w) { return '<span class="fw" aria-hidden="true">' + w + '</span>'; }).join(' ');
    fws = fill.querySelectorAll('.fw');
  }

  /* ---------- появление при прокрутке ---------- */
  var rio = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('main section:not(.hero) [data-split], .rv, .tile, .ba-card, .pg, .studio-photo').forEach(function (el) { rio.observe(el); });
  // первый экран — сразу после загрузки
  requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('ready'); }); });

  /* ---------- счётчики ---------- */
  var cio = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return; cio.unobserve(e.target);
      var el = e.target, end = +el.dataset.count, t0 = performance.now();
      if (reduce) return;
      (function step(t) { var k = clamp((t - t0) / 1700); k = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(end * k); if (k < 1) requestAnimationFrame(step); })(t0);
    });
  }, { threshold: .6 });
  document.querySelectorAll('[data-count]').forEach(function (el) { cio.observe(el); });

  /* ---------- отзывы (дословно с Яндекс Карт, длинные сокращены «…») ---------- */
  var R = [
    ['Галина Костина', 'сентябрь 2026', 'Салон очень нравится, там очень приятно находиться и хочется возвращаться 💯 Спасибо за такой классный сервис и отзывчивость, сотрудники 🫶 Ходила к Веронике, в восторге от результата. Очень давно хотела к ней попасть и безумно рада, что это случилось 💘'],
    ['Юлия Замятина', 'май 2026', 'Моя любимейшая студия, которую люблю всем сердцем ни один год, пирсер Дарья – просто мое сокровище, готова возвращаться снова и снова, осталось только придумать новое место для прокола❤️‍🔥'],
    ['Антон Паршуков', 'июнь 2026', 'Отличная студия, мастер Анастасия выполнила работу отлично, все прекрасно зажило, администраторы студии после сеанса не оставляют и всегда готовы помочь, огромное спасибо'],
    ['Нюсика', 'май 2025', '… Я постоянный гость мастера Анастасии. Просто в восторге от ее работ! Сразу видно, что человек вкладывает себя в дело. Татуировки  четкие  и отлично заживают. … Моё любимое место в Омске - данная студия!'],
    ['Маргарита Вовк', 'март 2025', 'Viptattoo в моем сердечке 🫶🏻 несколько лет назад Дарья открыла мне мир пирсинга и теперь я не могу остановиться) И моя первая татуировка появилась на свет тоже здесь, спасибо Веронике🥰'],
    ['Алёна Хижа', 'август 2023', '… Прекрасные тату мастера, особенно Селина. Второй раз делаю татуировку и именно у неё. Великолепный мастер, всё расскажет и покажет, время на сеансе проходит быстро. На всех этапах заживления отслеживает. Рекомендую 👍'],
    ['Елена Минеева', 'сентябрь 2025', '… Мастер Анастасия профессионально подошла к делу, внимательно выслушал мои пожелания на основе которых нарисовала эскиз, который и воплотила в жизнь. Работа выполнена аккуратно, качественно и превзошла все мои ожидания.'],
    ['Ксения Гашкова', 'декабрь 2021', 'Свожу татуировку у Станислава два года. … за 4 сеанса значительно ушел пигмент! В студии сейчас стоит новейший лазер, которому не требуется много времени для сведения.'],
    ['Евгений Л.', 'сентябрь 2024', 'Спасибо Вячеславу за проделанную работу.  Все быстро, четко и здорово, грамотный специалист знающий своё дело, все рассказал объяснил показал и сделал быстро и качественно)'],
    ['Кристина Дегтярева', 'декабрь 2021', '… 15 минут ушло от выбора украшения до ухода счастливой с серьгой в носу :) Дарья! Милая девушка и профессионал своего дела! Когда вручили чупик - так весь страх ушел :)))'],
    ['Саша ш.', 'апрель 2022', 'Лучше тату  салон в Омске не найти! … я поняла, что это именно то, что я искала: профессионализм, стерильность и приятное общение.'],
    ['Екатерина', 'сентябрь 2023', 'Сегодня была на сеансе у Анастасии, до сих пор в шоке от такой красоты на своем теле, от профессионализма, от качества работы мастера и всей студии в целом. … Спасибо всей команде VIP Tattoo, обязательно приду еще!!!'],
    ['Elena', 'сентябрь 2024', 'Дашуля просто богиня пирсинга! Доверяю только ей свои проколы! Крыло носа даже не почувствовала , быстро и идеально❤️'],
    ['Алена Смехова', 'август 2026', 'Спасибо за мою классную лису! Все отлично, минусов нет!']
  ];
  var esc = function (s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var card = function (r) { return '<article class="rcard"><span class="stars" aria-label="5 звёзд">★★★★★</span><p>' + esc(r[2]) + '</p><cite>' + esc(r[0]) + '<small>Яндекс Карты · ' + r[1] + '</small></cite></article>'; };
  function fillRow(id, list) {
    var el = document.getElementById(id); if (!el) return;
    var html = list.map(card).join('');
    el.innerHTML = html + html.replace(/<article class="rcard"/g, '<article class="rcard" aria-hidden="true"');   // вторая копия — для бесшовной ленты
  }
  fillRow('revA', R.slice(0, 7)); fillRow('revB', R.slice(7));

  /* ---------- статус «открыто» по омскому времени (UTC+6) ---------- */
  (function () {
    var el = document.getElementById('open'), el2 = document.getElementById('openTop'); if (!el) return;
    function draw() {
      var d = new Date(Date.now() + (6 * 60 + new Date().getTimezoneOffset()) * 60000), m = d.getHours() * 60 + d.getMinutes();
      var open = m >= 660 && m < 1200;
      el.classList.toggle('is-open', open); el2.classList.toggle('is-open', open);
      el.textContent = open ? 'Сейчас открыто, до 20:00' : (m < 660 ? 'Откроемся сегодня в 11:00' : 'Откроемся завтра в 11:00');
      el2.textContent = open ? 'Открыто до 20:00' : (m < 660 ? 'Откроемся в 11:00' : 'Завтра с 11:00');
    }
    draw(); setInterval(draw, 60000);
  })();

  /* ---------- просмотр работ крупно ---------- */
  (function () {
    var lb = document.getElementById('lb'), img = lb.querySelector('img'), tiles = [].slice.call(document.querySelectorAll('.tile')), i = 0, last = null;
    function show(k) { i = (k + tiles.length) % tiles.length; var t = tiles[i].querySelector('img'); img.src = t.src; img.alt = t.alt; }
    function open(k) { last = document.activeElement; show(k); lb.hidden = false; root.style.overflow = 'hidden'; if (lenis) lenis.stop(); lb.querySelector('.lb-x').focus(); }
    function close() { lb.hidden = true; root.style.overflow = ''; if (lenis) lenis.start(); if (last) last.focus(); }
    tiles.forEach(function (t, k) { t.addEventListener('click', function () { open(k); }); });
    lb.querySelector('.lb-x').addEventListener('click', close);
    lb.querySelector('.lb-prev').addEventListener('click', function () { show(i - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { show(i + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1);
    });
  })();

  /* ---------- карта Яндекса: грузится, когда до неё долистали (или по кнопке) ---------- */
  (function () {
    var box = document.getElementById('map'); if (!box) return;
    var ll = '73.385746,54.960158';
    function load() { if (box.dataset.on) return; box.dataset.on = 1; box.innerHTML = '<iframe src="https://yandex.ru/map-widget/v1/?ll=' + ll + '&z=16&pt=' + ll + ',pm2blm" title="VIP Tattoo на карте: пр. Карла Маркса, 32" loading="lazy" allowfullscreen></iframe>'; }
    box.querySelector('.map-load').addEventListener('click', load);
    new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { load(); o.disconnect(); } }, { rootMargin: '400px' }).observe(box);
  })();

  /* ---------- копирование адреса ---------- */
  var toast = document.getElementById('toast');
  function say(t) { toast.textContent = t; toast.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(function () { toast.classList.remove('on'); }, 2400); }
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = b.dataset.copy, ok = false, a = document.createElement('textarea');
      a.value = text; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = 0; document.body.appendChild(a); a.select();
      try { ok = document.execCommand('copy'); } catch (e) {}
      a.remove();
      if (!ok && navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
      say('Адрес скопирован');
    });
  });

  /* ---------- кнопки слегка тянутся за курсором ---------- */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
    document.querySelectorAll('.magnet').forEach(function (b) {
      b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .18).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * .3).toFixed(1) + 'px)'; });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  /* ---------- сцены, привязанные к прокрутке ---------- */
  var hero = document.getElementById('hero'), intro = document.querySelector('.h-intro');
  var fadeOut = document.querySelectorAll('.h-intro, .h-hint, .h-rate');
  var hint = document.querySelector('.h-hint');
  var cos = [].slice.call(document.querySelectorAll('.co'));
  var portal = document.querySelector('.portal');
  var bar = document.querySelector('.progress i');
  var tileImgs = [].slice.call(document.querySelectorAll('.tile img'));
  var studioImg = document.querySelector('.studio-photo img'), teamImg = document.querySelector('.team-photo img');
  var laser = document.querySelector('.laser'), lpin = document.querySelector('.laser-pin'), lspans = [].slice.call(document.querySelectorAll('.laser-h span'));
  var vh = innerHeight, vw = innerWidth, shown = 0, last = performance.now(), lastY = scrollY, docH = document.documentElement.scrollHeight;
  addEventListener('resize', function () { vh = innerHeight; vw = innerWidth; docH = document.documentElement.scrollHeight; });
  addEventListener('load', function () { docH = document.documentElement.scrollHeight; });

  // какие блоки сейчас рядом с экраном — считаем только их
  var near = {};
  var vio = new IntersectionObserver(function (es) { es.forEach(function (e) { near[e.target.id] = e.isIntersecting; }); }, { rootMargin: '25% 0px' });
  ['about', 'works', 'studio', 'team', 'laser'].forEach(function (id) { var el = document.getElementById(id); if (el) vio.observe(el); });

  function through(r) { return clamp((vh - r.top) / (vh + r.height)); }   // 0 — показался снизу, 1 — ушёл вверх

  // выноски: компьютер — над/под деталью по очереди, телефон — справа от детали
  function placeCallouts(p) {
    var parts = window.VIP.parts, k = seg(p, .34, .40) * (1 - seg(p, .54, .58)) * seg(window.VIP.e || 0, .85, 1);
    cos.forEach(function (li, i) {
      var vis = k > .01 && parts;
      li.style.visibility = vis ? 'visible' : 'hidden';
      li.style.opacity = k.toFixed(3);
      if (!vis) return;
      var x = parts[i][0], y = parts[i][1], line = li.firstChild, txt = li.lastChild, off = (1 - k) * 14;
      if (window.VIP.stacked) {
        line.style.cssText = 'left:' + (x + 8).toFixed(1) + 'px;top:' + y.toFixed(1) + 'px;width:30px;height:1px';
        txt.style.cssText = 'left:' + (x + 46 + off).toFixed(1) + 'px;top:' + (y - 22).toFixed(1) + 'px;text-align:left';
      } else {
        var upSide = i % 2 === 0, L = Math.min(110, vh * .13), cx = clamp(x, 140, vw - 140);
        line.style.cssText = 'left:' + x.toFixed(1) + 'px;top:' + (upSide ? y - L - 10 : y + 10).toFixed(1) + 'px;width:1px;height:' + L.toFixed(1) + 'px';
        txt.style.cssText = 'left:' + (cx - 115).toFixed(1) + 'px;top:' + (upSide ? y - L - 18 - txt.offsetHeight - off : y + L + 18 + off).toFixed(1) + 'px;text-align:center';
      }
    });
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (lenis) lenis.raf(now);
    var dt = Math.min((now - last) / 1000, .05); last = now;
    var y = scrollY;

    // --- чтение (все замеры подряд, без записи стилей между ними) ---
    var hr = hero.getBoundingClientRect();
    window.VIP.introTop = intro.getBoundingClientRect().top - (parseFloat(intro.style.marginTop) || 0);
    var fr = near.about && fill ? fill.getBoundingClientRect() : null;
    var tr = near.works ? tileImgs.map(function (im) { return im.parentNode.getBoundingClientRect(); }) : null;
    var sr = near.studio && studioImg ? studioImg.parentNode.getBoundingClientRect() : null;
    var mr = near.team && teamImg ? teamImg.parentNode.getBoundingClientRect() : null;
    var lr = near.laser ? laser.getBoundingClientRect() : null;
    var spans = lr ? lspans.map(function (sp) { var b = sp.getBoundingClientRect(); return b.top + b.height * .5; }) : null;

    // --- запись ---
    bar.style.transform = 'scaleX(' + clamp(y / Math.max(1, docH - vh)).toFixed(4) + ')';
    if (Math.abs(y - lastY) > 6) { top.classList.toggle('hide', y > lastY && y > vh * .6 && !top.classList.contains('open')); lastY = y; }

    // первый экран: прогресс догоняет прокрутку плавно — 3D не дёргается от колёсика
    var target = clamp(-hr.top / Math.max(1, hr.height - vh));
    shown += (target - shown) * (reduce ? 1 : 1 - Math.pow(.0025, dt));
    if (Math.abs(target - shown) < .0004) shown = target;
    var p = shown; window.VIP.p = p;
    if (hr.bottom > -vh) {
      var o = 1 - seg(p, .03, .12);
      fadeOut.forEach(function (el) { el.style.opacity = o.toFixed(3); el.style.visibility = o > .01 ? 'visible' : 'hidden'; });
      intro.style.marginTop = (seg(p, .03, .12) * (window.VIP.stacked ? 36 : -40)).toFixed(1) + 'px';   // на телефоне текст уходит вниз — от машинки
      if (window.VIP.box && window.VIP.stacked) {
        var hy = window.VIP.box[3] + 10, room = window.VIP.introTop - 30 - hy;   // подсказка под машинкой, если между ней и текстом есть место
        hint.style.setProperty('--hint-y', Math.round(hy) + 'px');
        hint.classList.toggle('no-room', room < 0);
      }
      placeCallouts(p);
      var k = smooth(seg(p, .86, .98));
      var tip = window.VIP.tip || [vw / 2, vh / 2];
      var px = tip[0] + (vw / 2 - tip[0]) * k * .6, py = tip[1] + (vh / 2 - tip[1]) * k * .6;
      var maxR = Math.hypot(Math.max(px, vw - px), Math.max(py, vh - py)) * 1.02;
      portal.style.visibility = k > 0 ? 'visible' : 'hidden';
      portal.style.setProperty('--pr', (k * maxR).toFixed(1) + 'px');
      portal.style.setProperty('--px', px.toFixed(1) + 'px');
      portal.style.setProperty('--py', py.toFixed(1) + 'px');
      portal.style.setProperty('--ps', (1.3 - k * .3).toFixed(3));
      portal.style.setProperty('--pt', smooth(seg(p, .93, 1)).toFixed(3));
    }
    root.classList.toggle('past-hero', hr.bottom < 0);
    top.classList.toggle('solid', (y > 30 && p < .8) || hr.bottom < 60);
    if (reduce) return;

    if (fr && fr.top < vh && fr.bottom > 0) {
      var n = Math.round(clamp((vh * .8 - fr.top) / (fr.height + vh * .3)) * fws.length);
      for (var i = 0; i < fws.length; i++) fws[i].classList.toggle('on', i < n);
    }
    if (tr) tr.forEach(function (r, i) { if (r.top < vh && r.bottom > 0) tileImgs[i].style.transform = 'translate3d(0,' + (-through(r) * 13).toFixed(2) + '%,0)'; });
    if (sr && sr.top < vh && sr.bottom > 0) studioImg.style.transform = 'translate3d(0,' + (-through(sr) * 12).toFixed(2) + '%,0)';
    if (mr && mr.top < vh && mr.bottom > 0) teamImg.style.transform = 'scale(' + (1.14 - through(mr) * .14).toFixed(4) + ')';
    if (lr && lr.top < vh && lr.bottom > 0) {
      var lp = clamp(-lr.top / Math.max(1, lr.height - vh));
      lpin.style.setProperty('--lp', lp.toFixed(4));
      var beamY = vh * (.1 + lp * .8);
      lspans.forEach(function (sp, i) { sp.classList.toggle('lit', beamY > spans[i]); });
    }
  }
  requestAnimationFrame(frame);
})();

// если 3D не запустилось за 4 секунды (нет WebGL) — показываем снимок машинки
setTimeout(function () { if (!document.documentElement.classList.contains('has-3d')) document.documentElement.classList.add('no-3d'); }, 4000);
