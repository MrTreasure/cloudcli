import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { FILE_NAME_FONT_SIZE_OPTIONS, INTERFACE_FONT_SIZE_OPTIONS } from '@/shared/constants';
import { useTheme } from '@/shared/context/ThemeContext';
import { useFontSizes } from '@/shared/hooks/useFontSizes';
import { useBranding } from '@/shared/hooks/useBranding';
import type { CodeEditorSettingsState, ProjectSortOrder, ThemeMode } from '@/shared/types';
import { LocalizedText } from '@/shared/ui/LocalizedText';
import { LanguageSelector } from '@/modules/i18n';
import SettingsCard from '@/modules/settings/SettingsCard';
import SettingsRow from '@/modules/settings/SettingsRow';
import SettingsSection from '@/modules/settings/SettingsSection';
import SettingsToggle from '@/modules/settings/SettingsToggle';

type AppearanceSettingsTabProps = {
  projectSortOrder: ProjectSortOrder;
  onProjectSortOrderChange: (value: ProjectSortOrder) => void;
  codeEditorSettings: CodeEditorSettingsState;
  onCodeEditorWordWrapChange: (value: boolean) => void;
  onCodeEditorShowMinimapChange: (value: boolean) => void;
  onCodeEditorLineNumbersChange: (value: boolean) => void;
  onCodeEditorFontSizeChange: (value: string) => void;
};

async function resizeBrandImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error('image');
  }
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas');
    const scale = Math.min(size / image.width, size / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(source);
  }
}

