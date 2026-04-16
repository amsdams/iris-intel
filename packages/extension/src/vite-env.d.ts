/// <reference types="vite/client" />

declare module '*?script&url' {
  const src: string;
  export default src;
}

declare const __IRIS_VERSION__: string;
declare const __IRIS_GIT_SHA__: string;

interface RequestInit {
  /** Custom property used by IRIS to distinguish internal fetches from Intel-native ones. */
  _iris_active?: boolean;
}
