document.querySelectorAll('[data-comparison]').forEach(figure => {
  const scene = figure.parentElement;
  const compare = figure.querySelector('[data-compare]');
  const pair = figure.querySelector('[data-compare-pair]');
  const hint = figure.querySelector('.compare-hint');
  const range = compare.querySelector('input');
  const controls = figure.querySelector('.compare-mode');
  const modes = Array.from(controls.querySelectorAll('[data-compare-mode]'));
  const scrollMotion = window.matchMedia('(min-height: 530px) and (prefers-reduced-motion: no-preference)');
  const initialValue = Number(range.value);
  let manual = false;
  let frame = 0;
  function update(value = Number(range.value)) {
    compare.style.setProperty('--split', value + '%');
    compare.dataset.position = value === 100 ? 'before' : value === 0 ? 'after' : 'split';
  }
  function renderScroll() {
    frame = 0;
    if (!scrollMotion.matches || manual || compare.hidden) return;
    const distance = scene.offsetHeight - figure.offsetHeight;
    if (distance <= 0) return;
    const stickyTop = parseFloat(getComputedStyle(figure).top);
    const progress = Math.max(0, Math.min(1, (stickyTop - scene.getBoundingClientRect().top) / distance));
    const sweep = Math.max(0, Math.min(1, (progress - .08) / .8));
    const split = 100 * (1 - sweep * sweep * (3 - 2 * sweep));
    compare.style.setProperty('--scene-scale', .94 + .06 * Math.min(1, progress / .3));
    range.value = Math.round(split);
    update(split);
  }
  function queueScroll() {
    if (!frame && scrollMotion.matches && !manual && !compare.hidden) frame = requestAnimationFrame(renderScroll);
  }
  function syncMotion() {
    scene.classList.toggle('compare-scroll-enabled', scrollMotion.matches);
    if (scrollMotion.matches) {
      queueScroll();
    } else if (!manual) {
      range.value = initialValue;
      update();
    }
  }
  function selectMode(button) {
    const showPair = button.dataset.compareMode === 'pair';
    pair.hidden = !showPair;
    compare.hidden = showPair;
    hint.hidden = showPair;
    modes.forEach(mode => mode.setAttribute('aria-pressed', mode === button));
    queueScroll();
  }
  modes.forEach(button => button.addEventListener('click', () => selectMode(button)));
  range.addEventListener('input', () => {
    manual = true;
    scene.classList.add('compare-manual');
    update();
  });
  update();
  selectMode(modes.find(button => button.dataset.compareMode === 'slider'));
  controls.hidden = false;
  window.addEventListener('scroll', queueScroll, {passive: true});
  window.addEventListener('resize', queueScroll);
  scrollMotion.addEventListener('change', syncMotion);
  syncMotion();
});

document.querySelectorAll('[data-demo]').forEach(demo => {
  const tabs = Array.from(demo.querySelectorAll('[role="tab"]'));
  function select(index, focus = false) {
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

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const introVideo = document.querySelector('[data-intro-video]');
if (introVideo) {
  let startDeadline;
  function showWordmark() {
    clearTimeout(startDeadline);
    introVideo.hidden = true;
    introVideo.pause();
  }
  introVideo.addEventListener('ended', showWordmark, { once: true });
  introVideo.addEventListener('error', showWordmark, { once: true });
  reducedMotion.addEventListener('change', event => {
    if (event.matches) showWordmark();
  });
  if (reducedMotion.matches) {
    showWordmark();
  } else {
    introVideo.muted = true;
    introVideo.src = introVideo.dataset.src;
    startDeadline = setTimeout(showWordmark, 3000);
    introVideo.play().then(() => clearTimeout(startDeadline)).catch(showWordmark);
  }
}

const chapterLinks = Array.from(document.querySelectorAll('[data-chapter-link]'));
if (chapterLinks.length) {
  const chapters = chapterLinks.map(link => {
    const section = document.getElementById(link.hash.slice(1));
    const sequence = section.querySelector('[data-sequence]');
    return { link, section, sequence, stage: sequence.firstElementChild };
  });
  const nav = document.querySelector('.work-nav');
  const header = document.querySelector('.site-header');
  const company = document.querySelector('[data-company-story]');
  const companyStage = company.querySelector('.company-stage');
  const sentences = Array.from(company.querySelectorAll('.company-lines li'));
  const meter = Array.from(company.querySelectorAll('.company-meter span'));
  const clamp = number => Math.min(1, Math.max(0, number));
  let pending = false;
  let currentSentence = 0;

  function updateStory(headerBottom) {
    const distance = company.offsetHeight - companyStage.offsetHeight;
    if (distance <= 0) return;
    const progress = clamp((headerBottom - company.getBoundingClientRect().top) / distance);
    const index = Math.min(sentences.length - 1, Math.floor(progress * sentences.length));
    if (index === currentSentence) return;
    sentences[currentSentence].classList.remove('is-active');
    meter[currentSentence].classList.remove('is-active');
    sentences[index].classList.add('is-active');
    meter[index].classList.add('is-active');
    currentSentence = index;
  }

  function updateChapter() {
    pending = false;
    const stickyTop = nav.getBoundingClientRect().bottom;
    const threshold = stickyTop + 24;
    const motion = !reducedMotion.matches;
    if (motion) updateStory(header.getBoundingClientRect().bottom);
    const measurements = chapters.map(({ link, section, sequence, stage }) => {
      const rect = section.getBoundingClientRect();
      const active = rect.top <= threshold && rect.bottom > threshold;
      const travel = motion ? sequence.offsetHeight - stage.offsetHeight : 0;
      return { link, sequence, rect, active, travel };
    });
    measurements.forEach(({ link, sequence, rect, active, travel }) => {
      if (active) {
        link.setAttribute('aria-current', 'location');
        link.style.setProperty('--chapter-progress', motion ? Math.max(.16, clamp((threshold - rect.top) / rect.height)) : 1);
      } else {
        link.removeAttribute('aria-current');
      }
      if (!travel) return;
      const progress = clamp((stickyTop - rect.top) / travel);
      sequence.style.setProperty('--logo-lift', `${(-1.15 * progress).toFixed(3)}rem`);
      sequence.style.setProperty('--logo-scale', (1 - .1 * progress).toFixed(3));
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

