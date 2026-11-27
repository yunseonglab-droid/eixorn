const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function followPreview(element, render) {
  let frame = 0;
  function update() {
    frame = 0;
    const height = window.innerHeight;
    const top = element.getBoundingClientRect().top;
    const progress = Math.max(0, Math.min(1, (.86 * height - top) / (.5 * height)));
    render(reducedMotion.matches ? null : progress);
  }
  function queue() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  reducedMotion.addEventListener('change', queue);
  queue();
  return queue;
}

document.querySelectorAll('[data-comparison]').forEach(figure => {
  const compare = figure.querySelector('[data-compare]');
  const pair = figure.querySelector('[data-compare-pair]');
  const hint = figure.querySelector('.compare-hint');
  const range = compare.querySelector('input');
  const controls = figure.querySelector('.compare-mode');
  const modes = Array.from(controls.querySelectorAll('[data-compare-mode]'));
  const initialValue = Number(range.value);
  let manual = false;
  function update(value = Number(range.value)) {
    compare.style.setProperty('--split', value + '%');
    compare.dataset.position = value === 100 ? 'before' : value === 0 ? 'after' : 'split';
  }
  const refreshPreview = followPreview(compare, progress => {
    figure.classList.toggle('compare-scroll-enabled', progress !== null);
    if (manual || compare.hidden) return;
    const split = progress === null ? initialValue : 100 * (1 - progress * progress * (3 - 2 * progress));
    range.value = Math.round(split);
    update(split);
  });
  function selectMode(button) {
    const showPair = button.dataset.compareMode === 'pair';
    pair.hidden = !showPair;
    compare.hidden = showPair;
    hint.hidden = showPair;
    modes.forEach(mode => mode.setAttribute('aria-pressed', mode === button));
    refreshPreview();
  }
  modes.forEach(button => button.addEventListener('click', () => selectMode(button)));
  range.addEventListener('input', () => {
    manual = true;
    figure.classList.add('compare-manual');
    update();
  });
  update();
  selectMode(modes.find(button => button.dataset.compareMode === 'slider'));
  controls.hidden = false;
});

document.querySelectorAll('[data-demo]').forEach(demo => {
  const tabs = Array.from(demo.querySelectorAll('[role="tab"]'));
  const remPreview = demo.querySelector('[data-rem-preview]');
  const remViews = remPreview?.querySelectorAll('[data-rem-view]');
  const remStatuses = remPreview?.querySelectorAll('[data-rem-status]');
  const remSteps = remPreview?.querySelectorAll('[data-rem-step]');
  let manual = false;
  function setRemPhase(phase) {
    if (!remPreview || remPreview.dataset.phase === String(phase)) return;
    remPreview.dataset.phase = String(phase);
    const view = phase === 1 ? '0' : String(phase);
    remViews.forEach(shot => {
      const current = shot.dataset.remView === view;
      shot.classList.toggle('is-current', current);
      shot.setAttribute('aria-hidden', !current);
    });
    remSteps.forEach(button => button.setAttribute('aria-pressed', button.dataset.remStep === view));
    remStatuses.forEach((status, i) => { status.hidden = i !== phase; });
  }
  function select(index, focus = false) {
    manual = true;
    const changed = demo.dataset.selected !== String(index);
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', selected);
      tab.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      panel.hidden = !selected;
      panel.classList.toggle('is-changing', selected && changed);
    });
    demo.dataset.selected = String(index);
    if (focus) tabs[index].focus();
  }
  if (remPreview) {
    followPreview(remPreview.querySelector('.rem-screen'), progress => {
      if (manual) return;
      if (progress === null) {
        setRemPhase(3);
        return;
      }
      setRemPhase(progress < .2 ? 0 : progress < .45 ? 1 : progress < .7 ? 2 : 3);
    });
  }
  remSteps?.forEach(button => button.addEventListener('click', () => {
    manual = true;
    setRemPhase(Number(button.dataset.remStep));
  }));
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', event => {
      let target = index;
      switch (event.key) {
        case 'ArrowLeft': target = (index + tabs.length - 1) % tabs.length; break;
        case 'ArrowRight': target = (index + 1) % tabs.length; break;
        case 'Home': target = 0; break;
        case 'End': target = tabs.length - 1; break;
        default: return;
      }
      event.preventDefault();
      select(target, true);
    });
  });
});

document.querySelectorAll('[data-print]').forEach(button => {
  button.hidden = false;
  button.addEventListener('click', () => window.print());
});

const homeProducts = document.querySelector('.home-products');
if (homeProducts) {
  const productLinks = Array.from(homeProducts.querySelectorAll('a'));
  function openLegacyProductLink() {
    const hash = window.location.hash;
    const link = hash === '#products'
      ? document.querySelector('[data-products-link]')
      : productLinks.find(product => product.hash === hash);
    if (link) window.location.replace(link.href);
  }
  window.addEventListener('hashchange', openLegacyProductLink);
  openLegacyProductLink();
}

const chapterLinks = Array.from(document.querySelectorAll('[data-chapter-link]'));
if (chapterLinks.length) {
  const chapters = chapterLinks.map(link => {
    const section = document.getElementById(link.hash.slice(1));
    const sequence = section.querySelector('[data-sequence]');
    return { link, section, sequence, stage: sequence.firstElementChild };
  });
  const nav = document.querySelector('.work-nav');
  const clamp = number => Math.min(1, Math.max(0, number));
  let pending = false;

  function updateChapter() {
    pending = false;
    const stickyTop = nav.getBoundingClientRect().bottom;
    const threshold = stickyTop + 24;
    const motion = !reducedMotion.matches;
    const measurements = chapters.map(({ link, section, sequence, stage }) => {
      const rect = section.getBoundingClientRect();
      const active = rect.top <= threshold && rect.bottom > threshold;
      const travel = motion ? sequence.offsetHeight - stage.offsetHeight : 0;
      return { link, sequence, rect, active, travel };
    });
    measurements.forEach(({ link, sequence, rect, active, travel }) => {
      if (active) {
        link.setAttribute('aria-current', 'location');
        link.style.setProperty('--chapter-progress', motion ? clamp((threshold - rect.top) / rect.height) : 1);
      } else {
        link.removeAttribute('aria-current');
      }
      if (!travel) return;
      const progress = clamp((stickyTop - rect.top) / travel);
      const eased = progress * progress * (3 - 2 * progress);
      sequence.style.setProperty('--logo-lift', `${(-1.75 * eased).toFixed(3)}rem`);
      sequence.style.setProperty('--logo-scale', (1 - .12 * eased).toFixed(3));
    });
  }
  function queueChapter() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(updateChapter);
  }
  window.addEventListener('scroll', queueChapter, { passive: true });
  window.addEventListener('resize', queueChapter, { passive: true });
  function updateMotion() {
    document.documentElement.classList.toggle('motion-scenes', !reducedMotion.matches);
    updateChapter();
  }
  reducedMotion.addEventListener('change', updateMotion);
  updateMotion();
}

