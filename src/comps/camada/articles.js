// Matérias REAIS reconstruídas nas janelas (0–9,8 s). Só entra texto
// verificado palavra por palavra (título, linha fina, trechos e datas). Nada
// de corpo de texto inventado: cada janela mostra apenas o recorte confirmado.
//
// Fontes:
// - Exame (Future of Money): https://exame.com/future-of-money/ataque-cm-software-atinge-contas-reserva-banco-central/
// - Corner PIX\PSTI (página da C&M): https://www.cornerspi.com.br/sobre-corner-pix/
// - Jornal Opção, 02/07/2025 15h48: https://www.jornalopcao.com.br/ultimas-noticias/bc-confirma-ataque-hacker-a-empresa-que-conecta-bancos-ao-pix-e-ao-banco-central-721870/
// - Agência Brasil (Economia), seção "Entenda o ataque": https://agenciabrasil.ebc.com.br/economia/noticia/2025-07/bc-suspende-tres-instituicoes-do-pix-apos-ataque-cibernetico
import { CW } from './words.js';

export const F = {
  inter: '"Inter"', roboto: '"Roboto"', merri: '"Merriweather"', mont: '"Montserrat"', ui: '"Open Sans"',
};

// Blocos de texto empilhados dentro da janela. Medidas em px da tela 1440p.
export const ARTICLES = [
  {
    id: 'exame', caption: '2025',
    x: 300, y: 150, w: 1640,
    pad: { l: 72, r: 80, t: 46, b: 64 },
    tIn: 0.0,
    blocks: [
      { id: 'logo', text: 'EXAME', font: F.inter, size: 66, weight: 900, lh: 70, color: '#0A0A0A', ls: -1.5 },
      { id: 'rule', rule: true, h: 2, color: '#E4E4E4', gapB: 34, gapT: 20 },
      { id: 'kicker', text: 'FUTURE OF MONEY', font: F.inter, size: 21, weight: 700, lh: 30, color: '#6B6B6B', ls: 2.5, gapB: 18 },
      { id: 'h1', text: 'Ataque contra C&M Software atinge contas reserva no Banco Central; valor pode chegar a R$ 1 bilhão',
        font: F.inter, size: 62, weight: 800, lh: 76, color: '#111111', ls: -0.8, gapB: 26 },
      { id: 'deck', text: 'Empresa responsável por ligar instituições financeiras ao BC foi alvo de hackers, que converteram fundos roubados em criptomoedas.',
        font: F.inter, size: 33, weight: 400, lh: 48, color: '#4A4A4A', gapB: 40 },
      { id: 'body', text: 'Informações obtidas pelo site Cointelegraph apontam que o valor roubado pelos hackers pode chegar a R$ 1 bilhão, enquanto apuração do Valor Econômico indica uma perda de ao menos R$ 400 milhões.',
        font: F.roboto, size: 32, weight: 400, lh: 50, color: '#222222' },
    ],
    marks: [
      // "tradutoras" -> a empresa que liga as instituições ao BC
      { block: 'deck', phrase: 'Empresa responsável por ligar instituições financeiras ao BC', t0: CW.tradutoras + 0.04, t1: CW.se_chama + 0.20 },
      // "se chama C&M Software"
      { block: 'h1', phrase: 'C&M Software', t0: CW.cm1 + 0.02, t1: CW.software + 0.02 },
    ],
  },
  {
    id: 'corner', caption: 'cornerspi.com.br',
    x: 820, y: 430, w: 1380,
    pad: { l: 70, r: 80, t: 58, b: 74 },
    tIn: 3.04,
    blocks: [
      { id: 'h1', text: 'O Corner PIX\\PSTI é uma plataforma do PSTI da C&M Software',
        font: F.mont, size: 80, weight: 800, lh: 100, color: '#141B26', ls: -1 },
    ],
    marks: [
      { block: 'h1', phrase: 'C&M Software', t0: CW.cm2 + 0.02, t1: CW.desenvolveu + 0.06 },
      { block: 'h1', phrase: 'plataforma', t0: CW.plataforma + 0.02, t1: CW.chamada + 0.04 },
      { block: 'h1', phrase: 'Corner PIX\\PSTI', t0: CW.corner + 0.02, t1: CW.corner_end - 0.04 },
    ],
  },
  {
    id: 'opcao', caption: '2025',
    x: 420, y: 720, w: 1520,
    pad: { l: 72, r: 80, t: 44, b: 62 },
    tIn: 5.80,
    blocks: [
      { id: 'logo', text: 'Jornal Opção', font: F.merri, size: 50, weight: 900, lh: 62, color: '#151515', ls: -0.5 },
      { id: 'rule', rule: true, h: 2, color: '#E2E2E2', gapB: 30, gapT: 18 },
      { id: 'h1', text: 'BC confirma ataque hacker à empresa que conecta bancos ao PIX e ao Banco Central',
        font: F.merri, size: 56, weight: 700, lh: 78, color: '#111111', gapB: 22 },
      { id: 'meta', text: '02 julho 2025 às 15h48', font: F.roboto, size: 26, weight: 400, lh: 34, color: '#707070' },
    ],
    marks: [
      { block: 'h1', phrase: 'conecta bancos ao PIX e ao Banco Central', t0: CW.conectava + 0.02, t1: CW.dezenas + 0.30 },
    ],
  },
  {
    id: 'abr', caption: '2025',
    x: 980, y: 600, w: 1650,
    pad: { l: 74, r: 84, t: 44, b: 70 },
    tIn: 7.08,
    blocks: [
      { id: 'logo', text: 'Agência Brasil', font: F.roboto, size: 48, weight: 700, lh: 58, color: '#1B1B1B', ls: -0.5 },
      { id: 'rule', rule: true, h: 2, color: '#E3E3E3', gapB: 28, gapT: 18 },
      { id: 'kicker', text: 'ECONOMIA', font: F.roboto, size: 22, weight: 700, lh: 30, color: '#6E6E6E', ls: 2.5, gapB: 16 },
      { id: 'h1', text: 'BC suspende três instituições do Pix após ataque cibernético',
        font: F.roboto, size: 60, weight: 700, lh: 72, color: '#111111', ls: -0.5, gapB: 40 },
      { id: 'sub', text: 'Entenda o ataque', font: F.roboto, size: 40, weight: 700, lh: 52, color: '#151515', gapB: 16 },
      { id: 'body', text: 'Embora não opere transações financeiras, a C&M conecta várias instituições financeiras ao Sistema de Pagamentos Brasileiro (SPB), operado pelo Banco Central.',
        font: F.roboto, size: 38, weight: 400, lh: 60, color: '#202020' },
    ],
    marks: [
      { block: 'body', phrase: 'a C&M conecta várias instituições financeiras', t0: CW.instituicoes - 0.06, t1: CW.ao - 0.04 },
      { block: 'body', phrase: 'ao Sistema de Pagamentos Brasileiro (SPB)', t0: CW.ao + 0.02, t1: CW.pagamentos_end - 0.02 },
    ],
  },
];
