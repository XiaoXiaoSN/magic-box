declare module 'math-box/math_box.js' {
  const asset: string;
  export default asset;
}

declare module 'math-box/math_box_bg.wasm' {
  const asset: string;
  export default asset;
}

declare module 'base64-box/base64_box_bg.wasm' {
  const asset: string;
  export default asset;
}

declare module 'magic-box:math-box-glue-factory' {
  export function createFreshMathBoxModule(): typeof import('math-box');
}
