const en = {
  'brand.title': 'Magic Box',
  'nav.home': 'Home',
  'nav.list': 'List',
  'nav.settings': 'Settings',

  'settings.title': 'Settings',
  'settings.subtitle': 'Preferences are saved locally in your browser.',
  'settings.section.boxOrder': 'Box order',
  'settings.section.boxOrderHint':
    'Drag to reorder. Matches on the home screen appear in this order. Toggle off to hide a box.',
  'settings.resetOrder': 'Reset to default',
  'settings.section.appearance': 'Appearance',
  'settings.theme': 'Theme',
  'settings.themeHint': 'Match your OS or pick a fixed mode.',
  'settings.themeLight': 'Light',
  'settings.themeDark': 'Dark',
  'settings.themeSystem': 'System',
  'settings.density': 'Density',
  'settings.densityHint': 'Compact fits more boxes per screen.',
  'settings.densityComfortable': 'Comfortable',
  'settings.densityCompact': 'Compact',
  'settings.section.io': 'Input & Output',
  'settings.language': 'Language',
  'settings.languageHint': 'Used for human-readable cron and dates.',
  'settings.enterBehavior': 'Enter behavior',
  'settings.enterBehaviorHint': 'What Enter does when focused on a box.',
  'settings.enterCopy': 'Copy',
  'settings.enterPaste': 'Copy & paste back',
  'settings.enterOff': 'Off',
  'settings.timezone': 'Default timezone',
  'settings.timezoneHint':
    'Default: UTC+8. Choose a fixed offset or follow the system timezone, including daylight saving at the date being converted.',
  'settings.timezoneSystem': 'Auto — follow system timezone',
  'settings.default': 'default',
  'settings.resetPreferences': 'Restore all defaults',
  'settings.defaultsHint':
    'Defaults: system theme, comfortable density, English, Enter copies, UTC+8, default server URLs, anonymous usage enabled; Local AI asks, auto language, auto check and auto-run enabled. Restore also resets box order and availability, while preserving input and history.',
  'settings.section.server': 'Server',
  'settings.section.serverHint':
    'Override backend hosts. Leave blank to use the defaults.',
  'settings.toolboxUrl': 'Toolbox URL',
  'settings.toolboxUrlHint':
    'Host for the shorten-URL API. Must be a valid http(s) URL or blank.',
  'settings.shortenUrl': 'Shortener URL',
  'settings.shortenUrlHint':
    'Host that serves generated short links. Must be a valid http(s) URL or blank.',
  'settings.section.shortcuts': 'Shortcuts',
  'settings.shortcutNext': 'Next box',
  'settings.shortcutPrev': 'Previous box',
  'settings.shortcutPrevAlt': 'Previous box (alt)',
  'settings.shortcutCopy': 'Copy selected output',
  'settings.shortcutPaste': 'Paste output back into input',
  'settings.section.localAI': 'Local AI',
  'settings.section.localAIHint':
    'Defaults for the ::ai box, plus the model download itself. Nothing is generated from this page.',
  'settings.aiTask': 'Task',
  'settings.aiTaskHint': 'What the model is asked to do with your text.',
  'settings.aiLanguage': 'Output language',
  'settings.aiLanguageHint':
    'The language the answer is written in. Auto follows the app language.',
  'settings.aiAutoRun': 'Auto-run input prompts',
  'settings.aiAutoRunHint':
    'Run text typed before ::ai as soon as it settles, but only when the model is already loaded in that tab.',
  'settings.aiAutoCheck': 'Check the model automatically',
  'settings.aiAutoCheckHint':
    'When a Local AI box opens, read the model size from Hugging Face and check WebGPU support, so the box lands on a download button labelled with the real size. Turn this off to contact jsDelivr and Hugging Face only after you press Check device & model. Either way, the weights are downloaded only by your own click.',
  'settings.aiModel': 'Model',
  'settings.aiModelHint':
    'Download the weights ahead of time so the ::ai box starts from the local cache. The check reports the real size before anything is fetched; leaving this page frees the memory shortly after, never the download.',
  'settings.aiDelete': 'Delete AI downloads',
  'settings.aiDeleteHint':
    'Removes the cached model and runtime. Other tools and settings are untouched.',
  'settings.delete': 'Delete',
  'settings.section.privacy': 'Privacy',
  'settings.analytics': 'Anonymous usage',
  'settings.analyticsHint':
    'Help improve MagicBox by sharing anonymous box-match stats. Never your input.',
  'settings.clearData': 'Clear local data',
  'settings.clearDataHint':
    'Removes saved input, preferences, order and history.',
  'settings.clear': 'Clear',
  'settings.clearConfirm':
    'Clear all locally saved input, preferences, and order? This cannot be undone.',
  'settings.section.about': 'About',
  'settings.version': 'Version',
  'settings.license': 'License',
  'settings.source': 'Source',
  'settings.langEn': 'English',
  'settings.langTw': '繁體中文',
  'settings.dragReorderLabel': 'Drag to reorder {{name}}',
  'settings.disableBoxLabel': 'Disable {{name}}',
  'settings.enableBoxLabel': 'Enable {{name}}',
  'settings.toggle': 'Toggle',

  'magicBox.input': 'Input',
  'magicBox.output': 'Output',
  'magicBox.next': 'next',
  'magicBox.copy': 'copy',
  'magicBox.clearHistory': 'Clear history',
  'magicBox.noHistory': 'No history yet',
  'magicBox.openHistory': 'Open history',
  'magicBox.closeHistory': 'Close history',
  'magicBox.placeholder':
    'Paste anything — a timestamp, JWT, JSON, cron, math expression…',
  'magicBox.deleteEntry': 'Delete history entry: {{input}}',
  'magicBox.emptyStartTitle': 'Start typing',
  'magicBox.emptyStartSub':
    'MagicBox auto-detects formats and shows every useful transformation.',
  'magicBox.emptyNoMatchesTitle': 'No matches',
  'magicBox.emptyNoMatchesSub':
    'Try a different format — JSON, JWT, timestamp, cron, base64, math…',

  'time.justNow': 'just now',
  'time.minutesAgo': '{{n}}m ago',
  'time.hoursAgo': '{{n}}h ago',
  'time.daysAgo': '{{n}}d ago',

  'boxCard.copy': 'Copy',
  'boxCard.copied': 'Copied',
  'boxCard.expand': 'Expand',
  'boxCard.copyLabel': 'Copy {{name}} output',
  'boxCard.expandLabel': 'Expand {{name}}',

  'boxModal.close': 'Close',
  'boxModal.closeBackdrop': 'Close modal backdrop',

  'toolsList.noBoxes': 'No boxes available',
  'toolsList.noBoxesHint': 'Enable some in Settings to get started.',
  'toolsList.box': 'Box',
  'toolsList.boxes': 'Boxes',
  'toolsList.search': 'Search boxes',
  'toolsList.clearSearch': 'Clear search',
  'toolsList.expandSidebar': 'Expand sidebar',
  'toolsList.collapseSidebar': 'Collapse sidebar',
  'toolsList.previewInput': 'Input',
  'toolsList.previewOutput': 'Output',
  'toolsList.previewHint': 'try your own — it updates live',
  'toolsList.noMatch': 'No boxes match "{{query}}".',
  'toolsList.kind.format': 'Format',
  'toolsList.source.dataConverter.name': 'Data Converter',
  'toolsList.source.dataConverter.description':
    'Pretty-print and convert between JSON, YAML, TOML and XML.',

  'shareLink.copy': 'Copy share link',
  'shareLink.copied': 'Share link copied',

  'pwa.newVersion': 'New version available.',
  'pwa.refreshHint': 'Refresh to update the app.',
  'pwa.refresh': 'Update',
  'pwa.later': 'Later',

  'snackbar.copied': 'Copied',
};

export type Translations = typeof en;

export default en;
