import type { AIErrorCode, AIPhase, AITask } from './types';

// The local AI panel keeps its own strings instead of joining src/i18n: they are
// only loaded with the lazy panel chunk, and keeping the experimental feature's
// copy in one place means a wording fix never touches the shared bundle.
interface Messages {
  privacy: string;
  placeholder: string;
  inspect: string;
  inspectHint: string;
  consent: string;
  prepare: string;
  run: string;
  stop: string;
  release: string;
  remove: string;
  removeConfirm: string;
  removed: string;
  task: string;
  language: string;
  download: string;
  cached: string;
  runtimeExtra: string;
  source: string;
  caution: string;
  limitations: string;
  stoppedNote: string;
  copy: string;
  copied: string;
  copyFailed: string;
  useOutput: string;
  submitted: string;
  partial: string;
  output: string;
  tasks: Record<AITask, string>;
  phases: Record<AIPhase, string>;
  errors: Record<AIErrorCode, string>;
}

export const localAIMessages: Record<'en' | 'tw', Messages> = {
  en: {
    privacy:
      'This input stays inside the box: it is not matched against other tools, and never enters search history or share links. Telemetry is disabled for the rest of this visit once the box is open.',
    placeholder:
      'Choose a task, then enter a short question or text. Nothing runs until you press Run locally.',
    inspect: 'Check device & model',
    inspectHint:
      'This connects to jsDelivr and Hugging Face for runtime code and model metadata, not model weights. Your text is not sent to an inference server.',
    consent:
      'Allow runtime and model downloads from jsDelivr and Hugging Face over this connection.',
    prepare: 'Download / load model',
    run: 'Run locally',
    stop: 'Stop',
    release: 'Release memory',
    remove: 'Delete AI downloads',
    removeConfirm:
      'Delete this feature’s model and runtime caches? Close Local AI in other tabs first. Your other tools and settings will not be removed.',
    removed: 'AI downloads deleted.',
    task: 'Task',
    language: 'Output language',
    download: 'Model files',
    cached: 'Model files were found in the cache at the last check.',
    runtimeExtra:
      'Additional runtime files are downloaded on first load; use Wi-Fi. The browser may evict cached files, so this is not an offline-ready guarantee.',
    source: 'Model card',
    caution:
      'Small-model output may be wrong, and there is no cloud or CPU fallback. Long input is rejected rather than silently truncated.',
    limitations:
      'Requires HTTPS and WebGPU with shader-f16. Single turn, up to 1,024 prompt tokens and 256 output tokens. Sending the tab to the background releases the model.',
    stoppedNote: 'Stopped: the output above is incomplete.',
    copy: 'Copy output',
    copied: 'Copied',
    copyFailed: 'Copy failed. Select and copy the output manually.',
    useOutput: 'Use as AI input',
    submitted: 'Submitted input',
    partial: 'Partial output',
    output: 'Output',
    tasks: {
      ask: 'Ask',
      translate: 'Translate',
      rewrite: 'Rewrite',
      summarize: 'Summarize',
    },
    phases: {
      idle: 'Not loaded',
      inspecting: 'Checking device and model metadata…',
      available: 'Ready to download',
      loading: 'Downloading / initializing / warming up…',
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
      metadata:
        'Could not inspect the model files. Check your connection and retry. This check requested no model weights.',
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
    privacy:
      '這裡的輸入只留在此 box：不會拿去比對其他工具，也不會進入搜尋歷史或分享連結。開啟這個 box 後，本次瀏覽都會停用遙測。',
    placeholder: '先選任務，再輸入簡短問題或文字。按下「本機執行」才會開始。',
    inspect: '檢查裝置與模型',
    inspectHint:
      '這會連線到 jsDelivr 與 Hugging Face 取得 runtime 程式及模型資訊，不下載模型權重。你的文字不會送到推論伺服器。',
    consent:
      '允許使用目前的網路，從 jsDelivr 與 Hugging Face 下載 runtime 和模型。',
    prepare: '下載／載入模型',
    run: '本機執行',
    stop: '停止',
    release: '釋放記憶體',
    remove: '刪除 AI 下載',
    removeConfirm:
      '刪除此功能的模型與 runtime 快取？請先關閉其他分頁的本地 AI。其他工具與設定不會被刪除。',
    removed: '已刪除 AI 下載。',
    task: '任務',
    language: '輸出語言',
    download: '模型檔案',
    cached: '上次檢查時，模型檔案已在快取中。',
    runtimeExtra:
      '首次載入還會下載 runtime 檔案，建議使用 Wi-Fi。瀏覽器可能清除快取，因此這不代表已可離線使用。',
    source: '模型資訊',
    caution:
      '小模型可能回答錯誤，且不會改用雲端或 CPU。過長的輸入會被拒絕，不會默默截斷。',
    limitations:
      '需要 HTTPS，以及支援 shader-f16 的 WebGPU 瀏覽器。單輪輸入含指令最多 1,024 tokens，輸出最多 256 tokens。分頁切到背景會釋放模型。',
    stoppedNote: '已停止，上面的輸出並不完整。',
    copy: '複製輸出',
    copied: '已複製',
    copyFailed: '複製失敗，請選取結果手動複製。',
    useOutput: '作為 AI 輸入',
    submitted: '本次送出的輸入',
    partial: '未完成的輸出',
    output: '輸出',
    tasks: {
      ask: '問答',
      translate: '翻譯',
      rewrite: '改寫',
      summarize: '摘要',
    },
    phases: {
      idle: '尚未載入',
      inspecting: '正在檢查裝置與模型資訊…',
      available: '可下載模型',
      loading: '正在下載／初始化／暖機…',
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
      metadata:
        '無法取得模型檔案資訊，請檢查網路後重試。此次檢查未要求下載模型權重。',
      load: '模型初始化失敗，已釋放 Worker。請檢查網路或裝置資源後重試。',
      generation: '生成失敗，已釋放 Worker。請重新載入模型，並縮短輸入後重試。',
      inputLimit:
        '輸入超過字元或 1,024-token 預算（包含系統指令），請縮短後重試。',
      invalidRequest: '請輸入文字，並選擇支援的任務與語言。',
      timeout: '操作逾時，已停止。請檢查網路或縮短輸入後重試。',
    },
  },
};
