// CTA (chamada para apoiar no Apoia.se), 33,567 s. Início de cada palavra da
// narração (Whisper, word timestamps), em segundos da comp.
export const DURATION = 33.567;
export const LAST_FRAME = 805;

export const AW = {
  // "Antes da madrugada do dia 30, 30 segundos."
  antes: 0.00, madrugada: 0.44, dia: 1.06, n30: 1.20, n30_end: 1.70, s30: 2.06, segundos: 2.34, segundos_end: 2.86,
  // "O Flux é uma pessoa só."
  o_flux: 3.40, flux: 3.52, e: 3.96, uma: 4.04, pessoa: 4.16, so: 4.52, so_end: 4.86,
  // "Sem equipe, sem estúdio, sem produtora."
  sem1: 5.20, equipe: 5.34, sem2: 6.06, estudio: 6.16, sem3: 6.88, produtora: 6.98, produtora_end: 7.56,
  // "Cada caso que chega ao canal foi escolhido, investigado e montado por mim."
  cada: 7.86, caso: 8.02, canal: 8.80, escolhido: 9.26, investigado: 10.12, montado: 10.90, por_mim: 11.30, mim_end: 11.76,
  // "E o meu objetivo é simples:"
  objetivo: 12.20, simples: 12.80, simples_end: 13.18,
  // "fazer cada vídeo melhor que o anterior."
  fazer: 13.54, video: 14.06, melhor: 14.48, anterior: 15.08, anterior_end: 15.26,
  // "Animação mais elaborada, som mais trabalhado, investigação mais completa."
  animacao: 15.84, elaborada: 16.34, som: 17.20, trabalhado: 17.52, investigacao: 18.30, completa: 19.14, completa_end: 19.50,
  // "Se esse vídeo está valendo seu tempo,"
  se_esse: 19.98, valendo: 20.66, seu_tempo: 20.96, tempo: 21.18, tempo_end: 21.58,
  // "você pode me ajudar a chegar lá."
  voce: 21.74, ajudar: 22.26, chegar: 22.64, la: 22.80, la_end: 23.14,
  // "É só entrar em apoia.se/flux."
  entrar: 23.56, apoia: 24.02, ponto_se: 24.44, barra_flux: 25.04, flux_end: 25.82,
  // "O link também está na descrição."
  link: 26.10, descricao: 27.04, descricao_end: 27.46,
  // "Qualquer valor ajuda."
  qualquer: 27.80, valor: 28.18, ajuda: 28.40, ajuda_end: 28.88,
  // "E quem apoia aparece nos créditos dos próximos vídeos."
  quem_apoia: 29.10, aparece: 29.70, creditos: 30.34, proximos: 31.00, videos_end: 31.74,
  // "Desde já, agradeço."
  desde: 32.08, ja: 32.26, agradeco: 32.84, agradeco_end: 33.36,
};

// A contagem regressiva de 30 s começa no fim de "30 segundos" e zera no
// "agradeço" (2,86 + 30 = 32,86).
export const COUNT = { t0: 2.86, t1: 32.86 };
