import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '@/shared/api';
import { useDefaultDirectory } from '@/shared/hooks/useDefaultDirectory';
import { writeUserPreference } from '@/shared/userSettings';
import { Button, Input } from '@/shared/ui';
import SettingsCard from '@/modules/settings/SettingsCard';
import SettingsSection from '@/modules/settings/SettingsSection';

/** AppearanceSettingsTab owns the persisted folder-picker start location. */
export default function DefaultDirectorySetting() {
  const { t } = useTranslation('settings');
  const directory = useDefaultDirectory();
  // Keep edits local until validation and an explicit successful save.
  const [draft, setDraft] = useState(directory);
  // Prevent concurrent validation/saves and preserve edits after a failure.
  const [saving, setSaving] = useState(false);
  // Report server acknowledgement or an accessible validation error.
  const [status, setStatus] = useState('');
  useEffect(() => { setDraft(directory); }, [directory]);

  const save = async () => {
    if (saving) return;
    const value = draft.trim();
    if (value && (value.length > 4096 || !/^(?:\/|[a-z]:[\\/]|\\\\|~(?:[\\/]|$))/i.test(value))) {
      setStatus(t('defaultDirectory.invalid')); return;
    }
    setSaving(true); setStatus('');
    try {
      let resolvedPath = '';
      if (value) {
        const response = await api.browseFilesystem(value);
        const data = await response.json();
        if (!response.ok || typeof data.path !== 'string') throw new Error('Directory unavailable');
        resolvedPath = data.path;
      }
      const response = await api.user.savePreferences({ defaultDirectory: resolvedPath });
      if (!response.ok) throw new Error('Save failed');
      // Adopt only this acknowledged setting; do not rehydrate over other pending edits.
      writeUserPreference('defaultDirectory', resolvedPath, { persisted: true });
      setDraft(resolvedPath); setStatus(t('defaultDirectory.saved'));
    } catch {
      setStatus(t('defaultDirectory.failed'));
    } finally { setSaving(false); }
  };

  return <SettingsSection title={t('defaultDirectory.label')}>
    <SettingsCard><div className="space-y-3 p-4">
      <p className="text-sm text-muted-foreground">{t('defaultDirectory.description')}</p>
      <div className="flex flex-wrap gap-2">
        <Input aria-label={t('defaultDirectory.label')} value={draft} disabled={saving}
          placeholder={t('defaultDirectory.placeholder')} className="min-w-0 flex-1"
          onChange={(event) => { setDraft(event.target.value); setStatus(''); }} />
        <Button onClick={() => void save()} disabled={saving}>{t(saving ? 'defaultDirectory.saving' : 'defaultDirectory.save')}</Button>
      </div>
      {status && <p role="status" className="text-sm text-muted-foreground">{status}</p>}
    </div></SettingsCard>
  </SettingsSection>;
}
