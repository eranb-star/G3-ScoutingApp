const key = 'g3_event_id';
const changed = 'g3-active-event-changed';

export function setActiveEvent(id: string) {
  localStorage.setItem(key, id);
  window.dispatchEvent(new Event(changed));
}

export function subscribeActiveEvent(refresh: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === key || event.key === null) refresh(); };
  window.addEventListener(changed, refresh);
  window.addEventListener('storage', storage);
  window.addEventListener('focus', refresh);
  return () => {
    window.removeEventListener(changed, refresh);
    window.removeEventListener('storage', storage);
    window.removeEventListener('focus', refresh);
  };
}
