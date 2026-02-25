export function formatUserName(user: any): string {
  if (!user) return "Пользователь";
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "Пользователь";
}

export function formatUserBasic(user: any): { name: string; avatar: string | null } | null {
  if (!user) return null;
  return {
    name: formatUserName(user),
    avatar: user.avatar || null
  };
}
