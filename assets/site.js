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

const introVideo = document.querySelector('[data-intro-video]');
if (introVideo) {
  let startDeadline;
  let attempt = 0;
  function showWordmark() {
    attempt += 1;
    clearTimeout(startDeadline);
    introVideo.hidden = true;
    introVideo.pause();
  }
  function playIntro() {
    if (reducedMotion.matches) {
      showWordmark();
      return;
    }
    const playback = ++attempt;
    clearTimeout(startDeadline);
    if (!introVideo.hasAttribute('src') || introVideo.error) {
      introVideo.src = introVideo.dataset.src;
    } else {
      introVideo.currentTime = 0;
    }
    introVideo.hidden = false;
    introVideo.muted = true;
    startDeadline = setTimeout(showWordmark, 3000);
    introVideo.play().then(() => {
      if (playback === attempt) clearTimeout(startDeadline);
    }).catch(() => {
      if (playback === attempt) showWordmark();
    });
  }
  introVideo.addEventListener('ended', () => {
    if (introVideo.ended) showWordmark();
  });
  introVideo.addEventListener('error', showWordmark);
  reducedMotion.addEventListener('change', event => {
    if (event.matches) showWordmark();
  });
  const homeLink = document.querySelector('[data-home-link]');
  homeLink?.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (window.location.href !== homeLink.href) history.pushState(null, '', homeLink.href);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    playIntro();
  });
  if (window.location.hash === '#studio') showWordmark();
  else playIntro();
}

const studioStory = document.querySelector('[data-studio-story]');
if (studioStory) {
  const stage = studioStory.querySelector('.studio-mission-stage');
  const scenes = Array.from(studioStory.querySelectorAll('.studio-mission-scene'));
  const header = document.querySelector('.site-header');
  let active = 0;
  let frame = 0;
  let step = 0;
  let leaving;

  function updateStudioScene() {
    frame = 0;
    if (!studioStory.classList.contains('is-staged')) return;
    if (step <= 0) return;
    const passed = Math.max(0, header.offsetHeight - studioStory.getBoundingClientRect().top);
    const next = Math.min(scenes.length - 1, Math.floor(passed / step));
    if (next === active) return;
    leaving?.classList.remove('is-leaving');
    leaving = scenes[active];
    leaving.classList.replace('is-active', 'is-leaving');
    scenes[next].classList.add('is-active');
    studioStory.classList.toggle('is-closing', next === scenes.length - 1);
    active = next;
  }

  function syncStudioStage() {
    studioStory.classList.toggle('is-staged', !reducedMotion.matches);
    if (stage.offsetHeight > window.innerHeight - header.offsetHeight + 1) {
      studioStory.classList.remove('is-staged');
    }
    const closingExtra = Number(getComputedStyle(studioStory).getPropertyValue('--studio-closing-extra'));
    step = (studioStory.offsetHeight - stage.offsetHeight) / (scenes.length + closingExtra);
    updateStudioScene();
  }

  window.addEventListener('scroll', () => {
    if (!frame && studioStory.classList.contains('is-staged')) {
      frame = requestAnimationFrame(updateStudioScene);
    }
  }, { passive: true });
  window.addEventListener('resize', syncStudioStage);
  reducedMotion.addEventListener('change', syncStudioStage);
  document.fonts?.ready.then(syncStudioStage);
  syncStudioStage();
}

const filmGroup = document.querySelector('[data-logo-films]');
const productLinks = Array.from(document.querySelectorAll('[data-product-link]'));
if (productLinks.length) {
  function openLegacyProductLink() {
    const hash = window.location.hash;
    const link = hash === '#products' && filmGroup.classList.contains('home-products')
      ? document.querySelector('[data-products-link]')
      : productLinks.find(product => `#${product.id}` === hash);
    if (link) window.location.replace(link.href);
  }
  window.addEventListener('hashchange', openLegacyProductLink);
  openLegacyProductLink();
}

if (filmGroup && 'IntersectionObserver' in window) {
  const visible = new Set();
  let active = null;
  function centerDistance(film) {
    const rect = film.getBoundingClientRect();
    return Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2);
  }
  function syncPlayback() {
    const next = document.hidden || reducedMotion.matches
      ? null
      : [...visible].sort((a, b) => centerDistance(a) - centerDistance(b))[0] ?? null;
    if (active === next) return;
    active?.pause();
    active = next;
    if (!next) return;
    if (!next.hasAttribute('src')) next.src = next.dataset.logoFilm;
    next.play().catch(() => {
      if (active === next) keepPoster(next);
    });
  }
  function keepPoster(film) {
    observer.unobserve(film);
    visible.delete(film);
    film.classList.remove('is-visible');
    syncPlayback();
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(({target, intersectionRatio}) => {
      if (intersectionRatio >= .55) visible.add(target);
      else visible.delete(target);
    });
    syncPlayback();
  }, { threshold: .55 });
  const films = filmGroup.querySelectorAll('[data-logo-film]');
  if (films.length && !reducedMotion.matches) {
    const prepareFirstFilm = new IntersectionObserver(([entry], preloadObserver) => {
      if (!entry.isIntersecting) return;
      preloadObserver.disconnect();
      if (reducedMotion.matches || entry.target.hasAttribute('src')) return;
      entry.target.preload = 'auto';
      entry.target.src = entry.target.dataset.logoFilm;
    }, { rootMargin: '0px 0px 40% 0px' });
    prepareFirstFilm.observe(films[0]);
  }
  films.forEach(film => {
    film.muted = true;
    film.addEventListener('playing', () => film.classList.add('is-visible'));
    film.addEventListener('ended', () => keepPoster(film), { once: true });
    film.addEventListener('error', () => keepPoster(film), { once: true });
    observer.observe(film);
  });
  document.addEventListener('visibilitychange', syncPlayback);
  reducedMotion.addEventListener('change', syncPlayback);
}
