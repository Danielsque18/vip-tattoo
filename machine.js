// 3D тату-машинка (беспроводная роторная «ручка») из шести деталей. Модель собрана в коде, без файлов.
// Прокрутка первого экрана (window.VIP.p из main.js): покой → машинка разбирается в воздухе (детали разлетаются,
// к ним тянутся подписи) → собирается → встаёт иглой вниз → камера ныряет к игле. Машинку можно крутить пальцем.
// Сюда же отдаём экранные точки деталей (подписи), кончик иглы (портал) и рамку машинки (проверка наложений).
import * as THREE from 'three';
import { RoomEnvironment } from './lib/RoomEnvironment.js';

const canvas = document.getElementById('gl');
const hero = document.getElementById('hero');
const drag = document.getElementById('drag');
const root = document.documentElement;
window.VIP = window.VIP || { p: 0 };

// телефон/планшет: меньше полигонов и разрешение, без сглаживания на плотных экранах
const coarse = matchMedia('(pointer: coarse)').matches || innerWidth <= 760;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse || devicePixelRatio < 2, alpha: true, powerPreference: 'high-performance' });
} catch (e) { root.classList.add('no-3d'); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.6 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
const SEG = coarse ? 72 : 144;

const scene = new THREE.Scene();
// студия для отражений: светло-серая комната + две длинные вертикальные лампы и потолочная панель —
// на глянцевом корпусе они дают чёткие белые полосы по всей длине, как на предметной съёмке
function studioEnv() {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x9c9a97);
  const lamp = (w, h, d, x, y, z, k) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(k) }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  lamp(1.2, 18, .2, -4.2, 0, 8, 7);
  lamp(0.6, 18, .2, 6.5, 0, 4, 4);
  lamp(10, .2, 6, 0, 9, 0, 3);
  lamp(12, 5, .2, 0, -2, 11, 0.9);
  const room = new RoomEnvironment(); room.scale.setScalar(1.6); env.add(room);
  return env;
}
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(studioEnv(), 0.01).texture;
pmrem.dispose();

const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
camera.position.set(0, 0, 18);
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-5, 6, 7); scene.add(key);
const back = new THREE.DirectionalLight(0xfff4ea, 1.2); back.position.set(4, 2, -6); scene.add(back);

/* ---------- текстуры ---------- */
function tex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
const knurl = tex(128, 128, (g, w, h) => {     // насечка держателя (карта нормалей)
  const img = g.createImageData(w, h), s = w / 8;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = (x % s) / s - .5, v = (y % s) / s - .5, i = (y * w + x) * 4;
    let nx = 0, ny = 0; if (Math.abs(u) > Math.abs(v)) nx = Math.sign(u); else ny = Math.sign(v);
    img.data[i] = 128 + nx * 90; img.data[i + 1] = 128 - ny * 90; img.data[i + 2] = 200; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}, 14, 10);
const ribs = tex(128, 4, (g, w, h) => {         // рёбра колёсика
  for (let x = 0; x < w; x++) { const v = Math.sin(x / w * Math.PI * 2); g.fillStyle = `rgb(${128 + v * 120 | 0},128,230)`; g.fillRect(x, 0, 1, h); }
}, 40, 1);
const brushed = tex(4, 256, (g, w, h) => {      // кольцевые риски точёного металла
  for (let y = 0; y < h; y++) { const v = 150 + (Math.random() - .5) * 60; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, w, 1); }
}, 1, 4);
const label = tex(1024, 1024, (g, w, h) => {    // надпись на корпусе (альфа-маска)
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.save(); g.translate(w * .5, h * .5); g.rotate(-Math.PI / 2);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 60px Unbounded, "Arial Black", sans-serif'; g.fillText('VIP TATTOO', 0, -10);
  g.font = '600 19px "Inter Tight", Manrope, Arial, sans-serif'; g.fillText('O M S K   ·   S I N C E   2 0 0 7', 0, 38);
  g.restore();
});

