import { useHVACStore } from '../store/useHVACStore';
import { ZH } from './zh';

/* ============================================================================
   Translation helper
   ----------------------------------------------------------------------------
   The site was written in English + Taglish pairs. `tr(english, taglish)`
   returns the text for the current language:
     en      → english
     taglish → taglish
     zh      → Simplified Chinese from ZH (keyed by the English text),
               or the optional `zh` argument (used for text with ${values}),
               falling back to English if no translation exists yet.

   It reads the language from the store at render time; components already
   subscribe to `language`, so they re-render when it changes.
   To translate new text, add the English string and its Chinese to ./zh.ts.
   ============================================================================ */

export function tr(en: string | undefined, tl?: string, zh?: string): string {
  const e = en ?? '';
  const lang = useHVACStore.getState().language;
  if (lang === 'en') return e;
  if (lang === 'zh') return zh ?? ZH[e] ?? e;
  return tl ?? e;
}

/** True when the visitor is reading Chinese. */
export function isZh() {
  return useHVACStore.getState().language === 'zh';
}

/** BCP-47 tag for <html lang> */
export function htmlLang(lang: string) {
  return lang === 'en' ? 'en' : lang === 'zh' ? 'zh-Hans' : 'tl';
}
