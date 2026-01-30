// 平台检测工具
export const isCapacitor = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })?.Capacitor?.isNativePlatform?.();
};

export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isMacCatalyst = (): boolean => {
  if (typeof window === 'undefined') return false;
  return navigator.userAgent.includes('Macintosh') && 'ontouchend' in document;
};

export const getPlatform = (): 'ios' | 'web' | 'mac-catalyst' => {
  if (isMacCatalyst()) return 'mac-catalyst';
  if (isCapacitor() && isIOS()) return 'ios';
  return 'web';
};
