import { validateInviteCode, normalizeSubject, isValidRole } from '../index';

const validCode: string = 'ABC123';
const invalidCode: string = 'ABC';
const validSubject: string = 'Биология';
const validRole: string = 'owner';
const invalidRole: string = 'invalid';

describe('Utils Functions Unit Tests', () => {
  it('validates invite code correctly (valid)', () => {
    const result = validateInviteCode(validCode);
    expect(result.isValid).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it('rejects invalid invite code (short length)', () => {
    const result = validateInviteCode(invalidCode);
    expect(result.isValid).toBe(false);
    expect(result.message).toEqual(expect.stringContaining('Короткий'));
  });

  it('normalizes subject name', () => {
    const normalized = normalizeSubject(validSubject);
    expect(normalized).toBe('биология');
  });

  it('checks valid role', () => {
    expect(isValidRole(validRole)).toBe(true);
  });

  it('rejects invalid role', () => {
    expect(isValidRole(invalidRole)).toBe(false);
  });

  it('handles empty input for code validation', () => {
    const result = validateInviteCode('');
    expect(result.isValid).toBe(false);
    expect(result.message).toEqual(expect.stringContaining('Пустой'));
  });
});