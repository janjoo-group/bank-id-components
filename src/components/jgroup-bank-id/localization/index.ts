import sweJson from './swe.json';
import engJson from './eng.json';

const translationSets = [sweJson, engJson];

const getTranslationSet = (locale: 'sv' | 'en' = 'sv'): any => {
  return (
    translationSets.find(
      (set) =>
        set.htmlLang === locale ||
        set.locale === locale ||
        navigator.language.includes(set.htmlLang) ||
        navigator.language.includes(set.locale),
    ) || engJson
  );
};

export function createTranslateFunction(language: 'sv' | 'en' = 'sv') {
  const translationSet = getTranslationSet(language);

  return function translate(...keys: string[]) {
    // not needed?
    // if (!translationSet) {
    //   return keys[0];
    // }

    for (const key of keys) {
      if (translationSet[key]) {
        return translationSet[key];
      }
    }

    return keys[0];
  };
}
