import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { descriptionPreview } from '@/shared/utils';
import { ENABLED_AGENT_PROVIDERS } from '@/shared/constants';
import { readSelectedProvider } from '@/shared/selectedProvider';
import { useProjectSlashCommands } from '@/shared/hooks/useProjectSlashCommands';
import { useCommandVisibility } from '@/shared/hooks/useCommandVisibility';
import type { AgentSettingsProject, LLMProvider, Project } from '@/shared/types';
import { Button, Input } from '@/shared/ui';
import SettingsSection from '@/modules/settings/SettingsSection';
import SettingsCard from '@/modules/settings/SettingsCard';
import SettingsRow from '@/modules/settings/SettingsRow';
import SettingsToggle from '@/modules/settings/SettingsToggle';

/** Rendered by Settings to configure which provider commands appear in the composer menu. */
export default function CommandsSettingsTab({ projects }: { projects: AgentSettingsProject[] }) {
  const { t } = useTranslation('settings');
  // Browsing another provider's catalogue must not change the active chat provider.
  const [provider, setProvider] = useState<LLMProvider>(readSelectedProvider);
  // Chooses the workspace whose skills and custom commands are being managed.
  const [projectName, setProjectName] = useState(projects[0]?.name || '');
  // Narrows the loaded catalogue without refetching while the user types.
  const [query, setQuery] = useState('');
  const project = useMemo<Project | null>(() => {
    const source = projects.find((item) => item.name === projectName) || projects[0];
    return source ? { projectId: source.name, displayName: source.displayName || source.name, fullPath: source.fullPath || source.path || '' } : null;
  }, [projects, projectName]);
  const { commands, isLoading, error, refresh } = useProjectSlashCommands(project, provider);
  const { hiddenCommands, setCommandsVisible } = useCommandVisibility(provider);
  const catalogue = useMemo(() => [...new Map(commands.map((command) => [command.name, command])).values()], [commands]);
  const filtered = catalogue.filter((command) => `${command.name} ${command.description || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const visibleCount = catalogue.filter((command) => !hiddenCommands.has(command.name)).length;

  return <SettingsSection title={t('commandVisibility.title')} description={t('commandVisibility.description')}>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1.5 text-sm text-muted-foreground">
        <span>{t('commandVisibility.provider')}</span>
        <select value={provider} onChange={(event) => setProvider(event.target.value as LLMProvider)} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-foreground">
          {ENABLED_AGENT_PROVIDERS.map((value) => <option key={value} value={value}>{value === 'codex' ? 'Codex' : 'Claude'}</option>)}
        </select>
      </label>
      <label className="space-y-1.5 text-sm text-muted-foreground">
        <span>{t('commandVisibility.project')}</span>
        <select value={project?.projectId || ''} onChange={(event) => setProjectName(event.target.value)} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-foreground">
          {projects.map((item) => <option key={item.name} value={item.name}>{item.displayName || item.name}</option>)}
        </select>
      </label>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{t('commandVisibility.count', { visible: visibleCount, total: catalogue.length })}</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={!catalogue.length} onClick={() => setCommandsVisible(catalogue.map((command) => command.name), true)}>{t('commandVisibility.showAll')}</Button>
        <Button type="button" variant="outline" size="sm" disabled={!catalogue.length} onClick={() => setCommandsVisible(catalogue.map((command) => command.name), false)}>{t('commandVisibility.hideAll')}</Button>
      </div>
    </div>
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('commandVisibility.search')} aria-label={t('commandVisibility.search')} className="pl-9" />
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{t('commandVisibility.error')} <button type="button" onClick={refresh} className="underline">{t('commandVisibility.retry')}</button></p>}
    {isLoading && <p role="status" className="text-sm text-muted-foreground">{t('commandVisibility.loading')}</p>}
    {!isLoading && !error && filtered.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t('commandVisibility.empty')}</p>}
    <SettingsCard divided>
      {filtered.map((command) => <SettingsRow key={command.name} label={command.name} description={descriptionPreview(command.description)}>
        <SettingsToggle checked={!hiddenCommands.has(command.name)} onChange={(visible) => setCommandsVisible([command.name], visible)} ariaLabel={command.name} />
      </SettingsRow>)}
    </SettingsCard>
    <p className="text-xs text-muted-foreground">{t('commandVisibility.saved')}</p>
  </SettingsSection>;
}
