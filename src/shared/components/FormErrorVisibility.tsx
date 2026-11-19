import { useEffect } from 'react';

const errors = '.form-error-banner, .field-error, .mu-field-error, .error-message, [role="alert"], [data-form-error]';

function isVisible(element: Element, document: Document) {
  if (!element.textContent?.trim() || element.closest('[hidden], [inert], [aria-hidden="true"], .ui-delete-error-toast')) return false;
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (node.tagName === 'DIALOG' && !node.hasAttribute('open')) return false;
    const style = document.defaultView?.getComputedStyle(node);
    if (style?.display === 'none' || style?.visibility === 'hidden') return false;
  }
  return true;
}

/** Reveal validation/API errors after a save, including repeated identical failures. */
export function installFormErrorVisibility(document: Document) {
  let scope: Element | Document | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    if (!scope) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!scope?.isConnected) return;
      const error = Array.from(scope.querySelectorAll<HTMLElement>(errors)).find(node => isVisible(node, document));
      if (!error) return; // An asynchronous save may report its error later.
      scope = null;
      if (!error.hasAttribute('tabindex')) error.tabIndex = -1;
      error.focus({ preventScroll: true });
      error.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }, 0);
  };
  const arm = () => {
    const dialogs = Array.from(document.querySelectorAll('dialog[open], [role="dialog"]'))
      .filter(node => isVisible(node, document));
    scope = dialogs.at(-1) || document;
    schedule();
  };
  const click = (event: Event) => {
    const target = event.target as Element | null;
    const button = target?.closest('button, input[type="submit"]') as HTMLButtonElement | null;
    if (button && !button.disabled && ((button.type === 'submit' && button.closest('form')) || button.matches('.ui-button--primary, .primary-button, .btn-primary, .btn-auth-submit'))) arm();
    else { scope = null; clearTimeout(timer); }
  };
  const stop = () => { scope = null; clearTimeout(timer); };
  const observer = new document.defaultView!.MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'aria-hidden', 'class'] });
  document.addEventListener('click', click, true);
  document.addEventListener('submit', arm, true);
  document.addEventListener('invalid', arm, true);
  document.addEventListener('input', stop, true);
  return () => {
    stop();
    observer.disconnect();
    document.removeEventListener('click', click, true);
    document.removeEventListener('submit', arm, true);
    document.removeEventListener('invalid', arm, true);
    document.removeEventListener('input', stop, true);
  };
}

export function FormErrorVisibility() {
  useEffect(() => installFormErrorVisibility(document), []);
  return null;
}
