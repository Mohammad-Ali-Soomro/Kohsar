import 'react-native-url-polyfill/auto';

// Polyfill global DOMException only if missing. Modern Hermes (RN 0.81+) provides DOMException
// natively, so this block normally does nothing. We use a proper ES2015 class so instances
// behave like real Error subclasses and surface readable messages instead of empty errors.
if (typeof (global as any).DOMException === 'undefined') {
  class DOMExceptionPolyfill extends Error {
    constructor(message?: string, name?: string) {
      super(message || '');
      this.name = name || 'DOMException';
    }
  }
  (global as any).DOMException = DOMExceptionPolyfill;
}

// Surface unhandled JS errors and promise rejections with readable details, so empty
// "anonymous (index.ts.bundle)" entries in the dev logs become actionable.
const _ErrorUtils: any = (global as any).ErrorUtils;
if (_ErrorUtils && typeof _ErrorUtils.setGlobalHandler === 'function') {
  const previousHandler = _ErrorUtils.getGlobalHandler && _ErrorUtils.getGlobalHandler();
  _ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    try {
      const description =
        error && typeof error === 'object'
          ? `${error.name || 'Error'}: ${error.message || '(no message)'}\n${error.stack || ''}`
          : String(error);
      console.error(`[GlobalError] isFatal=${!!isFatal}\n${description}`);
    } catch {
      // Swallow logger failures
    }
    if (previousHandler) {
      previousHandler(error, isFatal);
    }
  });
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

