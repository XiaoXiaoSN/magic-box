import type { Translations } from './en';

const zhTW: Translations = {
  'brand.title': 'Magic Box',
  'nav.home': '首頁',
  'nav.list': '列表',
  'nav.settings': '設定',

  'settings.title': '設定',
  'settings.subtitle': '偏好設定會儲存在瀏覽器中。',
  'settings.section.boxOrder': 'Box 順序',
  'settings.section.boxOrderHint':
    '拖曳以重新排序。首頁的匹配結果會依照此順序顯示；關閉開關可隱藏 Box。',
  'settings.resetOrder': '重設為預設',
  'settings.section.appearance': '外觀',
  'settings.theme': '主題',
  'settings.themeHint': '配合作業系統或選擇固定模式。',
  'settings.themeLight': '淺色',
  'settings.themeDark': '深色',
  'settings.themeSystem': '系統',
  'settings.density': '密度',
  'settings.densityHint': '緊湊模式在每個畫面容納更多 Box。',
  'settings.densityComfortable': '舒適',
  'settings.densityCompact': '緊湊',
  'settings.section.io': '輸入與輸出',
  'settings.language': '語言',
  'settings.languageHint': '用於人類可讀的 cron 和日期。',
  'settings.enterBehavior': 'Enter 行為',
  'settings.enterBehaviorHint': '焦點在 Box 時按下 Enter 的作用。',
  'settings.enterCopy': '複製',
  'settings.enterPaste': '複製並貼回',
  'settings.enterOff': '關閉',
  'settings.timezone': '預設時區',
  'settings.timezoneHint':
    '預設 UTC+8。可選固定時差或跟隨系統時區，包含轉換日期當時的日光節約時間。',
  'settings.timezoneSystem': '自動 — 跟隨系統時區',
  'settings.default': '預設',
  'settings.resetPreferences': '恢復所有預設值',
  'settings.defaultsHint':
    '預設：系統主題、舒適密度、英文、Enter 複製、UTC+8、預設伺服器、啟用匿名統計；Local AI 提問、自動語言、自動檢查與執行。恢復預設值也會重設 Box 順序與啟用狀態，並保留輸入與歷史紀錄。',
  'settings.section.server': '伺服器',
  'settings.section.serverHint': '覆寫後端主機位址。留空則使用預設值。',
  'settings.toolboxUrl': 'Toolbox 網址',
  'settings.toolboxUrlHint':
    '縮網址 API 的主機位址。必須是有效的 http(s) 網址或留空。',
  'settings.shortenUrl': '縮網址服務網址',
  'settings.shortenUrlHint':
    '提供短連結的主機位址。必須是有效的 http(s) 網址或留空。',
  'settings.section.shortcuts': '快捷鍵',
  'settings.shortcutNext': '下一個 Box',
  'settings.shortcutPrev': '上一個 Box',
  'settings.shortcutPrevAlt': '上一個 Box (替代)',
  'settings.shortcutCopy': '複製選取的輸出',
  'settings.shortcutPaste': '將輸出貼回輸入',
  'settings.section.localAI': '本地 AI',
  'settings.section.localAIHint':
    '::ai box 的預設值，以及模型下載本身。這個頁面不會生成任何內容。',
  'settings.aiTask': '任務',
  'settings.aiTaskHint': '模型要對你的文字做什麼。',
  'settings.aiLanguage': '輸出語言',
  'settings.aiLanguageHint': '回答使用的語言。自動代表跟隨介面語言。',
  'settings.aiAutoRun': '自動執行輸入的提示',
  'settings.aiAutoRunHint':
    '在 ::ai 前輸入的文字停止變動後就直接執行，但僅限該分頁已載入模型時。',
  'settings.aiAutoCheck': '自動檢查模型',
  'settings.aiAutoCheckHint':
    '本地 AI box 開啟時，向 Hugging Face 讀取模型大小並檢查 WebGPU 支援，box 就會直接顯示標有實際大小的下載按鈕。關閉後，只有在你按下「檢查裝置與模型」之後才會連線 jsDelivr 與 Hugging Face。無論如何，權重都只會因你自己的點擊而下載。',
  'settings.aiModel': '模型',
  'settings.aiModelHint':
    '先下載權重，::ai box 之後就能直接從本機快取啟動。檢查會在下載前回報實際大小；離開此頁稍後會釋放記憶體，但不會刪除下載。',
  'settings.aiDelete': '刪除 AI 下載',
  'settings.aiDeleteHint':
    '移除已快取的模型與 runtime。其他工具與設定不受影響。',
  'settings.delete': '刪除',
  'settings.section.privacy': '隱私',
  'settings.analytics': '匿名使用統計',
  'settings.analyticsHint':
    '透過分享匿名的 Box 匹配統計來幫助改善 Magic Box。絕不包含你的輸入內容。',
  'settings.clearData': '清除本地資料',
  'settings.clearDataHint': '移除已儲存的輸入、偏好設定、順序和歷史記錄。',
  'settings.clear': '清除',
  'settings.clearConfirm':
    '清除所有本機儲存的輸入、偏好設定和順序？此操作無法復原。',
  'settings.section.about': '關於',
  'settings.version': '版本',
  'settings.license': '授權',
  'settings.source': '原始碼',
  'settings.langEn': 'English',
  'settings.langTw': '繁體中文',
  'settings.dragReorderLabel': '拖曳以重新排序 {{name}}',
  'settings.disableBoxLabel': '停用 {{name}}',
  'settings.enableBoxLabel': '啟用 {{name}}',
  'settings.toggle': '切換',

  'magicBox.input': '輸入',
  'magicBox.output': '輸出',
  'magicBox.next': '下一個',
  'magicBox.copy': '複製',
  'magicBox.clearHistory': '清除歷史記錄',
  'magicBox.noHistory': '尚無歷史記錄',
  'magicBox.openHistory': '開啟歷史記錄',
  'magicBox.closeHistory': '關閉歷史記錄',
  'magicBox.placeholder':
    '貼上任何內容 — 時間戳記、JWT、JSON、cron、數學表達式…',
  'magicBox.deleteEntry': '刪除歷史記錄：{{input}}',
  'magicBox.emptyStartTitle': '開始輸入',
  'magicBox.emptyStartSub':
    'MagicBox 會自動偵測格式，並顯示所有有用的轉換結果。',
  'magicBox.emptyNoMatchesTitle': '沒有匹配結果',
  'magicBox.emptyNoMatchesSub':
    '試試其他格式 — JSON、JWT、時間戳記、cron、base64、數學式…',

  'time.justNow': '剛剛',
  'time.minutesAgo': '{{n}} 分鐘前',
  'time.hoursAgo': '{{n}} 小時前',
  'time.daysAgo': '{{n}} 天前',

  'boxCard.copy': '複製',
  'boxCard.copied': '已複製',
  'boxCard.expand': '展開',
  'boxCard.copyLabel': '複製 {{name}} 的輸出',
  'boxCard.expandLabel': '展開 {{name}}',

  'boxModal.close': '關閉',
  'boxModal.closeBackdrop': '關閉模態背景',

  'toolsList.noBoxes': '沒有可用的 Box',
  'toolsList.noBoxesHint': '請在設定中啟用一些 Box 以開始使用。',
  'toolsList.box': 'Box',
  'toolsList.boxes': 'Box',
  'toolsList.search': '搜尋 Box',
  'toolsList.clearSearch': '清除搜尋',
  'toolsList.expandSidebar': '展開側邊欄',
  'toolsList.collapseSidebar': '收合側邊欄',
  'toolsList.previewInput': '輸入',
  'toolsList.previewOutput': '輸出',
  'toolsList.previewHint': '試試你自己的內容 — 會即時更新',
  'toolsList.noMatch': '沒有符合「{{query}}」的 Box。',
  'toolsList.kind.format': '格式',
  'toolsList.source.dataConverter.name': '資料轉換器',
  'toolsList.source.dataConverter.description':
    '格式化並在 JSON、YAML、TOML 與 XML 之間轉換。',

  'shareLink.copy': '複製分享連結',
  'shareLink.copied': '已複製分享連結',

  'pwa.newVersion': '有新版本可用。',
  'pwa.refreshHint': '重新整理以更新應用程式。',
  'pwa.refresh': '更新',
  'pwa.later': '稍後',

  'snackbar.copied': '已複製',
};

export default zhTW;
