/** Native test controls only. Never call Surface or request a redraw here. */
export function bindSurfaceDomControls(root: HTMLElement) {
  const host = root.querySelector<HTMLElement>('.button-host')!;
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  function change(event: Event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.dataset.dom) return;
    const action = input.dataset.dom;
    const value = input.value;
    const checked = input.checked;
    clearTimeout(timers.get(action));
    const apply = () => {
      timers.delete(action);
      switch (action) {
        case 'width':
          host.style.setProperty('--button-width', `${value}%`);
          break;
        case 'height':
          host.style.setProperty('--button-height', `${value}px`);
          break;
        case 'hidden':
          host.hidden = checked;
          break;
        default:
          host.classList.toggle(action, checked);
      }
    };
    if (root.querySelector<HTMLInputElement>('#delay-dom')!.checked) {
      timers.set(action, setTimeout(apply, 1000));
    } else apply();
  }
  root.addEventListener('input', change);
  return () => {
    root.removeEventListener('input', change);
    timers.forEach(clearTimeout);
  };
}
