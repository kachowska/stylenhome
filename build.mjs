// Сборка статического сайта: node build.mjs  →  папка dist/
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

const site = JSON.parse(readFileSync(join(SRC, 'data/site.json'), 'utf8'));
const projects = JSON.parse(readFileSync(join(SRC, 'data/projects.json'), 'utf8'));
const layout = readFileSync(join(SRC, 'layout.html'), 'utf8');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const pad = (n) => String(n).padStart(2, '0');
const ROOMS = { living: 'Гостиные', bedroom: 'Спальни', wet: 'Кухни и ванные' };

// Орнамент ар-деко: веер из лучей
function fan() {
  const rays = [];
  for (let a = 0; a <= 180; a += 15) {
    const r = (a * Math.PI) / 180;
    rays.push(`<line x1="60" y1="60" x2="${(60 - 56 * Math.cos(r)).toFixed(1)}" y2="${(60 - 56 * Math.sin(r)).toFixed(1)}"/>`);
  }
  const arcs = [56, 38, 20].map((r) => `<path d="M${60 - r} 60 A${r} ${r} 0 0 1 ${60 + r} 60"/>`);
  return `<svg class="fan" viewBox="0 0 120 62" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1">${rays.join('')}${arcs.join('')}</svg>`;
}

// Ступенчатый уголок
function corner(pos) {
  return `<svg class="corner corner--${pos}" viewBox="0 0 120 120" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1"><path d="M1 120V1h119"/><path d="M13 96V13h83"/><path d="M25 72V25h47"/><path d="M37 48V37h11" /><rect x="-4" y="-4" width="8" height="8" transform="translate(49 49) rotate(45)" fill="currentColor" stroke="none"/></svg>`;
}

function monogram() {
  return `<svg class="monogram" viewBox="0 0 80 104" aria-hidden="true" fill="none" stroke="currentColor"><path d="M4 100V40a36 36 0 0 1 72 0v60z" stroke-width="1.2"/><path d="M10 100V40a30 30 0 0 1 60 0v60" stroke-width=".6"/><text x="40" y="70" text-anchor="middle" fill="currentColor" stroke="none" font-family="Cormorant Garamond, serif" font-size="30" letter-spacing="1">${esc(site.monogram)}</text></svg>`;
}

const card = (p, root, i) => `
<a class="card reveal" href="${root}projects/${p.slug}.html" data-room="${p.room}">
  <span class="card__img"><img src="${root}assets/img/${p.cover}" alt="${esc(p.title)}" loading="lazy"></span>
  <span class="card__meta"><span class="num">${pad(i + 1)}</span><span>${esc(p.city)} · ${esc(p.area)}</span></span>
  <span class="card__title">${esc(p.title)}</span>
</a>`;

const CTA = `
<section class="cta">
  <div class="wrap cta__in">
    {{fan}}
    <h2>Расскажите о вашем доме</h2>
    <p>Ответим в течение дня и предложим время для знакомства — лично в Минске или по видеосвязи.</p>
    <a class="btn btn--light" href="{{root}}contacts.html">Обсудить проект</a>
  </div>
</section>`;

const tokens = (root) => ({
  root,
  cta: CTA,
  brand: esc(site.brand),
  designer: esc(site.designer),
  since: site.since,
  years: new Date().getFullYear() - site.since,
  tagline: esc(site.tagline),
  geo: site.geo.map(esc).join(' <i>·</i> '),
  phone: esc(site.phone),
  phone_href: site.phone.replace(/[^+\d]/g, ''),
  email: esc(site.email),
  fan: fan(),
  corner_tr: corner('tr'),
  corner_bl: corner('bl'),
  monogram: monogram(),
  projects_count: projects.length,
  projects_strip: projects
    .slice(0, 6)
    .map(
      (p, i) => `
<a class="strip__item" href="${root}projects/${p.slug}.html">
  <img src="${root}assets/img/${p.cover}" alt="${esc(p.title)}" loading="lazy">
  <span class="strip__cap"><span class="num">${pad(i + 1)}</span>${esc(p.title)}</span>
</a>`
    )
    .join(''),
  projects_grid: projects.map((p, i) => card(p, root, i)).join(''),
  filters:
    `<button class="chip is-active" data-filter="all">Все</button>` +
    Object.entries(ROOMS)
      .map(([k, v]) => `<button class="chip" data-filter="${k}">${v}</button>`)
      .join(''),
  services_short: site.services
    .map(
      (s, i) => `
<li class="svc reveal"><span class="num">${pad(i + 1)}</span><h3>${esc(s.title)}</h3><p>${esc(s.short)}</p></li>`
    )
    .join(''),
  services_full: site.services
    .map(
      (s, i) => `
<article class="svc-full reveal">
  <span class="num">${pad(i + 1)}</span>
  <div><h2>${esc(s.title)}</h2><p>${esc(s.short)}</p></div>
  <ul>${s.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
</article>`
    )
    .join(''),
  process: site.process
    .map(
      (s, i) => `
<li class="step reveal"><span class="num">${pad(i + 1)}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`
    )
    .join(''),
});