/* ---------- материалы ---------- */
const M = {
  gloss: new THREE.MeshPhysicalMaterial({ color: 0x0b0b0d, metalness: 0.35, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.3 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xf2f2f2, metalness: 1, roughness: 0.08, envMapIntensity: 1.5 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xd9dadd, metalness: 1, roughness: 0.28, roughnessMap: brushed, envMapIntensity: 1.3 }),
  grip: new THREE.MeshStandardMaterial({ color: 0x1a1a1c, metalness: 0.55, roughness: 0.55, normalMap: knurl, normalScale: new THREE.Vector2(0.7, 0.7) }),
  dial: new THREE.MeshStandardMaterial({ color: 0xe8e8ea, metalness: 1, roughness: 0.22, normalMap: ribs, normalScale: new THREE.Vector2(1.1, 1.1), envMapIntensity: 1.4 }),
  // «стекло» без настоящего преломления — в разы дешевле на телефоне, на светлом фоне выглядит так же
  glass: new THREE.MeshPhysicalMaterial({ color: 0xf4f6f7, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.42, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false }),
  cartBase: new THREE.MeshStandardMaterial({ color: 0x111113, metalness: 0.1, roughness: 0.45 }),
  label: new THREE.MeshStandardMaterial({ color: 0xe9e9e9, metalness: 1, roughness: 0.3, alphaMap: label, transparent: true, depthWrite: false }),
  led: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xd8b48c, emissiveIntensity: 2.2 }),
  ink: new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.2, roughness: 0.1 })
};

const V = (r, y) => new THREE.Vector2(r, y);
const lathe = (pts, mat, seg = SEG) => new THREE.Mesh(new THREE.LatheGeometry(pts, seg), mat);
// деталь с закрытыми торцами — в разобранном виде внутрь не видно
const solid = (pts, mat, seg = SEG) => lathe([V(0, pts[0].y), ...pts, V(0, pts[pts.length - 1].y)], mat, seg);
const ring = (r, y0, y1, mat) => lathe([V(r - .004, y0), V(r, y0 + .006), V(r, y1 - .006), V(r - .004, y1)], mat);
const part = (...meshes) => { const g = new THREE.Group(); meshes.forEach(m => g.add(m)); return g; };

// детали; e — на сколько каждая отъезжает вдоль оси при разборке
const needleMesh = lathe([V(0, -3.3), V(.006, -3.28), V(.014, -3.2), V(.015, -1.3), V(0, -1.3)], M.steel, 24);
const drop = new THREE.Mesh(new THREE.SphereGeometry(.02, 16, 12), M.ink); drop.position.y = -3.29;
needleMesh.add(drop);   // капля краски дрожит вместе с иглой
const btn = lathe([V(0, 0), V(.07, 0), V(.075, .02), V(.07, .035), V(0, .04)], M.chrome, 32);
btn.rotation.z = -Math.PI / 2; btn.position.set(.41, 5.15, 0);
const band = new THREE.Mesh(new THREE.CylinderGeometry(.4022, .4022, 1.45, SEG, 1, true), M.label);
band.position.y = 2.82; band.rotation.y = Math.PI * .5;
const P = {
  needle: { g: part(needleMesh), e: -2.7 },
  cart: { g: part(
    lathe([V(.026, -3.02), V(.05, -2.92), V(.1, -2.64), V(.15, -2.3), V(.185, -1.98), V(.198, -1.62), V(.205, -1.42)], M.glass),
    solid([V(.205, -1.42), V(.228, -1.4), V(.228, -1.12), V(.21, -1.1)], M.cartBase),
    ring(.232, -1.3, -1.26, M.chrome)), e: -1.75 },
  grip: { g: part(
    solid([V(.2, -1.1), V(.262, -1.07), V(.3, -1.0), V(.31, -.9), V(.31, .7), V(.302, .8), V(.285, .88)], M.grip),
    solid([V(.285, .88), V(.33, .89), V(.336, .94), V(.336, 1.0), V(.33, 1.03)], M.chrome)), e: -0.7 },
  body: { g: part(
    solid([V(.33, 1.03), V(.372, 1.06), V(.396, 1.13), V(.4, 1.24), V(.4, 3.9), V(.393, 4.0), V(.375, 4.06)], M.gloss),
    ring(.403, 1.95, 2.01, M.chrome), ring(.403, 3.62, 3.68, M.chrome), band), e: 0 },
  dial: { g: part(solid([V(.375, 4.06), V(.39, 4.08), V(.395, 4.12), V(.395, 4.4), V(.388, 4.44), V(.37, 4.46)], M.dial)), e: 0.85 },
  batt: { g: part(
    solid([V(.37, 4.46), V(.41, 4.5), V(.415, 4.56), V(.415, 5.3), V(.405, 5.4), V(.37, 5.48)], M.gloss),
    ring(.418, 4.98, 5.01, M.led),
    lathe([V(.37, 5.48), V(.33, 5.55), V(.25, 5.6), V(.12, 5.63), V(0, 5.635)], M.chrome), btn), e: 1.7 }
};
const machine = new THREE.Group();
Object.values(P).forEach(o => machine.add(o.g));
machine.position.y = -1.15;                       // вращаем вокруг середины
const rig = new THREE.Group(); rig.add(machine); scene.add(rig);
const EXPLODED = 8.95 + 2.7 + 1.7;               // длина машинки в разобранном виде

