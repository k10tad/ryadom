(() => {
  const splash = document.querySelector('#ryadom-splash');
  const copy = document.querySelector('#ryadom-splash-copy');
  const copyLine = splash?.querySelector('.ryadom-splash-copy');
  const skip = document.querySelector('#ryadom-splash-skip');
  if (!splash || !copy || !copyLine || !skip) {
    document.body.classList.remove('splash-active');
    return;
  }

  const phrase = 'Иди ко мне';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timers = new Set();
  let typingTimer = 0;
  let closing = false;

  const later = (callback, delay) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delay);
    timers.add(timer);
    return timer;
  };

  const finish = () => {
    if (closing) return;
    closing = true;
    timers.forEach(timer => window.clearTimeout(timer));
    timers.clear();
    if (typingTimer) window.clearInterval(typingTimer);
    copyLine.classList.remove('is-typing');
    splash.classList.add('is-leaving');
    document.body.classList.remove('splash-active');
    later(() => {
      splash.remove();
      document.dispatchEvent(new CustomEvent('ryadom:splash-finished'));
    }, 760);
  };

  const typePhrase = () => {
    let index = 0;
    copy.textContent = '';
    copyLine.classList.add('is-typing');
    typingTimer = window.setInterval(() => {
      index += 1;
      copy.textContent = phrase.slice(0, index);
      if (index >= phrase.length) {
        window.clearInterval(typingTimer);
        typingTimer = 0;
        later(() => copyLine.classList.remove('is-typing'), 360);
      }
    }, 115);
  };

  skip.addEventListener('click', finish);

  if (reducedMotion) {
    copy.textContent = phrase;
    later(finish, 1400);
    return;
  }

  later(typePhrase, 1850);
  later(finish, 5000);
})();
