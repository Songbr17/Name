#!/usr/bin/env node
// Renderiza a animação quadro a quadro no Chromium headless e (opcionalmente)
// codifica o vídeo final com o ffmpeg.
//
// Uso:
//   node scripts/render.mjs --ref /caminho/Comp_Principal_editado_completo_previa_1440p.mp4 [opções]
// Opções:
//   --from N --to N     intervalo de quadros (padrão: 958..1526, i.e. 0:39.917 até o fim)
//   --step N            renderiza 1 a cada N quadros (prévia rápida)
//   --workers N         instâncias paralelas do navegador (padrão 2)
//   --samples N         força N sub-quadros de motion blur (padrão: definido na timeline)
//   --encode            ao final, gera os MP4 (trecho + composição completa com áudio)
//   --only-encode       só codifica (quadros já renderizados)
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from './server.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const flag = (name) => args.includes('--' + name);

const START = 958, END = 1526;
const from = +opt('from', START), to = +opt('to', END), step = +opt('step', 1);
const workers = +opt('workers', 2);
const samples = opt('samples', null);
const ref = opt('ref', process.env.REF_VIDEO || path.join(ROOT, 'ref', 'referencia.mp4'));
const outDir = path.join(ROOT, 'out');
const plateDir = path.join(outDir, 'plate');
const frameDir = path.join(outDir, opt('frames-dir', 'frames'));
fs.mkdirSync(plateDir, { recursive: true });
fs.mkdirSync(frameDir, { recursive: true });

const pad = (n) => String(n).padStart(4, '0');

function ensurePlates(list) {
  const missing = list.filter((n) => !fs.existsSync(path.join(plateDir, pad(n) + '.jpg')));
  if (!missing.length) return;
  if (!fs.existsSync(ref)) throw new Error(`vídeo de referência não encontrado: ${ref} (use --ref)`);
  const lo = Math.min(...missing), hi = Math.max(...missing);
  console.log(`extraindo placas de fundo ${lo}..${hi} de ${ref}`);
  const tmp = path.join(outDir, 'plate_tmp');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', ref, '-vf', `select='between(n\\,${lo}\\,${hi})'`, '-vsync', '0', '-q:v', '1', '-qmin', '1', '-start_number', String(lo), path.join(tmp, '%04d.jpg')], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg falhou ao extrair placas');
  for (const f of fs.readdirSync(tmp)) fs.renameSync(path.join(tmp, f), path.join(plateDir, f));
  fs.rmSync(tmp, { recursive: true, force: true });
}

async function renderRange(list, port, id) {
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-rasterization', '--disable-accelerated-2d-canvas', '--force-color-profile=srgb'],
  });
  const page = await browser.newPage({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1 });
  page.on('console', (m) => { const s = m.text(); if (!/GPU stall|GroupMarkerNotSet|fallback to software/.test(s)) console.log(`[w${id}]`, s); });
  page.on('pageerror', (e) => console.log(`[w${id}] pageerror:`, e.message));
  await page.goto(`http://127.0.0.1:${port}/src/index.html`);
  await page.waitForFunction(() => window.ready === true || window.bootError, null, { timeout: 120000 });
  const err = await page.evaluate(() => window.bootError);
  if (err) throw new Error(err);
  for (const n of list) {
    const t0 = Date.now();
    const N = await page.evaluate(([fi, s, pr]) => window.renderFrame(fi, { ...(s ? { samples: +s } : {}), profile: pr }), [n, samples, flag('profile')]);
    const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 2560, height: 1440 } });
    fs.writeFileSync(path.join(frameDir, pad(n) + '.png'), buf);
    console.log(`[w${id}] quadro ${n} (${(n / 24).toFixed(3)}s) N=${N} ${Date.now() - t0}ms`);
  }
  await browser.close();
}

function encode() {
  const seg = path.join(ROOT, 'render', 'animacao_0-39_ate_fim_1440p.mp4');
  const full = path.join(ROOT, 'render', 'comp_completa_previa_1440p.mp4');
  fs.mkdirSync(path.dirname(seg), { recursive: true });
  const startT = (START / 24).toFixed(6);
  console.log('codificando trecho novo ->', seg);
  let r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '24', '-start_number', String(START), '-i', path.join(frameDir, '%04d.png'),
    '-ss', startT, '-i', ref, '-map', '0:v', '-map', '1:a?', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(opt('crf', 17)), '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-level', '5.1', '-x264-params', 'keyint=48', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', seg], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('falha ao codificar trecho');
  console.log('codificando composição completa ->', full);
  r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', ref, '-framerate', '24', '-start_number', String(START), '-i', path.join(frameDir, '%04d.png'),
    '-filter_complex', `[0:v]trim=end_frame=${START},setpts=PTS-STARTPTS,format=yuv420p[a];[1:v]format=yuv420p,setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0[v]`,
    '-map', '[v]', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(opt('crf-full', 20)), '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-level', '5.1', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', full], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('falha ao codificar composição');
}

async function main() {
  if (!flag('only-encode')) {
    const list = [];
    for (let n = from; n <= to; n += step) list.push(n);
    ensurePlates(list);
    const server = await serve(ROOT);
    const port = server.address().port;
    const chunks = Array.from({ length: workers }, () => []);
    list.forEach((n, i) => chunks[i % workers].push(n));
    const t0 = Date.now();
    await Promise.all(chunks.filter((c) => c.length).map((c, i) => renderRange(c, port, i)));
    console.log(`render concluído em ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    server.close();
  }
  if (flag('encode') || flag('only-encode')) encode();
}

main().catch((e) => { console.error(e); process.exit(1); });
