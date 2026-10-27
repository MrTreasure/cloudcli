import { useTranslation } from 'react-i18next';

import { FILE_NAME_FONT_SIZE_OPTIONS, INTERFACE_FONT_SIZE_OPTIONS } from '@/shared/constants';
import { useUiPreferences, useSetUiPreference } from '@/shared/context/UiPreferencesContext';
import { useTheme } from '@/shared/context/ThemeContext';
import { useFontSizes } from '@/shared/hooks/useFontSizes';
import type { CodeEditorSettingsState, ProjectSortOrder, ThemeMode } from '@/shared/types';
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
  const preferences = useUiPreferences();
  const setPreference = useSetUiPreference();

  return (
    <div className="space-y-8">
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

      <SettingsSection title={t('appearanceSettings.keepProjectsExpanded.section', { defaultValue: 'Sidebar' })}>
        <SettingsCard>
          <SettingsRow
            label={t('appearanceSettings.keepProjectsExpanded.label', { defaultValue: 'Keep projects expanded' })}
            description={t('appearanceSettings.keepProjectsExpanded.description', { defaultValue: 'Open several projects together and remember them after reloading.' })}
          >
            <SettingsToggle
              checked={preferences.keepProjectsExpanded}
              onChange={(value) => setPreference('keepProjectsExpanded', value)}
              ariaLabel={t('appearanceSettings.keepProjectsExpanded.label', { defaultValue: 'Keep projects expanded' })}
            />
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
              <option value="10">10px</option>
              <option value="11">11px</option>
              <option value="12">12px</option>
              <option value="13">13px</option>
              <option value="14">14px</option>
              <option value="15">15px</option>
              <option value="16">16px</option>
              <option value="18">18px</option>
              <option value="20">20px</option>
            </select>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>
    </div>
  );
}
