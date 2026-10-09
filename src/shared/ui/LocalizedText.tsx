import { useInterfaceText } from '@/shared/hooks/useInterfaceText';

/** Used by chat, settings, tasks and other modules to translate static interface text. */
export function LocalizedText({ text }: { text: string }) {
  const translateInterfaceText = useInterfaceText();
  return <>{translateInterfaceText(text)}</>;
}
