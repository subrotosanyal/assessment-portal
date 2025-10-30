// Client-side best-effort anti-copy utilities.
// NOTE: These are purely client-side mitigations and can be bypassed by determined users
// (developer tools, disabling JS, taking photos/screenshots, etc.). See README notes.

export function initAntiCopy() {
  if (typeof window === 'undefined' || !document) return;

  const prevent = (e: Event) => {
    try { e.preventDefault(); } catch (err) {}
    return false;
  };

  // Common events to block
  document.addEventListener('contextmenu', prevent);
  document.addEventListener('copy', prevent);
  document.addEventListener('cut', prevent);
  document.addEventListener('paste', prevent);
  document.addEventListener('selectstart', prevent);
  document.addEventListener('dragstart', prevent);

  // Block common keyboard shortcuts that copy/export or open devtools
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const key = e.key;
    const ctrlOrCmd = e.ctrlKey || e.metaKey;

    // Block copy/save/print shortcuts
    if (ctrlOrCmd && (key === 'c' || key === 's' || key === 'p' || key === 'u')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Block common devtools shortcuts: F12, Ctrl+Shift+I/J/C or Cmd+Opt+I on mac
    if (key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    if (ctrlOrCmd && e.shiftKey && (key === 'I' || key === 'J' || key === 'C' || key === 'i' || key === 'j' || key === 'c')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Attempt to intercept PrintScreen key
    if (key === 'PrintScreen') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);

  // Make sure inputs and textareas remain usable (allow selection and clipboard there)
  const enableInputs = () => {
    const inputs = Array.from(document.querySelectorAll('input, textarea')) as HTMLElement[];
    inputs.forEach(el => {
      el.style.userSelect = 'text';
      el.style.webkitUserSelect = 'text';
      el.style.pointerEvents = 'auto';
    });
  };

  // Re-enable when DOM changes (e.g., route changes)
  const mo = new MutationObserver(enableInputs);
  mo.observe(document.body, { childList: true, subtree: true });

  // Initial run
  enableInputs();
}

export default initAntiCopy;
