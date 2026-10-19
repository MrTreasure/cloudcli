import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Scissors, Eraser, Loader2 } from 'lucide-react';

import { api, readApiJson } from '@/shared/api';
import { Button, Input } from '@/shared/ui';

type ContextData = {
  policy: { recentImages: number; imageBytes: number; pinnedImageIds: string[] };
  images: Array<{ id: string; bytes: number; timestamp: string }>;
  activeImageIds: string[];
  metrics: {
    historicalImageCount: number; historicalImageBytes: number;
    retainedImageCount: number; retainedImageBytes: number;
    currentImageCount: number; currentImageBytes: number;
    switches: number; compactions: number; budgetExceeded: boolean;
    requests: number; requestBytesBefore: number; requestBytesAfter: number;
    jsonBytesBefore: number; jsonBytesAfter: number; savedBytes: number; uploadedBytes: number;
    prunedImageCount: number;
  };
};
const size = (bytes: number) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(2)} MiB` : `${(bytes / 1024).toFixed(1)} KiB`;

/** Used by the chat token modal to manage Codex image retention and invoke native context controls. */
export function CodexContextPanel({ sessionId, busy, onAction }: {
  sessionId: string | null;
  busy: boolean;
  onAction?: (action: 'compact' | 'clear') => void;
}) {
  const { t } = useTranslation('chat');
  // Loaded policy also holds the unsaved controls and selected comparison images.
  const [data, setData] = useState<ContextData | null>(null);
  // Network errors must remain visible instead of silently changing retention.
  const [error, setError] = useState('');
  // Prevent concurrent saves while showing the result of the latest request.
  const [saving, setSaving] = useState(false);
  // Confirm whether the draft policy was persisted for the next safe turn boundary.
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    if (sessionId) {
      void api.providers.sessionImageContext(sessionId, { signal: controller.signal }).then(response => readApiJson<{ data: ContextData }>(response))
        .then(value => { if (!controller.signal.aborted) setData(value.data); })
        .catch(value => { if (!controller.signal.aborted) setError(String(value.message ?? value)); });
    }
    return () => controller.abort();
  }, [sessionId]);
  const save = async () => {
    if (!data || !sessionId) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      const response = await api.providers.setSessionImageContext(sessionId, data.policy);
      const value = await readApiJson<{ data: ContextData }>(response);
      setData(value.data); setSaved(true);
    } catch (value) { setError(value instanceof Error ? value.message : String(value)); }
    finally { setSaving(false); }
  };
  return <section className="mt-4 space-y-3 rounded-xl border border-border p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-semibold">{t('contextPolicy.title')}</h3>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={!sessionId || busy || !onAction || saving} onClick={() => onAction?.('compact')}><Scissors className="mr-1 h-4 w-4" />{t('contextPolicy.compact')}</Button>
        <Button size="sm" variant="outline" disabled={!sessionId || busy || !onAction || saving} onClick={() => onAction?.('clear')}><Eraser className="mr-1 h-4 w-4" />{t('contextPolicy.clear')}</Button>
      </div>
    </div>
    <p className="text-xs text-muted-foreground">{t(busy ? 'contextPolicy.busy' : 'contextPolicy.boundary')}</p>
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    {data && <>
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs">{t('contextPolicy.count')}<Input className="w-24" type="number" min={0} max={100} value={data.policy.recentImages} onChange={event => { setSaved(false); setData({ ...data, policy: { ...data.policy, recentImages: Number(event.target.value) } }); }} /></label>
        <label className="space-y-1 text-xs">{t('contextPolicy.budget')}<Input className="w-28" type="number" min={0} max={64} step={0.25} value={data.policy.imageBytes / 1048576} onChange={event => { setSaved(false); setData({ ...data, policy: { ...data.policy, imageBytes: Math.round(Number(event.target.value) * 1048576) } }); }} /></label>
        <Button size="sm" disabled={saving} onClick={() => void save()}>{saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}{t('contextPolicy.save')}</Button>
        {saved && <span className="text-xs text-muted-foreground">{t('contextPolicy.saved')}</span>}
      </div>
      <p className="text-xs text-muted-foreground">{t('contextPolicy.stats', { count: data.metrics.historicalImageCount, bytes: size(data.metrics.historicalImageBytes), pruned: data.metrics.prunedImageCount, compactions: data.metrics.compactions })}</p>
      <p className="text-xs text-muted-foreground">{data.metrics.requests > 0 ? t('contextPolicy.measurement', { before: size(data.metrics.requestBytesBefore), after: size(data.metrics.requestBytesAfter), saved: size(data.metrics.savedBytes), requests: data.metrics.requests }) : t('contextPolicy.unmeasured')}</p>
      {data.metrics.budgetExceeded && <p role="status" className="text-xs text-amber-600">{t('contextPolicy.exceeded', { count: data.metrics.currentImageCount, bytes: size(data.metrics.currentImageBytes), retained: size(data.metrics.retainedImageBytes), budget: size(data.policy.imageBytes) })}</p>}
      <details>
        <summary className="cursor-pointer text-xs font-medium">{t('contextPolicy.images', { count: data.images.length })}</summary>
        <p className="mt-2 text-xs text-muted-foreground">{t('contextPolicy.reload')}</p>
        <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
          {data.images.map((image, index) => <label key={image.id} className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={data.policy.pinnedImageIds.includes(image.id)} onChange={event => { setSaved(false); setData({ ...data, policy: { ...data.policy, pinnedImageIds: event.target.checked ? [...data.policy.pinnedImageIds, image.id] : data.policy.pinnedImageIds.filter(id => id !== image.id) } }); }} />
            <span>#{index + 1} · {image.id.slice(0,12)} · {size(image.bytes)}</span>
          </label>)}
        </div>
      </details>
    </>}
  </section>;
}
