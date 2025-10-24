export const validateInviteCode = (code: string): { isValid: boolean; message?: string } => {
  if (!code) return { isValid: false, message: 'Пустой код' };
  if (code.length < 6) return { isValid: false, message: 'Короткий код' };
  return { isValid: true };
};

export const normalizeSubject = (subject: string): string => subject.trim().toLowerCase();

export type Role = 'owner' | 'member' | 'admin' | 'guest'; // Union for known roles (use for typing props/vars, not param)

const validRoles: Role[] = ['owner', 'member', 'admin', 'guest']; // Array of known roles

export const isValidRole = (role: string): boolean => validRoles.includes(role as Role); // Param string (accepts any), cast inside for includes (if needed, but since Role[] = string[], no cast required; remove if error)