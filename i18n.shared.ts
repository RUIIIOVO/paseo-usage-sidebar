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
  unavailable: string;
  error: string;
  resettingNow: string;
  justNow: string;
  /** Compact duration suffixes, matching Paseo's `2d` / `3h` / `5m` shape. */
  days: (value: number) => string;
  hours: (value: number) => string;
  minutes: (value: number) => string;
  resets: (duration: string) => string;
  runsOut: (duration: string) => string;
  ago: (duration: string) => string;
  updated: (relative: string) => string;
  balanceLeft: (amount: string) => string;
};

const en: Messages = {
  title: "Plan usage",
  refresh: "Refresh",
  refreshing: "Refreshing...",
  loading: "Loading usage...",
  empty: "No usage data",
  errorTitle: "Unable to load usage",
  retry: "Try again",
  unavailable: "Unavailable",
  error: "Error",
  resettingNow: "resetting now",
  justNow: "just now",
  days: (value) => `${value}d`,
  hours: (value) => `${value}h`,
  minutes: (value) => `${value}m`,
  resets: (duration) => `resets ${duration}`,
  runsOut: (duration) => `runs out ${duration}`,
  ago: (duration) => `${duration} ago`,
  updated: (relative) => `Updated ${relative}`,
  balanceLeft: (amount) => `${amount} left`,
};

const zhCN: Messages = {
  title: "套餐用量",
  refresh: "刷新",
  refreshing: "刷新中...",
  loading: "正在加载用量...",
  empty: "暂无用量数据",
  errorTitle: "无法加载用量",
  retry: "重试",
  unavailable: "不可用",
  error: "错误",
  resettingNow: "正在重置",
  justNow: "刚刚",
  days: (value) => `${value} 天`,
  hours: (value) => `${value} 小时`,
  minutes: (value) => `${value} 分钟`,
  resets: (duration) => `${duration}后重置`,
  runsOut: (duration) => `${duration}后耗尽`,
  ago: (duration) => `${duration}前`,
  updated: (relative) => `更新于 ${relative}`,
  balanceLeft: (amount) => `剩余 ${amount}`,
};

const ja: Messages = {
  title: "プラン使用量",
  refresh: "更新",
  refreshing: "更新中...",
  loading: "使用量を読み込み中...",
  empty: "使用量データがありません",
  errorTitle: "使用量を読み込めません",
  retry: "再試行",
  unavailable: "利用不可",
  error: "エラー",
  resettingNow: "リセット中",
  justNow: "たった今",
  days: (value) => `${value}日`,
  hours: (value) => `${value}時間`,
  minutes: (value) => `${value}分`,
  resets: (duration) => `${duration}後にリセット`,
  runsOut: (duration) => `${duration}で使い切り`,
  ago: (duration) => `${duration}前`,
  updated: (relative) => `${relative}に更新`,
  balanceLeft: (amount) => `残り ${amount}`,
};

const ko: Messages = {
  title: "플랜 사용량",
  refresh: "새로고침",
  refreshing: "새로고침 중...",
  loading: "사용량 불러오는 중...",
  empty: "사용량 데이터 없음",
  errorTitle: "사용량을 불러올 수 없음",
  retry: "다시 시도",
  unavailable: "사용 불가",
  error: "오류",
  resettingNow: "초기화 중",
  justNow: "방금",
  days: (value) => `${value}일`,
  hours: (value) => `${value}시간`,
  minutes: (value) => `${value}분`,
  resets: (duration) => `${duration} 후 초기화`,
  runsOut: (duration) => `${duration} 후 소진`,
  ago: (duration) => `${duration} 전`,
  updated: (relative) => `${relative} 업데이트`,
  balanceLeft: (amount) => `${amount} 남음`,
};

