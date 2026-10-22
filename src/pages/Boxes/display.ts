import type { BoxSource } from '@modules/BoxSource';
import type { useLocale } from '../../contexts/LocaleContext';

type LocaleText = ReturnType<typeof useLocale>['t'];

export const getKindLabel = (kind: string, t: LocaleText): string => {
  if (kind === 'Format') return t('toolsList.kind.format');
  return kind;
};

export const getSourceDisplay = (
  source: BoxSource,
  t: LocaleText,
): Pick<BoxSource, 'name' | 'description' | 'kind'> => {
  if (source.name === 'Data Converter') {
    return {
      name: t('toolsList.source.dataConverter.name'),
      description: t('toolsList.source.dataConverter.description'),
      kind: getKindLabel(source.kind, t),
    };
  }

  return {
    name: source.name,
    description: source.description,
    kind: getKindLabel(source.kind, t),
  };
};
