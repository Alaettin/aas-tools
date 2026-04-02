export { de } from './de';
export { en } from './en';

export type Locale = 'de' | 'en';
export type TranslationKey = keyof typeof import('./de').de;
