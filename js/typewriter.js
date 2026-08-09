let activeRun = 0;

function pauseFor(character) {
  if ('。！？'.includes(character)) return 380;
  if ('、…'.includes(character)) return 180;
  return 34;
}

export async function typeLine(element, text, container = element.parentElement) {
  const run = ++activeRun;
  element.textContent = '';
  container?.classList.add('is-typing');
  for (const character of String(text)) {
    if (run !== activeRun) return;
    element.textContent += character;
    await new Promise(resolve => setTimeout(resolve, pauseFor(character)));
  }
  if (run === activeRun) container?.classList.remove('is-typing');
}

export function stopTyping() { activeRun += 1; }

