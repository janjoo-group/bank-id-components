import { createTranslateFunction } from './index';

describe('createTranslateFunction', () => {
  it('honors the explicit locale regardless of the visitor\'s browser language', () => {
    // Regression test: a previous version of getTranslationSet() also
    // matched against navigator.language as a fallback, checked
    // unconditionally alongside the direct locale match rather than only
    // when no explicit locale was given. Since sweJson was checked before
    // engJson, an explicit language: 'en' would silently resolve to
    // Swedish text whenever the visitor's browser locale happened to
    // start with 'sv'.
    Object.defineProperty(window.navigator, 'language', {
      value: 'sv-SE',
      configurable: true,
    });

    const translate = createTranslateFunction('en');

    expect(translate('cancel')).toBe('Cancel');
  });

  it('resolves Swedish when explicitly requested', () => {
    const translate = createTranslateFunction('sv');

    expect(translate('cancel')).toBe('Avbryt');
  });

  it('returns the first matching key among fallbacks, or the key itself if none match', () => {
    const translate = createTranslateFunction('en');

    expect(translate('not-a-real-key', 'cancel')).toBe('Cancel');
    expect(translate('still-not-a-real-key')).toBe('still-not-a-real-key');
  });
});
