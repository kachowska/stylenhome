(() => {
  const header = document.getElementById('header');
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');

  // Шапка на главной: прозрачная над фото, плотная после прокрутки
  if (document.body.classList.contains('home')) {
    const onScroll = () => header.classList.toggle('is-solid', window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Мобильное меню
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));

  // Появление блоков
  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))),
      { rootMargin: '0px 0px -8% 0px' }
    );
    items.forEach((el) => io.observe(el));
  } else items.forEach((el) => el.classList.add('in'));

  // Фильтр портфолио
  const grid = document.getElementById('grid');
  document.querySelectorAll('.chip').forEach((chip) =>
    chip.addEventListener('click', () => {
      const f = chip.dataset.filter;
      document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('is-active', c === chip));
      grid.classList.toggle('is-filtered', f !== 'all');
      grid.querySelectorAll('.card').forEach((c) => {
        c.hidden = f !== 'all' && c.dataset.room !== f;
        c.classList.add('in');
      });
    })
  );

  // Форма заявки: пока нет сервера, открывает письмо в почтовой программе
  const form = document.getElementById('lead-form');
  if (form) {
    const note = document.getElementById('form-note');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      form.querySelectorAll('[required]').forEach((el) => {
        const bad = el.type === 'checkbox' ? !el.checked : !el.value.trim();
        el.classList.toggle('is-invalid', bad);
        if (bad && ok) (el.focus(), (ok = false));
      });
      if (!ok) return (note.textContent = 'Заполните имя, контакт и отметьте согласие.');
      const d = new FormData(form);
      const body = [
        `Имя: ${d.get('name')}`,
        `Контакт: ${d.get('contact')}`,
        `Объект: ${d.get('type')}, ${d.get('area') || '—'} м²`,
        `Город: ${d.get('city') || '—'}`,
        '',
        d.get('message') || '',
      ].join('\n');
      location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent('Заявка с сайта')}&body=${encodeURIComponent(body)}`;
      note.textContent = 'Открываем почтовую программу для отправки заявки…';
    });
  }
})();
