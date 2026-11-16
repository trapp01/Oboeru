// Small DOM helpers for the lesson screens. Text always goes in through textContent.

/** Creates an element with an optional class name and text. */
export function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** Adds a load failure message and a button that reloads the page. */
export function showLoadError(screen, message, error) {
  console.error(error);
  const box = el('div', 'load-error');
  box.setAttribute('role', 'alert');
  const retry = el('button', 'button button-quiet', 'Try again');
  retry.type = 'button';
  retry.addEventListener('click', () => location.reload());
  box.append(el('p', '', message), retry);
  screen.append(box);
}
