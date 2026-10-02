import { aiTaskLabels, type UILocale } from './labels';
import type { AIErrorCode, AIPhase, AITask } from './types';

// The local AI panel keeps its own strings instead of joining src/i18n: they are
// only loaded with the lazy panel chunk, and keeping the experimental feature's
// copy in one place means a wording fix never touches the shared bundle. The
// exception is `tasks`, which is shared with the eagerly bundled settings page
// through `labels.ts`.
interface Messages {
  // Short enough to sit under the box; the long form lives in the dialog.
  privacyShort: string;
  privacyHost: string;
  // Dialog copy. The default view answers only what a decision needs: which
  // model, whether it is loaded, whether text leaves the device, and what can
  // be changed. Everything else lives behind the two disclosures below.
  privacyFull: string;
  shareNote: string;
  placeholder: string;
  settings: string;
  close: string;
  downloadAction: string;
  loadAction: string;
  sourceNote: string;
  provisioned: string;
  // `phases.loading` covers download, ONNX session init and warm-up. This is
  // the narrower label used while bytes are actually moving; see
  // `describePhase` in setupStep.ts.
  downloading: string;
  setupTitle: string;
  outputTitle: string;
  maintenanceTitle: string;
  inspect: string;
  run: string;
  stop: string;
  release: string;
  remove: string;
  removeConfirm: string;
  removed: string;
  task: string;
  language: string;
  autoRun: string;
  autoRunHint: string;
  firstUse: string;
  // Carries a `{{size}}` placeholder filled with the exact byte count pinned
  // alongside the immutable model revision and dtype.
  firstUseSized: string;
  cached: string;
  source: string;
  caution: string;
  checkDetail: string;
  modelDetails: string;
  techDetails: string;
  sourceFiles: string;
  evictionNote: string;
  requirements: string;
  budget: string;
  memoryNote: string;
  telemetryNote: string;
  stoppedNote: string;
  copy: string;
  copied: string;
  copyFailed: string;
  useOutput: string;
  submitted: string;
  partial: string;
  tasks: Record<AITask, string>;
  phases: Record<AIPhase, string>;
  errors: Record<AIErrorCode, string>;
}

