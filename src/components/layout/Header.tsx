import { useTranslation } from 'react-i18next';
import { LanguageToggle } from './LanguageToggle';
import { IntensityToggle } from './IntensityToggle';
import { VizSwitcher } from '@/components/controls/VizSwitcher';
import { useVizStore } from '@/store/vizStore';

export function Header() {
  const { t } = useTranslation();
  const togglePanel = useVizStore((s) => s.togglePanel);
  const lines = t('brand.name').split('\n');
  return (
    <header className="pointer-events-none absolute top-0 left-0 right-0 z-20 flex items-start justify-between p-8 md:p-10">
      <div className="pointer-events-auto">
        <h1 className="title-xl leading-[0.95] whitespace-pre-line">
          {lines.map((line, i) => (
            <span key={i} className="block">{line}</span>
          ))}
        </h1>
        <p className="label mt-3">{t('brand.tagline')}</p>
      </div>

      <div className="flex flex-col items-end gap-4">
        <div className="pointer-events-auto flex items-center gap-5">
          <IntensityToggle />
          <span className="text-dim/60 text-xs">|</span>
          <button
            type="button"
            onClick={togglePanel}
            className="text-dim hover:text-bone transition-colors text-base"
            title="Parameters (P)"
            aria-label="Open parameters"
          >
            ⚙
          </button>
          <LanguageToggle />
        </div>
        <VizSwitcher />
      </div>
    </header>
  );
}
