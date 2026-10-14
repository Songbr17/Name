# Animações no estilo documental dark (+ objetos 3D)

Este repositório renderiza três composições no mesmo motor:

- **Comp Principal, 0:39 → fim** (seção abaixo).
- **Comp - Camada Invisível** (41,9 s), com matérias reais nas janelas, trecho 2D e cenas 3D
  (veja [Camada Invisível](#comp---camada-invisível-419-s)).
- **CTA (apoia.se/flux)** (33,6 s), chamada para apoiar o canal, em 2D
  (veja [CTA](#cta-apoiaseflux-336-s)).

---

## Comp Principal: 0:39 → fim

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
| 49.02 | "ofereceram 5 mil reais" | Tilt rápido da câmera "perseguindo" o **maço de R$ 5 mil**, que cai com gravidade real, bate de quina e assenta (micro-tremida no impacto); `OFERECIDOS R$ 5.000` conta de 0 a 5.000. |
| 52.10 | "5 mil reais por 813 milhões" | Câmera recua e desce: a **pilha de R$ 813 milhões** (≈ 2,1 m de maços) se revela quando as luzes acendem piscando; `DESVIADOS R$ 813.000.000` rola os dígitos em escala log, ligado à pilha por uma linha guia que sai da aresta do bloco e se funde ao sublinhado vermelho do rótulo. |
| 54.30 | — | Saída em glitch (mesma assinatura das transições da referência). |
| 54.62 | "Como é que 400 ordens fraudulentas…" | Grade de 400 ordens em cascata (contador 000→400), onda vermelha + `FRAUDULENTAS`. |
| 56.74 | "…entram no sistema de pagamentos brasileiro…" | As 400 ordens entram no `SPB` coluna por coluna: cada coluna desliza em linha reta com o mesmo *easy ease*, defasada 2 quadros da vizinha (como layers com keyframes escalonados no After Effects). |
| 59.00 | "…e são aceitas como verdadeiras?" | Varredura teal valida tudo: vermelho vira branco com ✓, `✓ ACEITAS COMO VERDADEIRAS`, `400 / 400`. |
| 60.62 | "A resposta não está no PIX." | Diagrama recua e perde o foco; a frase entra com as letras assentando uma a uma (efeito do "FOI CONTABILIDADE"), `NÃO` em vermelho, sublinhado dourado. |

## Comp - Camada Invisível (41,9 s)

Vídeo feito para o áudio `Comp - Camada Invisível.mp3`, sobre o **mesmo fundo** da comp
principal (a placa vazia 958–1526 da referência, tocada em vai e volta para cobrir os 41,9 s;
o fundo é só grão e cintilação, então a inversão não aparece).

| Arquivo | O que é |
|---|---|
| `render/camada_invisivel_1440p.mp4` | 2560×1440, 24 fps, 0 → 41,875 s, com a narração |

### Roteiro visual

| Tempo | Narração | Visual |
|---|---|---|
| 0,0 | "Uma dessas tradutoras se chama C&M Software." | Janela (vidro cinza, como as referências) com a matéria da **Exame**: a marcação vermelha passa por "Empresa responsável por ligar instituições financeiras ao BC" em "tradutoras" e por "C&M Software" no título. |
| 3,0 | "A C&M desenvolveu uma plataforma chamada Corner," | Nova janela com o título da página da C&M **"O Corner PIX\PSTI é uma plataforma do PSTI da C&M Software"**; a marcação acompanha "C&M", "plataforma" e "Corner". |
| 5,8 | "que conectava dezenas de instituições financeiras…" | **Jornal Opção** (02/07/2025, 15h48): "…empresa que conecta bancos ao PIX e ao Banco Central". |
| 7,1 | "…ao sistema de pagamentos." | **Agência Brasil**, seção "Entenda o ataque": "Embora não opere transações financeiras, a C&M conecta várias instituições financeiras ao Sistema de Pagamentos Brasileiro (SPB), operado pelo Banco Central." A marcação segue a fala em duas partes. |
| 9,8 | "E para conseguir assinar ordens em nome dessas instituições," | Glitch → diagrama 2D: instituições → **C&M SOFTWARE / CORNER** → **SPB**. Cada ordem chega por um conector, é assinada dentro da C&M "EM NOME DE: INSTITUIÇÃO 0X" e segue para o SPB (o mesmo ciclo defasado no tempo). |
| 12,8 | "ela precisava guardar uma coisa." | A câmera entra no painel da C&M, que vira um cofre (cadeado, borda vermelha) com uma vaga "?". |
| 14,9 | "Os certificados digitais e as chaves privadas de cada cliente." | A vaga se divide: **CERTIFICADO DIGITAL** (papel, selo) e **CHAVE PRIVADA** (PEM decodificando). Em "cada cliente", a dupla se repete para cada instituição. |
| 18,8 | "Pensa no que isso significa fisicamente." | Itálico de máquina de escrever, com **FISICAMENTE.** em vermelho. Depois, glitch → 3D. |
| 20,4 | "É como se uma única empresa guardasse na mesma sala…" | **3D**: uma mesa no escuro e a luminária que acende piscando. A sala é marcada por uma caixa de transformação em 3D (arestas crescendo dos cantos), com o rótulo **MESMA SALA**. |
| 24,1 | "…o carimbo oficial de dezenas de bancos diferentes." | A câmera entra: são 24 carimbos de madeira, cada um com o seu banco. Aparecem o callout **CARIMBO OFICIAL**, colchetes em onda em cada carimbo e "DEZENAS DE BANCOS DIFERENTES". |
| 27,0 | "Não uma cópia," | Surge uma "cópia" (holograma), com a etiqueta **CÓPIA** riscada; ela se desfaz em glitch. |
| 28,0 | "o carimbo que vale." | O carimbo verdadeiro é levantado, viaja até a ordem de pagamento e **bate no "vale"** (borracha comprime, câmera treme). Ao subir, revela a impressão **VÁLIDO**. |
| 29,2 | "E a maior cliente da C&M era a BMP Money Plus," | Cabeçalho muda (□■□ "O MAIOR CLIENTE"). A grua sai da sala, que vira a caixa **C&M SOFTWARE**, e segue o cabo vermelho até a plataforma **BMP MONEY PLUS**. |
| 32,8 | "uma provedora de Banking as a Service," | **BANKING AS A SERVICE**; a grade da infraestrutura varre o topo da plataforma. |
| 36,6 | "…92 fintechs, 210 fundos de investimento e centenas de outras empresas." | Sobem em onda **92** blocos teal (fintechs), **210** dourados (fundos) e centenas de cinzas (outras empresas). A câmera abre no fim. |

### Movimento

- Janelas: pop curto de escala (mola bem amortecida) e opacidade de 3 quadros. A câmera é um
  "null" 2D com *easy ease* entre os enquadramentos, e as janelas antigas escurecem quando
  chega uma nova. A marcação vermelha cresce da esquerda para a direita, linha por linha, em
  velocidade constante, como uma máscara animada.
- Ordens do diagrama: o mesmo ciclo (chega, é assinada, sai para o SPB), defasado no tempo.
- 3D: câmera contínua por spline (sem "para e anda"), com paradas suaves só onde a fala pede.
  O carimbo inclina pela aceleração, como se fosse segurado na mão, a borracha comprime no
  impacto e a câmera treme de leve. Os blocos sobem em onda com uma mola de leve overshoot.
- **Motion blur adaptativo**: em cada quadro, mede-se quanto os elementos andam na tela durante
  o obturador (180°), e o número de sub-quadros (2 a 24) acompanha essa distância. O rastro
  fica contínuo, sem as "cópias" escalonadas. Com muitos sub-quadros, cada um desloca a câmera
  por uma fração de pixel (Halton) e a acumulação faz o antisserrilhado no lugar do MSAA.

### Fontes das matérias (0–9,8 s)

Só entra texto confirmado palavra por palavra. As janelas mostram um recorte de cada
matéria (título, linha fina, trecho e data quando verificada); nada de corpo de texto inventado.

- Exame (Future of Money): <https://exame.com/future-of-money/ataque-cm-software-atinge-contas-reserva-banco-central/>
- Página do Corner PIX\PSTI (C&M Software): <https://www.cornerspi.com.br/sobre-corner-pix/>
- Jornal Opção, 02/07/2025 15h48: <https://www.jornalopcao.com.br/ultimas-noticias/bc-confirma-ataque-hacker-a-empresa-que-conecta-bancos-ao-pix-e-ao-banco-central-721870/>
- Agência Brasil (Economia): <https://agenciabrasil.ebc.com.br/economia/noticia/2025-07/bc-suspende-tres-instituicoes-do-pix-apos-ataque-cibernetico>

As marcas dos veículos aparecem como texto simples (sem logotipos). Os carimbos e os
blocos são ilustrativos; os rótulos "BANCO 01…24" e "INSTITUIÇÃO 01…" são
genéricos e não representam instituições reais.

### Como renderizar

```bash
node scripts/render.mjs --comp camada --ref /caminho/Comp_Principal_editado_completo_previa_1440p.mp4 \
  --audio "/caminho/Comp - Camada Invisível.mp3" --workers 2 --encode
```

O render leva cerca de 1h30 em 4 núcleos de CPU (WebGL por software). Ele é retomável,
e `--list 120,480,900` renderiza só alguns quadros.

## CTA apoia.se/flux (33,6 s)

Chamada para apoiar o canal no Apoia.se, feita para o áudio `CTA.mp3`, toda em 2D sobre o
mesmo fundo. Arquivo: `render/cta_apoiase_1440p.mp4` (2560×1440, 24 fps, com a narração).

**Conceito.** A história pausa antes da madrugada do dia 30, e o Flux se investiga como se
fosse um caso: a câmera viaja por um quadro de investigação, estação por estação, seguindo
um fio vermelho. Entre uma estação e outra, ela dá um respiro de zoom e mostra o quadro. Uma
**contagem regressiva de 30 s** começa em "30 segundos" e zera exatamente no "agradeço".

| Tempo | Narração | Visual |
|---|---|---|
| 0,0 | "Antes da madrugada do dia 30, 30 segundos." | Linha do tempo do vídeo: a cabeça de leitura para logo antes do marcador **MADRUGADA DO DIA 30** (‖ PAUSADO). O relógio **00:30** surge grande e voa para o canto, onde fica contando. |
| 3,4 | "O Flux é uma pessoa só." | **FLUX_** se monta letra a letra, com a caixa de seleção de alças vermelhas do banner do canal; depois **= 1 PESSOA SÓ.** |
| 5,2 | "Sem equipe, sem estúdio, sem produtora." | **SEM** EQUIPE. / **SEM** ESTÚDIO. / **SEM** PRODUTORA., no itálico de máquina de escrever, com o "SEM" em vermelho, como na referência. |
| 7,9 | "Cada caso… escolhido, investigado e montado por mim." | Fichas chegam e empilham. Na ficha do **CASO**, os ✓ entram em ESCOLHIDO, INVESTIGADO e MONTADO; em "por mim" vêm a assinatura e o **carimbo FLUX**. |
| 12,0 | "E o meu objetivo é simples: fazer cada vídeo melhor que o anterior." | Quatro vídeos em escada, cada um mais rico que o anterior; o **PRÓXIMO** ganha a caixa de seleção, sob a seta dourada **MELHOR QUE O ANTERIOR.** |
| 15,8 | "Animação mais elaborada, som mais trabalhado, investigação mais completa." | Medidores de 10 segmentos: em cada palavra, a metade que falta acende em vermelho (MAIS ELABORADA / TRABALHADO / COMPLETA). |
| 20,0 | "Se esse vídeo está valendo seu tempo, você pode me ajudar a chegar lá." | O relógio do canto pulsa em "seu tempo". O cursor do espectador entra e aponta a **META** (os segmentos novos). |
| 23,3 | "É só entrar em apoia.se/flux." | Navegador: clique na barra de endereço, zoom, e **apoia.se/flux** digitado no tempo da fala; Enter carrega a página da campanha. |
| 26,1 | "O link também está na descrição." | Selo **LINK NA DESCRIÇÃO ↓**, com a seta quicando. |
| 27,8 | "Qualquer valor ajuda." | O cursor clica em **Apoiar com R$ 5 ou +** e as recompensas (R$ 5 / R$ 15 / R$ 30) abrem em leque. |
| 29,1 | "E quem apoia aparece nos créditos dos próximos vídeos." | A recompensa **Nos créditos** se destaca e a câmera vai para os créditos (**APOIADORES**, nomes tarjados rolando), onde **SEU NOME AQUI** acende em dourado. |
| 32,1 | "Desde já, agradeço." | O relógio volta ao centro e zera em **00:00** no "agradeço", seguido de **OBRIGADO.**, o avatar F_ e apoia.se/flux. Glitch de saída para voltar à história. |

A página da campanha foi reconstruída a partir das capturas da própria campanha (textos e
recompensas iguais aos da página). Os contadores "0 apoiadores" e a aba "Rascunhos", que só
aparecem para o dono, ficaram de fora.

```bash
node scripts/render.mjs --comp cta --ref /caminho/Comp_Principal_editado_completo_previa_1440p.mp4 \
  --audio /caminho/CTA.mp3 --workers 2 --encode
```

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
- **Motion blur real** (média de sub-quadros, obturador 180°): 2 sub-quadros nos
  trechos calmos e até 20–24 na travessia da porta, na queda do maço e no voo
  das 400 ordens (rastro contínuo, sem "cópias").
- Texto decodificando e contadores mudam **uma vez por quadro** (como no After
  Effects); só o que se move recebe blur.
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
`--workers N`, `--frames-dir`, `--force` (refaz quadros já prontos — sem ele o
render é retomável), `--only-encode`. O render completo leva ~25 min em 4 núcleos
de CPU (WebGL por software).

## Estrutura

```
src/
  main.js                 render de 1 quadro (sub-quadros -> acumulação -> pós); ?comp=camada
  timeline.js             (comp principal) cena ativa, motion blur por trecho, glitches
  comps/camada/           "Camada Invisível": words.js (tempos), plate.js (fundo em vai e
                          volta), articles.js (matérias verificadas + fontes), windows.js,
                          digital.js (2D), world.js + world-textures.js (3D), timeline.js
  comps/cta/              CTA: words.js (tempos), apoiase.js (página da campanha, navegador,
                          cursor, recompensas), board.js (estações + câmera + relógio), timeline.js
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
