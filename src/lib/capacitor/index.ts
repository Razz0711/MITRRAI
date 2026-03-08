/**
 * Capacitor module barrel export
 */
export { isNativePlatform, getPlatform, isAndroid, isIOS } from './platform';
export {
  registerNativePush,
  onNativePushReceived,
  onNativePushAction,
  removeAllNativePushListeners,
} from './native-push';
