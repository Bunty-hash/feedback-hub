/** An anonymous id kept in this browser so one person's upvote counts once per question. */
export function voterId(): string {
  const key = 'fh_voter';
  try {
    const have = localStorage.getItem(key);
    if (have) return have;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return (window as unknown as { __fhVoter?: string }).__fhVoter ??= crypto.randomUUID();
  }
}