/** Rendered by Settings for the "appearance" tab, covering theme, project sorting and code editor preferences. */
export default function AppearanceSettingsTab({
  projectSortOrder,
  onProjectSortOrderChange,
  codeEditorSettings,
  onCodeEditorWordWrapChange,
  onCodeEditorShowMinimapChange,
  onCodeEditorLineNumbersChange,
  onCodeEditorFontSizeChange,
}: AppearanceSettingsTabProps) {
  const { t } = useTranslation('settings');
  const { themeMode, setThemeMode } = useTheme();
  const { interfaceFontSize, fileNameFontSize, setFontSize } = useFontSizes();
  const { title, logo, avatar, updateBranding } = useBranding();
  // Shows a validation message only when a selected image cannot be stored.
  const [brandImageError, setBrandImageError] = useState<string | null>(null);

  const handleBrandImage = async (event: ChangeEvent<HTMLInputElement>, key: 'logo' | 'avatar') => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      updateBranding({ [key]: await resizeBrandImage(file) });
      setBrandImageError(null);
    } catch {
      setBrandImageError(t('appearanceSettings.branding.invalidImage'));
    }
  };

  return (
    <div className="space-y-8">
      <SettingsSection title={t('appearanceSettings.branding.title')}>
        <SettingsCard divided>
          <SettingsRow label={t('appearanceSettings.branding.siteTitle')}>
            <input
              type="text"
              value={title}
              maxLength={60}
              onChange={(event) => updateBranding({ title: event.target.value })}
              aria-label={t('appearanceSettings.branding.siteTitle')}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground sm:w-56"
            />
          </SettingsRow>
          {(['logo', 'avatar'] as const).map((key) => (
            <SettingsRow key={key} label={t(`appearanceSettings.branding.${key}`)}>
              <div className="flex items-center gap-3">
                {key === 'logo' || avatar
                  ? <img src={key === 'logo' ? logo : avatar || ''} alt="" className="h-10 w-10 rounded-lg object-contain" />
                  : <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-white">U</span>}
                <label className="cursor-pointer rounded-lg border border-input px-3 py-2 text-sm text-foreground">
                  {t('appearanceSettings.branding.upload')}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { void handleBrandImage(event, key); }} />
                </label>
                <button type="button" className="text-sm text-muted-foreground underline" onClick={() => updateBranding({ [key]: key === 'logo' ? '' : null })}>
                  {t('appearanceSettings.branding.reset')}
                </button>
              </div>
            </SettingsRow>
          ))}
          {brandImageError && <p role="alert" className="px-4 pb-3 text-sm text-destructive">{brandImageError}</p>}
        </SettingsCard>
      </SettingsSection>
      <SettingsSection title={t('appearanceSettings.theme.label')}>
        <SettingsCard>
          <SettingsRow
            label={t('appearanceSettings.theme.label')}
            description={t('appearanceSettings.theme.description')}
          >
            <select
              value={themeMode}
              onChange={(event) => setThemeMode(event.target.value as ThemeMode)}
              aria-label={t('appearanceSettings.theme.label')}
              className="w-full touch-manipulation rounded-lg border border-input bg-card p-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary sm:w-36"
            >
              <option value="light">{t('appearanceSettings.theme.light')}</option>
              <option value="dark">{t('appearanceSettings.theme.dark')}</option>
              <option value="system">{t('appearanceSettings.theme.system')}</option>
            </select>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title={t('mainTabs.appearance')}>
        <SettingsCard divided>
          <LanguageSelector />
          <SettingsRow
            label={t('appearanceSettings.interfaceFontSize.label', 'Interface font size')}
            description={t('appearanceSettings.interfaceFontSize.description', 'Adjust interface text size; code and file name sizes are set separately.')}
          >
            <select
              aria-label={t('appearanceSettings.interfaceFontSize.label', 'Interface font size')}
              value={interfaceFontSize}
              onChange={(event) => setFontSize('interfaceFontSize', Number(event.target.value))}
              className="w-full touch-manipulation rounded-lg border border-input bg-card p-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary sm:w-28"
            >
              {INTERFACE_FONT_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}px</option>)}
            </select>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title={t('appearanceSettings.projectSorting.label')}>
        <SettingsCard>
          <SettingsRow
            label={t('appearanceSettings.projectSorting.label')}
            description={t('appearanceSettings.projectSorting.description')}
          >
            <select
              value={projectSortOrder}
              onChange={(event) => onProjectSortOrderChange(event.target.value as ProjectSortOrder)}
              className="w-full touch-manipulation rounded-lg border border-input bg-card p-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary sm:w-36"
            >
              <option value="name">{t('appearanceSettings.projectSorting.alphabetical')}</option>
              <option value="date">{t('appearanceSettings.projectSorting.recentActivity')}</option>
            </select>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title={t('appearanceSettings.codeEditor.title')}>
        <SettingsCard divided>
          <SettingsRow
            label={t('appearanceSettings.codeEditor.fileNameFontSize.label', 'File name font size')}
            description={t('appearanceSettings.codeEditor.fileNameFontSize.description', 'Adjust file and folder names in the file panel and editor titles.')}
          >
            <select
              aria-label={t('appearanceSettings.codeEditor.fileNameFontSize.label', 'File name font size')}
              value={fileNameFontSize}
              onChange={(event) => setFontSize('fileNameFontSize', Number(event.target.value))}
              className="w-full touch-manipulation rounded-lg border border-input bg-card p-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary sm:w-28"
            >
              {FILE_NAME_FONT_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}px</option>)}
            </select>
          </SettingsRow>
          <SettingsRow
            label={t('appearanceSettings.codeEditor.wordWrap.label')}
            description={t('appearanceSettings.codeEditor.wordWrap.description')}
          >
            <SettingsToggle
              checked={codeEditorSettings.wordWrap}
              onChange={onCodeEditorWordWrapChange}
              ariaLabel={t('appearanceSettings.codeEditor.wordWrap.label')}
            />
          </SettingsRow>

          <SettingsRow
            label={t('appearanceSettings.codeEditor.showMinimap.label')}
            description={t('appearanceSettings.codeEditor.showMinimap.description')}
          >
            <SettingsToggle
              checked={codeEditorSettings.showMinimap}
              onChange={onCodeEditorShowMinimapChange}
              ariaLabel={t('appearanceSettings.codeEditor.showMinimap.label')}
            />
          </SettingsRow>

          <SettingsRow
            label={t('appearanceSettings.codeEditor.lineNumbers.label')}
            description={t('appearanceSettings.codeEditor.lineNumbers.description')}
          >
            <SettingsToggle
              checked={codeEditorSettings.lineNumbers}
              onChange={onCodeEditorLineNumbersChange}
              ariaLabel={t('appearanceSettings.codeEditor.lineNumbers.label')}
            />
          </SettingsRow>

          <SettingsRow
            label={t('appearanceSettings.codeEditor.fontSize.label')}
            description={t('appearanceSettings.codeEditor.fontSize.description')}
          >
            <select
              value={codeEditorSettings.fontSize}
              onChange={(event) => onCodeEditorFontSizeChange(event.target.value)}
              className="w-full touch-manipulation rounded-lg border border-input bg-card p-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary sm:w-28"
            >
              <option value="10"><LocalizedText text={"10px"} /></option>
              <option value="11"><LocalizedText text={"11px"} /></option>
              <option value="12"><LocalizedText text={"12px"} /></option>
              <option value="13"><LocalizedText text={"13px"} /></option>
              <option value="14"><LocalizedText text={"14px"} /></option>
              <option value="15"><LocalizedText text={"15px"} /></option>
              <option value="16"><LocalizedText text={"16px"} /></option>
              <option value="18"><LocalizedText text={"18px"} /></option>
              <option value="20"><LocalizedText text={"20px"} /></option>
            </select>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>
    </div>
  );
}
