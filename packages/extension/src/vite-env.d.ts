/// <reference types="vite/client" />

declare module '*?script&url' {
  const src: string;
  export default src;
}

declare const __IRIS_VERSION__: string;
declare const __IRIS_GIT_SHA__: string;
