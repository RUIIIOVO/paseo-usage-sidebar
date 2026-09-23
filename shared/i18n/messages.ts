/**
 * Paseo's own supported locales (LANGUAGE_OPTIONS in the app bundle).
 * Paseo's provider-usage UI is hardcoded English; this plugin localizes it.
 */
export const SUPPORTED_LOCALES = ["ar", "en", "es", "fr", "ja", "ko", "pt-BR", "ru", "zh-CN"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const RTL_LOCALES: readonly Locale[] = ["ar"];

export type Messages = {
  title: string;
  refresh: string;
  refreshing: string;
  loading: string;
  empty: string;
  errorTitle: string;
  retry: string;
  /**
   * Shown instead of the host's own error when the plugin's session with the
   * daemon has ended. The host's wording there is "Update the host to ...",
   * which sends people to check for an update they do not need; only a plugin
   * reload rebuilds the connection, so the copy has to say exactly that.
   */
  linkLostTitle: string;
  linkLostBody: string;
  /** Marks readings that are still on screen but are no longer being refreshed. */
  stale: string;
  unavailable: string;
  error: string;
  resettingNow: string;
  justNow: string;
  /** Compact duration units, joined into at most two parts (`2d 3h`, `3h 25m`, `40m`). */
  days: (value: number) => string;
  hours: (value: number) => string;
  minutes: (value: number) => string;
  resets: (duration: string) => string;
  /** Absolute reset instant, the way Claude Code and Codex spell it out (`resets at 3:04 PM`). */
  resetsAt: (clock: string) => string;
  runsOut: (duration: string) => string;
  ago: (duration: string) => string;
  updated: (relative: string) => string;
  balanceLeft: (amount: string) => string;
  /** Canonical window names, so a sidebar row is not stuck with the daemon's English label. */
  windowFiveHour: string;
  windowWeekly: string;
  windowDaily: string;
  windowMonthly: string;
  /** A window scoped to one model, e.g. `Weekly (Fable)`. */
  windowScoped: (base: string, scope: string) => string;
  showInSidebar: string;
  hideFromSidebar: string;
  sidebarEmpty: string;
  /** The reorder block: the pinned rows in the order the meter paints them. */
  sidebarOrder: string;
  moveUp: string;
  moveDown: string;
  reorder: string;
  /** The pin list could not be written, so the arrangement on screen was rolled back. */
  pinSaveFailed: string;
};

const en: Messages = {
  title: "Plan usage",
  refresh: "Refresh",
  refreshing: "Refreshing...",
  loading: "Loading usage...",
  empty: "No usage data",
  errorTitle: "Unable to load usage",
  retry: "Try again",
  linkLostTitle: "Reload the plugin",
  linkLostBody: "The session with the Paseo daemon ended. Reload the plugin to reconnect \u2014 the app itself is up to date.",
  stale: "Not updating",
  unavailable: "Unavailable",
  error: "Error",
  resettingNow: "resetting now",
  justNow: "just now",
  days: (value) => `${value}d`,
  hours: (value) => `${value}h`,
  minutes: (value) => `${value}m`,
  resets: (duration) => `resets in ${duration}`,
  resetsAt: (clock) => `resets at ${clock}`,
  runsOut: (duration) => `runs out in ${duration}`,
  ago: (duration) => `${duration} ago`,
  updated: (relative) => `Updated ${relative}`,
  balanceLeft: (amount) => `${amount} left`,
  windowFiveHour: "5-hour session",
  windowWeekly: "Weekly",
  windowDaily: "Today",
  windowMonthly: "This month",
  windowScoped: (base, scope) => `${base} (${scope})`,
  showInSidebar: "Show in sidebar",
  hideFromSidebar: "Hide from sidebar",
  sidebarEmpty: "Nothing pinned to the sidebar",
  sidebarOrder: "Sidebar order",
  moveUp: "Move up",
  moveDown: "Move down",
  reorder: "Drag to reorder",
  pinSaveFailed: "Could not save the sidebar arrangement. Your change was undone.",
};

const zhCN: Messages = {
  title: "用量",
  refresh: "刷新",
  refreshing: "正在刷新…",
  loading: "正在加载用量…",
  empty: "暂无用量数据",
  errorTitle: "无法加载用量",
  retry: "重试",
  linkLostTitle: "请重新加载插件",
  linkLostBody: "与 Paseo 守护进程的连接已断开。重新加载插件即可恢复，应用本身无需更新。",
  stale: "已停止更新",
  unavailable: "不可用",
  error: "错误",
  resettingNow: "即将重置",
  justNow: "刚刚",
  days: (value) => `${value} 天`,
  hours: (value) => `${value} 小时`,
  minutes: (value) => `${value} 分钟`,
  resets: (duration) => `${duration}后重置`,
  resetsAt: (clock) => `${clock} 重置`,
  runsOut: (duration) => `预计 ${duration}后用完`,
  ago: (duration) => `${duration}前`,
  updated: (relative) => `${relative}更新`,
  balanceLeft: (amount) => `剩余 ${amount}`,
  windowFiveHour: "5 小时会话",
  windowWeekly: "本周",
  windowDaily: "今日",
  windowMonthly: "本月",
  // Latin model names inside full-width parentheses read as a foreign body in a
  // Chinese line; the interpunct is what Chinese UI copy uses to qualify a term.
  windowScoped: (base, scope) => `${base} · ${scope}`,
  showInSidebar: "在侧边栏显示",
  hideFromSidebar: "从侧边栏移除",
  sidebarEmpty: "侧边栏未固定任何用量",
  sidebarOrder: "侧边栏顺序",
  moveUp: "上移",
  moveDown: "下移",
  reorder: "拖拽排序",
  pinSaveFailed: "无法保存侧边栏排列，已撤销此次更改。",
};

const ja: Messages = {
  title: "プラン使用量",
  refresh: "更新",
  refreshing: "更新中...",
  loading: "使用量を読み込み中...",
  empty: "使用量データがありません",
  errorTitle: "使用量を読み込めません",
  retry: "再試行",
  linkLostTitle: "プラグインを再読み込みしてください",
  linkLostBody: "Paseo デーモンとの接続が切断されました。プラグインを再読み込みすると復旧します。アプリ本体の更新は不要です。",
  stale: "更新停止中",
  unavailable: "利用不可",
  error: "エラー",
  resettingNow: "まもなくリセット",
  justNow: "たった今",
  days: (value) => `${value}日`,
  hours: (value) => `${value}時間`,
  minutes: (value) => `${value}分`,
  resets: (duration) => `${duration}後にリセット`,
  resetsAt: (clock) => `${clock}にリセット`,
  runsOut: (duration) => `${duration}で使い切り`,
  ago: (duration) => `${duration}前`,
  updated: (relative) => `${relative}更新`,
  balanceLeft: (amount) => `残り ${amount}`,
  windowFiveHour: "5時間セッション",
  windowWeekly: "今週",
  windowDaily: "今日",
  windowMonthly: "今月",
  windowScoped: (base, scope) => `${base}（${scope}）`,
  showInSidebar: "サイドバーに表示",
  hideFromSidebar: "サイドバーから削除",
  sidebarEmpty: "サイドバーに固定された項目はありません",
  sidebarOrder: "サイドバーの順序",
  moveUp: "上へ",
  moveDown: "下へ",
  reorder: "ドラッグして並べ替え",
  pinSaveFailed: "サイドバーの配置を保存できませんでした。変更は取り消されました。",
};

const ko: Messages = {
  title: "플랜 사용량",
  refresh: "새로고침",
  refreshing: "새로고침 중...",
  loading: "사용량 불러오는 중...",
  empty: "사용량 데이터 없음",
  errorTitle: "사용량을 불러올 수 없음",
  retry: "다시 시도",
  linkLostTitle: "플러그인을 다시 로드하세요",
  linkLostBody: "Paseo 데몬과의 연결이 끊어졌습니다. 플러그인을 다시 로드하면 복구됩니다. 앱 자체는 업데이트할 필요가 없습니다.",
  stale: "업데이트 중지됨",
  unavailable: "사용 불가",
  error: "오류",
  resettingNow: "곧 초기화",
  justNow: "방금",
  days: (value) => `${value}일`,
  hours: (value) => `${value}시간`,
  minutes: (value) => `${value}분`,
  resets: (duration) => `${duration} 후 초기화`,
  resetsAt: (clock) => `${clock}에 초기화`,
  runsOut: (duration) => `${duration} 후 소진`,
  ago: (duration) => `${duration} 전`,
  updated: (relative) => `${relative} 업데이트`,
  balanceLeft: (amount) => `${amount} 남음`,
  windowFiveHour: "5시간 세션",
  windowWeekly: "이번 주",
  windowDaily: "오늘",
  windowMonthly: "이번 달",
  windowScoped: (base, scope) => `${base} (${scope})`,
  showInSidebar: "사이드바에 표시",
  hideFromSidebar: "사이드바에서 제거",
  sidebarEmpty: "사이드바에 고정된 항목 없음",
  sidebarOrder: "사이드바 순서",
  moveUp: "위로",
  moveDown: "아래로",
  reorder: "끌어서 순서 변경",
  pinSaveFailed: "사이드바 배치를 저장하지 못했습니다. 변경 사항이 취소되었습니다.",
};

const es: Messages = {
  title: "Uso del plan",
  refresh: "Actualizar",
  refreshing: "Actualizando...",
  loading: "Cargando uso...",
  empty: "Sin datos de uso",
  errorTitle: "No se pudo cargar el uso",
  retry: "Reintentar",
  linkLostTitle: "Vuelve a cargar el complemento",
  linkLostBody: "La sesión con el daemon de Paseo terminó. Vuelve a cargar el complemento para reconectar: la aplicación ya está actualizada.",
  stale: "Sin actualizar",
  unavailable: "No disponible",
  error: "Error",
  resettingNow: "restableciendo ahora",
  justNow: "ahora mismo",
  days: (value) => `${value} d`,
  hours: (value) => `${value} h`,
  minutes: (value) => `${value} min`,
  resets: (duration) => `se restablece en ${duration}`,
  resetsAt: (clock) => `se restablece a las ${clock}`,
  runsOut: (duration) => `se agota en ${duration}`,
  ago: (duration) => `hace ${duration}`,
  updated: (relative) => `Actualizado ${relative}`,
  balanceLeft: (amount) => `${amount} restante`,
  windowFiveHour: "Sesión de 5 h",
  windowWeekly: "Esta semana",
  windowDaily: "Hoy",
  windowMonthly: "Este mes",
  windowScoped: (base, scope) => `${base} (${scope})`,
  showInSidebar: "Mostrar en la barra lateral",
  hideFromSidebar: "Quitar de la barra lateral",
  sidebarEmpty: "Nada fijado en la barra lateral",
  sidebarOrder: "Orden de la barra lateral",
  moveUp: "Subir",
  moveDown: "Bajar",
  reorder: "Arrastra para reordenar",
  pinSaveFailed: "No se pudo guardar la disposición de la barra lateral. Se deshizo el cambio.",
};

const fr: Messages = {
  title: "Utilisation du forfait",
  refresh: "Actualiser",
  refreshing: "Actualisation...",
  loading: "Chargement de l'utilisation...",
  empty: "Aucune donnée d'utilisation",
  errorTitle: "Impossible de charger l'utilisation",
  retry: "Réessayer",
  linkLostTitle: "Rechargez l'extension",
  linkLostBody: "La session avec le démon Paseo a pris fin. Rechargez l'extension pour vous reconnecter : l'application elle-même est à jour.",
  stale: "Plus de mise à jour",
  unavailable: "Indisponible",
  error: "Erreur",
  resettingNow: "réinitialisation en cours",
  justNow: "à l'instant",
  days: (value) => `${value} j`,
  hours: (value) => `${value} h`,
  minutes: (value) => `${value} min`,
  resets: (duration) => `réinitialisé dans ${duration}`,
  resetsAt: (clock) => `réinitialisé à ${clock}`,
  runsOut: (duration) => `épuisé dans ${duration}`,
  ago: (duration) => `il y a ${duration}`,
  updated: (relative) => `Mis à jour ${relative}`,
  balanceLeft: (amount) => `${amount} restant`,
  windowFiveHour: "Session de 5 h",
  windowWeekly: "Cette semaine",
  windowDaily: "Aujourd'hui",
  windowMonthly: "Ce mois-ci",
  windowScoped: (base, scope) => `${base} (${scope})`,
  showInSidebar: "Afficher dans la barre latérale",
  hideFromSidebar: "Retirer de la barre latérale",
  sidebarEmpty: "Rien d'épinglé dans la barre latérale",
  sidebarOrder: "Ordre de la barre latérale",
  moveUp: "Monter",
  moveDown: "Descendre",
  reorder: "Glisser pour réordonner",
  pinSaveFailed: "Impossible d'enregistrer la disposition de la barre latérale. La modification a été annulée.",
};

const ptBR: Messages = {
  title: "Uso do plano",
  refresh: "Atualizar",
  refreshing: "Atualizando...",
  loading: "Carregando uso...",
  empty: "Sem dados de uso",
  errorTitle: "Não foi possível carregar o uso",
  retry: "Tentar novamente",
  linkLostTitle: "Recarregue o plugin",
  linkLostBody: "A sessão com o daemon do Paseo terminou. Recarregue o plugin para reconectar: o aplicativo já está atualizado.",
  stale: "Sem atualizar",
  unavailable: "Indisponível",
  error: "Erro",
  resettingNow: "redefinindo agora",
  justNow: "agora mesmo",
  days: (value) => `${value} d`,
  hours: (value) => `${value} h`,
  minutes: (value) => `${value} min`,
  resets: (duration) => `redefine em ${duration}`,
  resetsAt: (clock) => `redefine às ${clock}`,
  runsOut: (duration) => `esgota em ${duration}`,
  ago: (duration) => `há ${duration}`,
  updated: (relative) => `Atualizado ${relative}`,
  balanceLeft: (amount) => `${amount} restante`,
  windowFiveHour: "Sessão de 5 h",
  windowWeekly: "Esta semana",
  windowDaily: "Hoje",
  windowMonthly: "Este mês",
  windowScoped: (base, scope) => `${base} (${scope})`,
  showInSidebar: "Mostrar na barra lateral",
  hideFromSidebar: "Remover da barra lateral",
  sidebarEmpty: "Nada fixado na barra lateral",
  sidebarOrder: "Ordem da barra lateral",
  moveUp: "Mover para cima",
  moveDown: "Mover para baixo",
  reorder: "Arraste para reordenar",
  pinSaveFailed: "Não foi possível salvar a disposição da barra lateral. A alteração foi desfeita.",
};

const ru: Messages = {
  title: "Использование тарифа",
  refresh: "Обновить",
  refreshing: "Обновление...",
  loading: "Загрузка данных...",
  empty: "Нет данных об использовании",
  errorTitle: "Не удалось загрузить данные",
  retry: "Повторить",
  linkLostTitle: "Перезагрузите плагин",
  linkLostBody: "Сессия с демоном Paseo завершена. Перезагрузите плагин, чтобы восстановить связь: само приложение обновлять не нужно.",
  stale: "Не обновляется",
  unavailable: "Недоступно",
  error: "Ошибка",
  resettingNow: "сброс сейчас",
  justNow: "только что",
  days: (value) => `${value} д`,
  hours: (value) => `${value} ч`,
  minutes: (value) => `${value} мин`,
  resets: (duration) => `сброс через ${duration}`,
  resetsAt: (clock) => `сброс в ${clock}`,
  runsOut: (duration) => `закончится через ${duration}`,
  ago: (duration) => `${duration} назад`,
  updated: (relative) => `Обновлено ${relative}`,
  balanceLeft: (amount) => `осталось ${amount}`,
  windowFiveHour: "Сессия 5 ч",
  windowWeekly: "Эта неделя",
  windowDaily: "Сегодня",
  windowMonthly: "Этот месяц",
  windowScoped: (base, scope) => `${base} (${scope})`,
  showInSidebar: "Показать на боковой панели",
  hideFromSidebar: "Убрать с боковой панели",
  sidebarEmpty: "На боковой панели ничего не закреплено",
  sidebarOrder: "Порядок в боковой панели",
  moveUp: "Вверх",
  moveDown: "Вниз",
  reorder: "Перетащите, чтобы изменить порядок",
  pinSaveFailed: "Не удалось сохранить расположение на боковой панели. Изменение отменено.",
};

const ar: Messages = {
  title: "استخدام الخطة",
  refresh: "تحديث",
  refreshing: "جارٍ التحديث...",
  loading: "جارٍ تحميل الاستخدام...",
  empty: "لا توجد بيانات استخدام",
  errorTitle: "تعذّر تحميل الاستخدام",
  retry: "حاول مرة أخرى",
  linkLostTitle: "أعد تحميل الإضافة",
  linkLostBody: "انتهت الجلسة مع خدمة Paseo. أعد تحميل الإضافة لإعادة الاتصال، فالتطبيق نفسه محدَّث.",
  stale: "متوقّف عن التحديث",
  unavailable: "غير متاح",
  error: "خطأ",
  resettingNow: "يُعاد الضبط الآن",
  justNow: "للتو",
  days: (value) => `${value} ي`,
  hours: (value) => `${value} س`,
  minutes: (value) => `${value} د`,
  resets: (duration) => `يُعاد الضبط خلال ${duration}`,
  resetsAt: (clock) => `يُعاد الضبط في ${clock}`,
  runsOut: (duration) => `ينفد خلال ${duration}`,
  ago: (duration) => `قبل ${duration}`,
  updated: (relative) => `تم التحديث ${relative}`,
  balanceLeft: (amount) => `${amount} متبقٍ`,
  windowFiveHour: "جلسة 5 ساعات",
  windowWeekly: "هذا الأسبوع",
  windowDaily: "اليوم",
  windowMonthly: "هذا الشهر",
  windowScoped: (base, scope) => `${base} (${scope})`,
  showInSidebar: "إظهار في الشريط الجانبي",
  hideFromSidebar: "إزالة من الشريط الجانبي",
  sidebarEmpty: "لا شيء مثبَّت في الشريط الجانبي",
  sidebarOrder: "ترتيب الشريط الجانبي",
  moveUp: "تحريك لأعلى",
  moveDown: "تحريك لأسفل",
  reorder: "اسحب لإعادة الترتيب",
  pinSaveFailed: "تعذّر حفظ ترتيب الشريط الجانبي. تم التراجع عن التغيير.",
};

export const MESSAGES: Record<Locale, Messages> = {
  ar,
  en,
  es,
  fr,
  ja,
  ko,
  "pt-BR": ptBR,
  ru,
  "zh-CN": zhCN,
};

export function messagesFor(locale: Locale): Messages {
  return MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
}

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}