const es: Messages = {
  title: "Uso del plan",
  refresh: "Actualizar",
  refreshing: "Actualizando...",
  loading: "Cargando uso...",
  empty: "Sin datos de uso",
  errorTitle: "No se pudo cargar el uso",
  retry: "Reintentar",
  unavailable: "No disponible",
  error: "Error",
  resettingNow: "restableciendo ahora",
  justNow: "ahora mismo",
  days: (value) => `${value} d`,
  hours: (value) => `${value} h`,
  minutes: (value) => `${value} min`,
  resets: (duration) => `se restablece en ${duration}`,
  runsOut: (duration) => `se agota en ${duration}`,
  ago: (duration) => `hace ${duration}`,
  updated: (relative) => `Actualizado ${relative}`,
  balanceLeft: (amount) => `${amount} restante`,
};

const fr: Messages = {
  title: "Utilisation du forfait",
  refresh: "Actualiser",
  refreshing: "Actualisation...",
  loading: "Chargement de l'utilisation...",
  empty: "Aucune donnée d'utilisation",
  errorTitle: "Impossible de charger l'utilisation",
  retry: "Réessayer",
  unavailable: "Indisponible",
  error: "Erreur",
  resettingNow: "réinitialisation en cours",
  justNow: "à l'instant",
  days: (value) => `${value} j`,
  hours: (value) => `${value} h`,
  minutes: (value) => `${value} min`,
  resets: (duration) => `réinitialisé dans ${duration}`,
  runsOut: (duration) => `épuisé dans ${duration}`,
  ago: (duration) => `il y a ${duration}`,
  updated: (relative) => `Mis à jour ${relative}`,
  balanceLeft: (amount) => `${amount} restant`,
};

const ptBR: Messages = {
  title: "Uso do plano",
  refresh: "Atualizar",
  refreshing: "Atualizando...",
  loading: "Carregando uso...",
  empty: "Sem dados de uso",
  errorTitle: "Não foi possível carregar o uso",
  retry: "Tentar novamente",
  unavailable: "Indisponível",
  error: "Erro",
  resettingNow: "redefinindo agora",
  justNow: "agora mesmo",
  days: (value) => `${value} d`,
  hours: (value) => `${value} h`,
  minutes: (value) => `${value} min`,
  resets: (duration) => `redefine em ${duration}`,
  runsOut: (duration) => `esgota em ${duration}`,
  ago: (duration) => `há ${duration}`,
  updated: (relative) => `Atualizado ${relative}`,
  balanceLeft: (amount) => `${amount} restante`,
};

const ru: Messages = {
  title: "Использование тарифа",
  refresh: "Обновить",
  refreshing: "Обновление...",
  loading: "Загрузка данных...",
  empty: "Нет данных об использовании",
  errorTitle: "Не удалось загрузить данные",
  retry: "Повторить",
  unavailable: "Недоступно",
  error: "Ошибка",
  resettingNow: "сброс сейчас",
  justNow: "только что",
  days: (value) => `${value} д`,
  hours: (value) => `${value} ч`,
  minutes: (value) => `${value} мин`,
  resets: (duration) => `сброс через ${duration}`,
  runsOut: (duration) => `закончится через ${duration}`,
  ago: (duration) => `${duration} назад`,
  updated: (relative) => `Обновлено ${relative}`,
  balanceLeft: (amount) => `осталось ${amount}`,
};

const ar: Messages = {
  title: "استخدام الخطة",
  refresh: "تحديث",
  refreshing: "جارٍ التحديث...",
  loading: "جارٍ تحميل الاستخدام...",
  empty: "لا توجد بيانات استخدام",
  errorTitle: "تعذّر تحميل الاستخدام",
  retry: "حاول مرة أخرى",
  unavailable: "غير متاح",
  error: "خطأ",
  resettingNow: "يُعاد الضبط الآن",
  justNow: "للتو",
  days: (value) => `${value} ي`,
  hours: (value) => `${value} س`,
  minutes: (value) => `${value} د`,
  resets: (duration) => `يُعاد الضبط خلال ${duration}`,
  runsOut: (duration) => `ينفد خلال ${duration}`,
  ago: (duration) => `قبل ${duration}`,
  updated: (relative) => `تم التحديث ${relative}`,
  balanceLeft: (amount) => `${amount} متبقٍ`,
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
