let configuredName = '';

export function setConfiguredName(name = '') {
  configuredName = String(name).trim();
}

export function getConfiguredName() {
  return configuredName;
}

export function personalizeText(value = '') {
  const name = configuredName || '君';
  return String(value).replace(/\{\{\s*user\s*\}\}/g, name);
}

export function personalizeElement(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const next = personalizeText(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  });
}
