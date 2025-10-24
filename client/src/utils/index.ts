export const validateInviteCode = (code: string): { isValid: boolean; message?: string } => {
  if (!code) return { isValid: false, message: 'Пустой код' };
  if (code.length < 6) return { isValid: false, message: 'Короткий код' };
  return { isValid: true };
};

export const normalizeSubject = (subject: string): string => subject.trim().toLowerCase();

export type Role = 'owner' | 'member' | 'admin' | 'guest';

const validRoles: Role[] = ['owner', 'member', 'admin', 'guest'];

export const isValidRole = (role: string): boolean => validRoles.includes(role as Role);