export const localAIMessages: Record<UILocale, Messages> = {
  en: {
    privacyShort: 'Runs on this device. Text is never sent to a server.',
    privacyHost:
      'From the main input — never saved to history; share links include it. Runs on-device.',
    privacyFull:
      'Runs in this browser. Your prompts are not sent to an AI server.',
    shareNote:
      'This prompt is in the main input, so the other tools match it and a share link you create would carry it.',
    placeholder:
      'Enter a short question or text, or type it before ::ai in the main input.',
    settings: 'AI settings',
    close: 'Close',
    downloadAction: 'Download model',
    loadAction: 'Load model',
    sourceNote:
      'Downloaded from jsDelivr and Hugging Face, then kept on this device.',
    provisioned:
      'Downloaded and verified on this device. The ::ai box now loads it from the local cache.',
    downloading: 'Downloading model…',
    setupTitle: 'Model',
    outputTitle: 'Output',
    maintenanceTitle: 'Storage',
    inspect: 'Check device & model',
    checkDetail:
      'Opening this box checks WebGPU support and the local model cache. The exact download size is pinned to this model revision. No weights are fetched until you press the download button. Turn it off in Settings › AI.',
    run: 'Run locally',
    stop: 'Stop',
    release: 'Release memory',
    remove: 'Delete AI downloads',
    removeConfirm:
      'Delete this feature’s model and runtime caches? Close Local AI in other tabs first. Your other tools and settings will not be removed.',
    removed: 'AI downloads deleted.',
    task: 'Task',
    language: 'Output language',
    autoRun: 'Run automatically when the model is loaded',
    autoRunHint: 'Otherwise press Run locally yourself.',
    firstUse: 'The model is downloaded on first use and kept on this device.',
    firstUseSized:
      'First use downloads {{size}}, then keeps it on this device.',
    cached: 'Model files were found in the cache at the last check.',
    source: 'Model card',
    caution: 'This small local model can produce wrong answers.',
    modelDetails: 'Model details',
    techDetails: 'Technical details',
    sourceFiles:
      'Runtime code and weights are fetched from jsDelivr and Hugging Face.',
    evictionNote:
      'The browser may evict the cache, so this is not an offline guarantee.',
    requirements:
      'Requires WebGPU with shader-f16. There is no cloud or CPU fallback.',
    budget: 'Single turn · 1,024 input tokens · 256 output tokens.',
    memoryNote:
      'GPU memory is released when the tab goes to the background, once a download or answer in progress has finished.',
    telemetryNote: 'Usage statistics stay disabled for the rest of this visit.',
    stoppedNote: 'Stopped: the output above is incomplete.',
    copy: 'Copy output',
    copied: 'Copied',
    copyFailed: 'Copy failed. Select and copy the output manually.',
    useOutput: 'Use as AI input',
    submitted: 'Submitted input',
    partial: 'Partial output',
    tasks: aiTaskLabels.en,
    phases: {
      idle: 'Not loaded',
      inspecting: 'Checking device and model…',
      available: 'Ready to download',
      loading: 'Preparing model…',
      ready: 'Model ready',
      generating: 'Generating on this device…',
      stopping: 'Stopping…',
      stopped: 'Stopped',
      complete: 'Complete',
      error: 'Action needed',
    },
    errors: {
      unsupported:
        'This browser cannot run the selected model. Use HTTPS and a WebGPU-capable browser with shader-f16. The ordinary tools still work.',
      storage:
        'Browser storage is unavailable or insufficient. Free space or leave private browsing, then check again.',
      inspect:
        'Could not check the local AI runtime or cache. Check your connection and retry. No model weights were requested.',
      load: 'Model initialization failed. The worker was released; check the connection or device resources and retry.',
      generation:
        'Generation failed. The worker was released; load the model again and retry with shorter text.',
      inputLimit:
        'Text exceeds the character or 1,024-token prompt budget (including instructions). Shorten it and retry.',
      invalidRequest:
        'Enter non-empty text and select a supported task and language.',
      timeout:
        'The operation timed out and was stopped. Check the connection or try a shorter request.',
    },
  },
  tw: {
    privacyShort: '只在本機執行，文字不會送到伺服器。',
    privacyHost: '取自主要輸入框：不寫入歷史；分享連結會包含它。只在本機執行。',
    privacyFull: '在你的瀏覽器中執行，提示不會送到 AI 伺服器。',
    shareNote:
      '這段提示位在主要輸入框，因此其他工具也會比對它，你建立的分享連結也會包含它。',
    placeholder: '輸入簡短問題或文字，或在主要輸入框的 ::ai 前面輸入。',
    settings: 'AI 設定',
    close: '關閉',
    downloadAction: '下載模型',
    loadAction: '載入模型',
    sourceNote: '從 jsDelivr 與 Hugging Face 下載，之後保存在這台裝置。',
    provisioned: '已在這台裝置下載並驗證，::ai box 之後會直接從本機快取載入。',
    downloading: '正在下載模型…',
    setupTitle: '模型',
    outputTitle: '輸出',
    maintenanceTitle: '儲存',
    inspect: '檢查裝置與模型',
    checkDetail:
      '開啟這個 box 會檢查 WebGPU 支援與本機模型快取。精確下載大小已和此模型 revision 一起固定；在你按下下載按鈕前不會取得任何權重。可在「設定 › AI」關閉。',
    run: '本機執行',
    stop: '停止',
    release: '釋放記憶體',
    remove: '刪除 AI 下載',
    removeConfirm:
      '刪除此功能的模型與 runtime 快取？請先關閉其他分頁的本地 AI。其他工具與設定不會被刪除。',
    removed: '已刪除 AI 下載。',
    task: '任務',
    language: '輸出語言',
    autoRun: '模型載入後自動執行',
    autoRunHint: '否則請自行按「本機執行」。',
    firstUse: '模型會在首次使用時下載，並保存在這台裝置。',
    firstUseSized: '首次使用會下載 {{size}}，之後保存在這台裝置。',
    cached: '上次檢查時，模型檔案已在快取中。',
    source: '模型資訊',
    caution: '這個小型本機模型可能給出錯誤的答案。',
    modelDetails: '模型詳細資訊',
    techDetails: '技術細節',
    sourceFiles: 'Runtime 程式與權重取自 jsDelivr 與 Hugging Face。',
    evictionNote: '瀏覽器可能清除快取，因此不保證可離線使用。',
    requirements: '需要支援 shader-f16 的 WebGPU，且不會改用雲端或 CPU。',
    budget: '單輪 · 輸入上限 1,024 tokens · 輸出上限 256 tokens。',
    memoryNote: '分頁切到背景時，會在進行中的下載或回答完成後釋放 GPU 記憶體。',
    telemetryNote: '本次瀏覽期間都會停用使用統計。',
    stoppedNote: '已停止，上面的輸出並不完整。',
    copy: '複製輸出',
    copied: '已複製',
    copyFailed: '複製失敗，請選取結果手動複製。',
    useOutput: '作為 AI 輸入',
    submitted: '本次送出的輸入',
    partial: '未完成的輸出',
    tasks: aiTaskLabels.tw,
    phases: {
      idle: '尚未載入',
      inspecting: '正在檢查裝置與模型…',
      available: '可下載模型',
      loading: '正在準備模型…',
      ready: '模型就緒',
      generating: '正在本機生成…',
      stopping: '正在停止…',
      stopped: '已停止',
      complete: '已完成',
      error: '需要處理',
    },
    errors: {
      unsupported:
        '此瀏覽器無法執行所選模型。請使用 HTTPS，以及支援 WebGPU 與 shader-f16 的瀏覽器。一般工具仍可使用。',
      storage:
        '瀏覽器儲存空間不足或不可用。請清出空間或離開無痕模式，再重新檢查。',
      inspect:
        '無法檢查本機 AI runtime 或快取，請檢查網路後重試。此次檢查未要求下載模型權重。',
      load: '模型初始化失敗，已釋放 Worker。請檢查網路或裝置資源後重試。',
      generation: '生成失敗，已釋放 Worker。請重新載入模型，並縮短輸入後重試。',
      inputLimit:
        '輸入超過字元或 1,024-token 預算（包含系統指令），請縮短後重試。',
      invalidRequest: '請輸入文字，並選擇支援的任務與語言。',
      timeout: '操作逾時，已停止。請檢查網路或縮短輸入後重試。',
    },
  },
};
