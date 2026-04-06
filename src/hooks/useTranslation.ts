import { useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';
import { translations, type Language } from '../i18n/translations';

export function useTranslation() {
  const { language } = useSettings();
  
  // 支持属性路径访问及参数替换：t('profile.roll.viewFrames', { count: 5 })
  const t = useCallback((key: string, params?: Record<string, any>): string => {
    const keys = key.split('.');
    let result: any = translations[language as Language] || translations['zh-CN'];
    
    for (const k of keys) {
      if (result && result[k]) {
        result = result[k];
      } else {
        // 退回到中文
        let fallback: any = translations['zh-CN'];
        for (const fk of keys) {
            if(fallback && fallback[fk]) fallback = fallback[fk];
            else {
              result = key;
              break;
            }
        }
        result = typeof fallback === 'string' ? fallback : key;
        break;
      }
    }
    
    let text = typeof result === 'string' ? result : key;
    
    // 替换参数 {count}
    if (params) {
      Object.keys(params).forEach(p => {
        text = text.replace(`{${p}}`, String(params[p]));
      });
    }
    
    return text;
  }, [language]);

  return { t, language };
}
