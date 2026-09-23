import sweJson from "./swe.json";
import engJson from "./eng.json";
const translationSets = [sweJson, engJson];
// `locale` is always an explicit, caller-provided value (the component's
// own `language` prop, typed and defaulted to 'sv') - it must win outright.
// A prior version of this also matched against navigator.language as a
// fallback, but since that check ran unconditionally alongside the direct
// match rather than only when no explicit locale was available, it could
// silently override an explicitly-requested language whenever the
// visitor's browser locale happened to match a *different* set earlier in
// `translationSets` (sv is checked before en) - e.g. language="en" would
// still resolve to the Swedish set for a visitor with a Swedish browser.
const getTranslationSet = (locale) => {
    var _a;
    return (_a = translationSets.find((set) => set.htmlLang === locale || set.locale === locale)) !== null && _a !== void 0 ? _a : engJson;
};
export function createTranslateFunction(language = 'sv') {
    const translationSet = getTranslationSet(language);
    return function translate(...keys) {
        for (const key of keys) {
            const value = translationSet[key];
            if (value !== undefined && value.length > 0) {
                return value;
            }
        }
        return keys[0];
    };
}
//# sourceMappingURL=index.js.map
