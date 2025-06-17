export function getViewerId() {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('viewerId');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('viewerId', id);
  }
  return id;
} 