function fill(tpl, t) {
  let out = tpl;
  for (let pass = 0; pass < 3; pass++) out = out.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in t ? t[k] : m));
  return out;
}

function page({ file, title, description, bodyClass = '', active = '', content, root = '' }) {
  const t = { ...tokens(root), title: esc(title), description: esc(description), bodyClass, content };
  for (const k of ['portfolio', 'services', 'about', 'contacts']) t[`on_${k}`] = active === k ? ' aria-current="page"' : '';
  const html = fill(layout, t);
  const left = html.match(/\{\{\w+\}\}/);
  if (left) throw new Error(`${file}: незаполненный токен ${left[0]}`);
  const out = join(DIST, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
}

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
cpSync(join(SRC, 'assets'), join(DIST, 'assets'), { recursive: true });

const META = {
  index: { title: `${site.brand} — ${site.tagline}`, description: `Дизайн интерьеров в стиле ар-деко с ${site.since} года. ${site.geo.join(', ')}.`, bodyClass: 'home' },
  portfolio: { title: `Портфолио — ${site.brand}`, description: 'Реализованные интерьеры: квартиры и дома.', active: 'portfolio' },
  services: { title: `Услуги — ${site.brand}`, description: 'Дизайн-проект, авторский надзор, комплектация, декорирование, проект онлайн.', active: 'services' },
  about: { title: `О дизайнере — ${site.brand}`, description: `Дизайнер интерьеров с ${site.since} года. Ар-деко и современная классика.`, active: 'about' },
  contacts: { title: `Контакты — ${site.brand}`, description: 'Обсудить проект: заявка, телефон, мессенджеры.', active: 'contacts' },
};

for (const f of readdirSync(join(SRC, 'pages'))) {
  const name = f.replace(/\.html$/, '');
  if (!META[name]) throw new Error(`Нет описания для страницы ${f}`);
  page({ file: f, content: readFileSync(join(SRC, 'pages', f), 'utf8'), ...META[name] });
}

projects.forEach((p, i) => {
  const next = projects[(i + 1) % projects.length];
  const root = '../';
  const content = `
<article class="project">
  <header class="project__head wrap">
    <a class="back" href="${root}portfolio.html">← Все проекты</a>
    <p class="eyebrow">Проект ${pad(i + 1)}</p>
    <h1>${esc(p.title)}</h1>
    <p class="lead">${esc(p.lead)}</p>
  </header>
  <figure class="project__cover"><img src="${root}assets/img/${p.cover}" alt="${esc(p.title)}"></figure>
  <div class="project__body wrap">
    <dl class="facts">
      <div><dt>Тип</dt><dd>${esc(p.type)}</dd></div>
      <div><dt>Город</dt><dd>${esc(p.city)}</dd></div>
      <div><dt>Площадь</dt><dd>${esc(p.area)}</dd></div>
      <div><dt>Год</dt><dd>${esc(p.year)}</dd></div>
      <div><dt>Стиль</dt><dd>Ар-деко</dd></div>
    </dl>
    <p class="project__text">${esc(p.text)}</p>
  </div>
  ${p.gallery.length ? `<div class="project__gallery wrap n${p.gallery.length}">${p.gallery.map((g) => `<figure class="reveal"><img src="${root}assets/img/${g}" alt="${esc(p.title)} — деталь" loading="lazy"></figure>`).join('')}</div>` : ''}
  <a class="next wrap" href="${root}projects/${next.slug}.html">
    <span class="eyebrow">Следующий проект</span>
    <span class="next__title">${esc(next.title)} →</span>
  </a>
</article>
{{cta}}`;
  page({ file: `projects/${p.slug}.html`, title: `${p.title} — ${site.brand}`, description: p.lead, active: 'portfolio', content, root });
});

console.log(`Готово: ${readdirSync(DIST).filter((f) => f.endsWith('.html')).length} страниц + ${projects.length} проектов → dist/`);
