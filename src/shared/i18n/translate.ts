import { translations, type Language } from './translations';

export interface TranslationDescriptor {
  key: string;
  values: Record<string, string | number | null | undefined | TranslationDescriptor>;
}
export type TranslationMessage = string | TranslationDescriptor;

// Store the key and data separately so changing language does not freeze a toast
// or validation message in the language used when the action completed.
export const message = (key: string, values: TranslationDescriptor['values'] = {}): TranslationDescriptor => ({ key, values });

// Notifications and validation state can contain text resolved before a language change.
// Only known dictionary messages are aliases; user data and server text stay untouched.
const aliases: Record<Language, Map<string, string>> = { en: new Map(), vi: new Map() };
for (const [source, target] of [['vi', 'en'], ['en', 'vi']] as const) {
  const targetDictionary: Record<string, string> = translations[target];
  for (const [key, value] of Object.entries(translations[source])) {
    const targetText = targetDictionary[key] ?? (
      target === 'en' && /[a-z]/i.test(key) && !/[À-ỹ]/u.test(key) && !/^[a-z]+\.[\w.]+$/.test(key)
        ? key
        : target === 'vi' && /[À-ỹ]/u.test(key) ? key : undefined
    );
    if (targetText && !aliases[target].has(value)) aliases[target].set(value, targetText);
  }
}

export function translateMessage(input: TranslationMessage, language: Language, fallback?: string): string {
  const key = typeof input === 'string' ? input : input.key;
  const dictionary: Record<string, string> = translations[language];
  const text = Object.hasOwn(dictionary, key) ? dictionary[key] : aliases[language].get(key) ?? fallback ?? key;
  if (typeof input === 'string') return text;
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    if (!Object.hasOwn(input.values, name)) return placeholder;
    const value = input.values[name];
    return value != null && typeof value === 'object'
      ? translateMessage(value, language)
      : String(value ?? '—');
  });
}
