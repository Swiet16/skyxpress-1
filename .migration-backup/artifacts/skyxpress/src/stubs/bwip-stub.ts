// Stub — bwip-js unavailable in this environment
const bwipjs = {
  toCanvas: async (_canvas: any, _opts: any) => {
    console.warn("bwip-js not available");
  },
};
export default bwipjs;
export const toCanvas = bwipjs.toCanvas;
