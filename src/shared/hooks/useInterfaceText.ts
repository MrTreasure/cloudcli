import { useTranslation } from 'react-i18next';

import { interfaceTextKey } from '@/shared/utils';

/** Used across feature modules for legacy interface labels that lacked resource keys. */
export function useInterfaceText(): (text: string) => string {
  const { t } = useTranslation('common');
  return (text: string) => String(t(`literal.${interfaceTextKey(text)}`, { defaultValue: text }));
}
