// Anonymous id linking one visit's rows in Supabase. No cookie, no storage:
// a new page load is a new session on purpose. The fallback covers browsers
// without crypto.randomUUID, which is most of the reason this is not inline.
export function newSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.floor(Math.random() * 16);
      const v = c === 'x' ? r : (r % 4) + 8;
      return v.toString(16);
    });
  }
}
