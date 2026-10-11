// Configuração global do trecho 0:39 -> fim.
// Todos os tempos estão em segundos ABSOLUTOS do vídeo de referência
// (Comp_Principal_editado_completo_previa_1440p.mp4), para casar com a narração.

export const W = 2560;
export const H = 1440;
export const FPS = 24;

// Primeiro quadro vazio depois do glitch de saída da cena do celular (39.917s = 00:00:39:22).
export const START_FRAME = 958;
// Último quadro do vídeo (1527 quadros no total).
export const END_FRAME = 1526;

// Tempos (início, fim) de cada palavra da narração — extraídos com Whisper (word timestamps).
export const WORDS = {
  e_quem: 39.92, abriu: 40.10, porta: 40.44, porta_end: 40.74,
  nao_foi: 40.74, hacker: 41.32, hacker_end: 41.60,
  foi_um: 41.86, desenvolvedor: 42.12, backend: 42.74, backend_end: 43.34,
  de: 43.34, n48: 43.52, anos: 44.18, anos_end: 44.68,
  terceirizado: 44.98, terceirizado_end: 45.68,
  salario: 45.98, medio: 46.22, medio_end: 46.64,
  o_nome: 46.86, joao: 47.62, nazareno: 47.90, roque: 48.52, roque_end: 48.84,
  ofereceram: 49.02, cinco: 49.72, mil: 50.14, reais: 50.42, reais_end: 50.84,
  cinco2: 51.10, por: 52.10, n813: 52.38, milhoes: 53.30, milhoes_end: 54.02,
  como: 54.62, n400: 54.94, ordens: 55.28, fraudulentas: 56.04, fraudulentas_end: 56.74,
  entram: 56.74, sistema: 57.22, pagamentos: 57.68, brasileiro: 58.06, brasileiro_end: 58.68,
  aceitas: 59.00, verdadeiras: 59.64, verdadeiras_end: 60.28,
  a_resposta: 60.62, nao: 61.08, esta: 61.58, no: 61.88, pix: 62.02, pix_end: 62.34,
};

// Paleta amostrada da referência (sRGB).
export const PAL = {
  title: '#C2C4C4',        // título do cabeçalho
  subtitle: '#5E6060',     // subtítulo do cabeçalho (tracking largo)
  hudLine: '#3E4040',      // linha horizontal do cabeçalho
  bracket: '#3A3B3B',      // cantoneiras inferiores
  hudRed: '#8C2526',       // quadrado vermelho do cabeçalho / indicador
  white: '#EEF0F0',        // texto branco principal
  offWhite: '#D9DBDB',
  red: '#E04551',          // "SEM", "FALTA DINHEIRO"
  redBox: '#D63E4B',       // bordas de caixas vermelhas
  redNode: '#AF3A3A',      // nós das linhas de rede
  redDeep: '#911E2B',      // faixa vermelha do papel
  gold: '#B29165',         // sublinhado dourado
  goldDim: '#81735A',      // chevrons
  teal: '#4E6F68',         // conectores "saudáveis"
  tealBright: '#8FC9BA',
  boxFill: '#1C2024',      // preenchimento das caixas escuras
  boxStroke: '#8A8D91',
  frame: '#AEB0B2',        // linhas da caixa de transformação
  light: '#AEB2B6',        // caixa clara (CAPITAL PRÓPRIO)
  paper: '#E2E1DB',
  gray: '#7D8083',
  grayDim: '#4A4D50',
};

export const FONTS = {
  mono: '"JBMono"',          // JetBrains Mono (títulos, labels)
  typeIt: '"FreeMonoOb"',    // FreeMono Oblique (itálico máquina de escrever)
  type: '"FreeMono"',        // FreeMono (caixas "BANCO CENTRAL")
  big: '"Anton"',            // números grandes
};

export const sec2frame = (s) => Math.round(s * FPS);
export const frame2sec = (f) => f / FPS;
