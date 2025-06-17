// Returns a consistent color for a username
export function getAvatarColor(username: string) {
  // Hash the username to a color
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `hsl(${hash % 360}, 60%, 45%)`;
  return color;
}

export function getInitials(username: string) {
  return username
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
} 