import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/store/uiStore';
import clsx from 'clsx';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const lang = useUIStore((s) => s.lang);
  const setLang = useUIStore((s) => s.setLang);

  const choose = (l: 'zh' | 'en') => {
    setLang(l);
    i18n.changeLanguage(l);
  };

  return (
    <div className="flex items-center gap-1 text-xs tracking-wider no-select">
      <button
        type="button"
        onClick={() => choose('zh')}
        className={clsx(
          'px-1 transition-colors',
          lang === 'zh' ? 'text-bone' : 'text-dim hover:text-bone/70',
        )}
      >
        中
      </button>
      <span className="text-dim">/</span>
      <button
        type="button"
        onClick={() => choose('en')}
        className={clsx(
          'px-1 transition-colors',
          lang === 'en' ? 'text-bone' : 'text-dim hover:text-bone/70',
        )}
      >
        EN
      </button>
    </div>
  );
}
