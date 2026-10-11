# Animação 0:39 → fim (estilo documental dark + objetos 3D)

Continuação da `Comp_Principal_editado_completo_previa_1440p.mp4` a partir do
quadro **958 (00:00:39:22)** — o primeiro quadro vazio depois do glitch de saída
da cena do celular — até o último quadro do vídeo (**1526 / 1:03.6**).

Tudo é renderizado quadro a quadro, de forma determinística, em **2560×1440 @ 24 fps**,
com o fundo original do vídeo como placa (o grão e a vinheta continuam idênticos).

## Entregáveis

| Arquivo | O que é |
|---|---|
| `render/animacao_0-39_ate_fim_1440p.mp4` | Só o trecho novo (0:39.917 → fim), com o áudio original do trecho |
| `render/comp_completa_previa_1440p.mp4` | Vídeo inteiro: original até 0:39.917 + trecho novo, com o áudio completo |

Para encaixar na timeline: o trecho novo começa em **00:00:39:22** (quadro 958).

## Roteiro visual (sincronizado palavra a palavra com a narração)

| Tempo | Narração | Visual |
|---|---|---|
| 39.92 | "E quem abriu a porta" | Cabeçalho decodifica `QUEM ABRIU A PORTA?` / `DO LADO DE DENTRO`, indicador `□□■` (3ª seção). **Porta 3D** surge do desfoque; leitor de crachá pisca e fica teal (`LIBERADO`); a porta abre com peso real (mola amortecida) e a luz vermelha vaza pelo vão (luz volumétrica + feixe no piso, até por baixo da porta antes de abrir). |
| 40.74 | "não foi um hacker" | Silhueta encapuzada no contraluz; callout `HACKER?` é riscado em "hacker" e a silhueta se desfaz em glitch. |
| 41.56 | — | Câmera atravessa a porta (motion blur real), clarão vermelho. |
| 42.12 | "foi um desenvolvedor back-end de 48 anos" | **Crachá 3D** pendurado no cordão (torção e balanço amortecidos) com caixa de transformação; ficha `IDENTIFICAÇÃO` preenche `CARGO`, `IDADE`… no tempo da fala. |
| 44.98 | "terceirizado, salário médio" | `VÍNCULO: TERCEIRIZADO`, `SALÁRIO: MÉDIO` + medidor 5/10. |
| 46.86 | "O nome dele é João Nazareno Roque" | Rótulo `NOME` fica vermelho; a tarja preta sai e o nome decodifica (na ficha e impresso no crachá), sublinhado dourado. |
| 49.02 | "ofereceram 5 mil reais" | Câmera desce; **maço de R$ 5 mil** cai com gravidade real, bate de quina e assenta; `OFERECIDOS R$ 5.000` conta de 0 a 5.000. |
| 52.10 | "5 mil reais por 813 milhões" | Câmera recua e desce: a **pilha de R$ 813 milhões** (≈ 2,1 m de maços) se revela quando as luzes acendem piscando; `DESVIADOS R$ 813.000.000` rola os dígitos em escala log. |
| 54.30 | — | Saída em glitch (mesma assinatura das transições da referência). |
| 54.62 | "Como é que 400 ordens fraudulentas…" | Grade de 400 ordens em cascata (contador 000→400), onda vermelha + `FRAUDULENTAS`. |
| 56.74 | "…entram no sistema de pagamentos brasileiro…" | As 400 ordens voam para dentro do `SPB` (caixa com alças, título `SISTEMA DE PAGAMENTOS BRASILEIRO`). |
| 59.00 | "…e são aceitas como verdadeiras?" | Varredura teal valida tudo: vermelho vira branco com ✓, `✓ ACEITAS COMO VERDADEIRAS`, `400 / 400`. |
| 60.62 | "A resposta não está no PIX." | Diagrama recua e perde o foco; a frase entra com as letras assentando uma a uma (efeito do "FOI CONTABILIDADE"), `NÃO` em vermelho, sublinhado dourado. |

## Estilo herdado da referência

- **Fontes**: JetBrains Mono Bold (títulos/rótulos), FreeMono Oblique (o itálico
  "máquina de escrever" — clone livre do Courier New), FreeMono (caixas tipo
  `BANCO CENTRAL`) e Anton (números grandes). Medidas do cabeçalho calibradas
  pixel a pixel no quadro 39.0 s do original.
- **Paleta** amostrada do vídeo: vermelho `#E04551`, vermelho escuro `#8C2526`,
  dourado `#B29165`, teal `#4E6F68`, papel `#E2E1DB`, caixas `#1C2024`.
- **Texto decodificando** (cauda de caracteres aleatórios ~1 caractere/quadro),
  caixa de transformação com alças, callouts com nó quadrado, sombras suaves.

## Por que o movimento não fica "com cara de IA"

- Curvas tipo *Easy Ease* com alta influência, e **física de verdade** onde há
  objeto: mola amortecida na porta, pêndulo/torção no crachá (cordão de 1,7 m →
  período ≈ 2,6 s), queda com g = 9,81 m/s² e micro-tremida de câmera no impacto.
- **Motion blur real** (média de sub-quadros, obturador 180°), mais forte nos
  movimentos rápidos.
- Ações sobrepostas e escalonadas (nada começa/termina junto), "câmera na mão"
  com ruído fBm de baixíssima amplitude, cintilação de lâmpada ao acender.
- Texto entra no tempo exato de cada palavra (timestamps do Whisper).

## Como renderizar

Requisitos: Node 18+, ffmpeg, Chromium do Playwright.

```bash
npm install
# prévia rápida (1 a cada 6 quadros, sem motion blur)
node scripts/render.mjs --ref /caminho/Comp_Principal_editado_completo_previa_1440p.mp4 --step 6 --samples 1
# render final + MP4s (trecho e composição completa com áudio)
node scripts/render.mjs --ref /caminho/Comp_Principal_editado_completo_previa_1440p.mp4 --workers 3 --encode
```

Opções: `--from/--to` (quadros), `--step`, `--samples N` (força N sub-quadros),
`--workers N`, `--only-encode`.

## Estrutura

```
src/
  main.js                 render de 1 quadro (sub-quadros -> acumulação -> pós)
  timeline.js             qual cena está ativa, motion blur por trecho, glitches
  core/
    config.js             tempos das palavras, paleta, fontes
    ease.js / rand.js     easings, molas, ruído determinístico
    text.js / draw.js     texto decodificando e primitivas de UI do estilo
    compositor.js         placa + 3D (HDR) + UI, bloom, glitch, grão
    three-utils.js        projeção 3D->tela (UI que acompanha os objetos)
  scenes/
    door.js               cena 3D da porta
    evidence.js           crachá, ficha, maço de R$ 5 mil, pilha de R$ 813 mi
    evidence-textures.js  texturas procedurais (cédulas estilizadas, crachá)
    orders.js             trecho 2D final (400 ordens, SPB, frase final)
scripts/
  render.mjs              renderização headless + encode
  server.mjs              servidor estático local
```

As cédulas são estilizadas (não reproduzem o desenho real do Real) e a foto do
crachá é uma silhueta genérica.