// точки, к которым тянутся подписи (в координатах детали)
const ANCH = [['cart', 0, -2.25], ['grip', 0, -0.1], ['body', 0, 2.5], ['batt', 0, 4.95]];

// мягкая тень
const shadowTex = tex(128, 128, (g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(.5, 'rgba(0,0,0,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
shadow.renderOrder = -1; scene.add(shadow);

/* ---------- вращение пальцем / мышкой; зажали — машинка «заводится» ---------- */
let spin = 0.6, vel = 0, yaw = 0, yawVel = 0, tilt = 0, tiltT = 0, dragging = false, lx = 0, ly = 0, lastMove = 0, pressing = false, power = 0;
drag.addEventListener('pointerdown', e => {
  dragging = pressing = true; lx = e.clientX; ly = e.clientY; drag.setPointerCapture(e.pointerId); root.classList.add('dragging');
  if (navigator.vibrate) try { navigator.vibrate([18, 40, 18]); } catch (_) {}
});
drag.addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
  yawVel = dx * 0.011; yaw += yawVel; vel = dx * 0.004; spin += vel; tiltT = Math.max(-.5, Math.min(.5, tiltT + dy * 0.004)); lastMove = performance.now();
  root.classList.add('spun');
});
const up = () => { dragging = pressing = false; root.classList.remove('dragging'); };
drag.addEventListener('pointerup', up); drag.addEventListener('pointercancel', up);

/* ---------- размер: холст = 100lvh, поэтому прячущаяся адресная строка его не дёргает ---------- */
let W = 1, H = 1, stacked = false;
function resize(force) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!force && w === W && Math.abs(h - H) < 140) return;      // мелкие изменения высоты на телефоне — игнорируем
  W = w; H = h;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.position.z = W / H < .75 ? 26 : W / H < 1.15 ? 21 : 18;
  camera.updateProjectionMatrix();
  stacked = W <= 760 || (W <= 1100 && W / H < 0.9);
}
addEventListener('resize', () => resize(false)); resize(true);

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const lerp = (a, b, t) => a + (b - a) * t;
const viewW = () => 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect;
const viewH = () => 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;

// позы: покой (справа / сверху — текст никогда не лежит на машинке), разборка (поперёк экрана / вертикально по центру),
// стойка иглой вниз; дальше — нырок к игле
function poses() {
  if (stacked) {
    const u = viewH() / H, topPx = 74, botPx = (window.VIP.introTop || H * .6) - 34;
    const avail = Math.max(1, botPx - topPx) * u, len = 8.95 * Math.cos(0.72) + 0.25;
    const rs = Math.min(0.84, avail / len), ry0 = (H / 2 - (topPx + botPx) / 2) * u - 0.35 * rs;
    return {
    rest: { x: 0, y: ry0, rz: -0.72, ry: 0, s: rs, z: 0 },
    exp: { x: -viewW() * 0.27, y: 0.1, rz: 0.06, ry: 0.35, s: Math.min(.62, .74 * viewH() / EXPLODED), z: 0 },
    upr: { x: 0, y: 0.5, s: 0.62 }
  }; }
  return {
    rest: { x: viewW() * 0.2, y: -0.2, rz: -0.62, ry: 0, s: 0.82, z: 0 },
    exp: { x: -0.35, y: 0.15, rz: Math.PI / 2, ry: -0.62, s: Math.min(.82, .66 * viewW() / EXPLODED), z: 4 },
    upr: { x: 0, y: -0.05, s: 0.68 }
  };
}
const TIP = 3.3 + 1.15;   // от центра вращения до кончика иглы

