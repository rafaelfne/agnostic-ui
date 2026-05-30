import { z } from 'zod';

export const MOCK_PROFILES = ['happyPath', 'empty', 'error', 'slow'] as const;

export const MockProfileSchema = z.enum(MOCK_PROFILES);
export type MockProfile = z.infer<typeof MockProfileSchema>;

export const DEFAULT_MOCK_PROFILE: MockProfile = 'happyPath';
