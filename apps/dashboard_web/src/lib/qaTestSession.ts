export const QA_AUTH_KEY = 'g3-qa-auth';
export const QA_META_KEY = 'g3-qa-test';
export type QaTestSession = { id: string; targetId: string; displayName: string; role: string; expiresAt: string };
export function getQaTestSession(): QaTestSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(QA_META_KEY) || 'null');
    return value && typeof value.id === 'string' && typeof value.targetId === 'string' && Number.isFinite(Date.parse(value.expiresAt)) ? value : null;
  } catch { return null; }
}
