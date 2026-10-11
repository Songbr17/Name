// Placa de fundo da "Camada Invisível": o mesmo fundo vazio da comp principal
// (quadros 958..1526 da referência). Como a narração é mais longa que o trecho
// vazio, a placa vai e volta (ping-pong) — o fundo é só grão e cintilação de
// vinheta, sem deriva, então a inversão não aparece e não há "pulo" no loop.
// Módulo puro: usado tanto no navegador quanto no scripts/render.mjs.
export const PLATE_A = 958, PLATE_B = 1526;

export function plateFor(fi) {
  const n = PLATE_B - PLATE_A;          // 568
  const k = ((fi % (2 * n)) + 2 * n) % (2 * n);
  return k <= n ? PLATE_A + k : PLATE_B - (k - n);
}