const v3 = new THREE.Vector3(), box = new THREE.Box3();
const toScreen = v => { v.project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
let visible = true;
new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '100px' }).observe(hero);

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  if (!visible) return;
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
  const p = window.VIP.p || 0;
  const { rest, exp, upr } = poses();

  const a = ease(seg(p, 0.10, 0.28));                                   // к позе разборки
  const e = ease(seg(p, 0.22, 0.38)) * (1 - ease(seg(p, 0.56, 0.66)));  // детали разлетаются и собираются
  const b = ease(seg(p, 0.62, 0.74));                                   // встаёт иглой вниз
  const c = ease(seg(p, 0.74, 0.92));                                   // нырок к игле

  if (!dragging) { yawVel *= Math.pow(0.05, dt); yaw += yawVel; vel *= Math.pow(0.04, dt); spin += vel + (performance.now() - lastMove > 1500 ? dt * (0.28 + e * 0.12) * (1 - b) : 0); }
  tilt = lerp(tilt, dragging ? tiltT : 0, 0.08); if (!dragging) tiltT *= 0.95;
  const front = Math.round(spin / (Math.PI * 2)) * Math.PI * 2;

  machine.rotation.y = lerp(spin, front, b);
  for (const k in P) P[k].g.position.y = P[k].e * e;
  rig.rotation.z = lerp(lerp(rest.rz, exp.rz, a), 0, b);
  yaw = lerp(yaw, 0, b * .08);   // к стойке иглой вниз поворот плавно сбрасывается
  rig.rotation.y = lerp(lerp(rest.ry, exp.ry, a), 0, b) + yaw;   // крутится всем корпусом, как на поворотном столе
  rig.rotation.x = 0.12 + tilt * (1 - a * .7) + b * 0.18 + c * 0.32;
  const s = lerp(lerp(rest.s, exp.s, a), upr.s, b);
  rig.scale.setScalar(lerp(s, 1, c));
  rig.position.x = lerp(lerp(rest.x, exp.x, a), upr.x, b);
  const y0 = lerp(lerp(rest.y + Math.sin(t * .8) * .06 * (1 - a), exp.y, a), upr.y, b);
  rig.position.y = lerp(y0, TIP * Math.cos(rig.rotation.x) * 0.98, c);
  rig.position.z = lerp(exp.z * a, 0, b) * (1 - c) + c * (camera.position.z - 2.6);

  power = lerp(power, pressing ? 1 : 0, pressing ? .2 : .06);
  M.led.emissiveIntensity = 2.2 + power * 6 + e * 3;
  const buzz = Math.max(seg(p, .72, .8) * (1 - seg(p, .96, 1)), power);
  needleMesh.position.y = Math.sin(t * 90) * .04 * buzz;
  rig.position.x += (Math.random() - .5) * .006 * power;
  drop.scale.setScalar(1 + c * 1.5);

  // тень-пятно под машинкой (в разобранном виде — шире и светлее)
  const sc = rig.scale.x, half = (4.45 + e * 2.2) * sc * Math.abs(Math.cos(rig.rotation.z)) * Math.cos(rig.rotation.x) + .45 * sc;
  shadow.position.set(rig.position.x + Math.sin(-rig.rotation.z) * 1.2 * sc * (1 - a), rig.position.y - half - .35, rig.position.z - .5);
  shadow.scale.set((3.6 + a * 6) * sc * (1 - b * .45) * (stacked ? 1 - a * .55 : 1), .42 * sc, 1);
  shadow.material.opacity = (1 - c) * (.5 - a * .2 * (1 - b));

  renderer.render(scene, camera);

  // для main.js: точки подписей, кончик иглы, рамка машинки
  machine.updateMatrixWorld();
  window.VIP.e = e; window.VIP.stacked = stacked;
  window.VIP.parts = ANCH.map(([k, x, y]) => toScreen(v3.set(x, y, 0).applyMatrix4(P[k].g.matrixWorld)));
  window.VIP.tip = toScreen(v3.set(0, -3.3, 0).applyMatrix4(P.needle.g.matrixWorld));
  const rect = obj => {
    box.setFromObject(obj, true);
    let x0 = 1e9, y1 = 1e9, x1 = -1e9, y2 = -1e9;
    for (let i = 0; i < 8; i++) {
      const q = toScreen(v3.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
      x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y1 = Math.min(y1, q[1]); y2 = Math.max(y2, q[1]);
    }
    return [x0, y1, x1, y2];
  };
  window.VIP.box = rect(machine);
  window.VIP.boxes = e > .02 ? Object.keys(P).map(k => rect(P[k].g)) : [window.VIP.box];
}

// шейдеры собираем заранее, первый кадр рисуем — и только тогда меняем картинку-заглушку на 3D
renderer.compile(scene, camera);
frame();
requestAnimationFrame(() => root.classList.add('has-3d'));
