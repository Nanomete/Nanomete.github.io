import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';

// ---------- Basic setup ----------
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(5.5, 3.2, 7.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.outputColorSpace = THREE.SRGBColorSpace;
// physically-based lighting units (default in modern three.js, kept explicit for clarity)
renderer.useLegacyLights = false;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2.5;
controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI / 2 - 0.02;
controls.update();

// ---------- Skybox (procedural desert sky, hazy & warm) ----------
const sky = new Sky();
sky.scale.setScalar(450000);

const sun = new THREE.Vector3();
const skyParams = {
  turbidity: 9,
  rayleigh: 1.1,
  mieCoefficient: 0.018,
  mieDirectionalG: 0.94,
  elevation: 28,
  azimuth: 140
};

// Environment map generation from the sky, used for image-based lighting (IBL)
// so PBR materials on the character get physically plausible reflections/ambient light.
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const sceneEnv = new THREE.Scene();
let envRenderTarget;

function updateSky() {
  const u = sky.material.uniforms;
  u['turbidity'].value = skyParams.turbidity;
  u['rayleigh'].value = skyParams.rayleigh;
  u['mieCoefficient'].value = skyParams.mieCoefficient;
  u['mieDirectionalG'].value = skyParams.mieDirectionalG;

  const phi = THREE.MathUtils.degToRad(90 - skyParams.elevation);
  const theta = THREE.MathUtils.degToRad(skyParams.azimuth);
  sun.setFromSphericalCoords(1, phi, theta);
  u['sunPosition'].value.copy(sun);

  sunLight.position.copy(sun).multiplyScalar(60);
  sunLight.target.position.set(0, 0, 0);
  sunLight.target.updateMatrixWorld();

  if (envRenderTarget) envRenderTarget.dispose();
  sceneEnv.add(sky);
  envRenderTarget = pmremGenerator.fromScene(sceneEnv, 0.04);
  scene.add(sky);
  scene.environment = envRenderTarget.texture;
  scene.background = envRenderTarget.texture;
}

// ---------- Lighting (warm desert sun) ----------
const hemiLight = new THREE.HemisphereLight(0xffe6bf, 0xb98a52, 0.55);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfff0d0, 3.0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 200;
sunLight.shadow.camera.left = -20;
sunLight.shadow.camera.right = 20;
sunLight.shadow.camera.top = 20;
sunLight.shadow.camera.bottom = -20;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);
scene.add(sunLight.target);

updateSky();

// warm hazy fog to sell the desert heat / distance haze
scene.fog = new THREE.FogExp2(0xe0b988, 0.01);

// ---------- Ground: procedural sand dunes ----------

// lightweight value-noise (no external noise library needed)
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function smoothNoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const tl = hash(xi, yi), tr = hash(xi + 1, yi);
  const bl = hash(xi, yi + 1), br = hash(xi + 1, yi + 1);
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(tl, tr, u), THREE.MathUtils.lerp(bl, br, u), v);
}
function fbm(x, y, octaves = 5) {
  let total = 0, amp = 1, freq = 1, maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    total += smoothNoise(x * freq, y * freq) * amp;
    maxAmp += amp;
    amp *= 0.52;
    freq *= 2.05;
  }
  return total / maxAmp;
}

function duneHeight(x, z) {
  // large rolling dune ridges
  const ridges = Math.sin(x * 0.018 + z * 0.012) * 2.2 + Math.sin(x * 0.008 - z * 0.02) * 1.6;
  // fine surface detail (fbm noise)
  const detail = fbm(x * 0.06, z * 0.06) * 1.4;
  let h = ridges + detail;

  // flatten a clearing near the origin so the character stands on level ground
  const dist = Math.sqrt(x * x + z * z);
  const clearRadius = 4.5, fade = 6;
  const blend = THREE.MathUtils.smoothstep(dist, clearRadius, clearRadius + fade);
  return h * blend;
}

function makeSandTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#e8c48c');
  grad.addColorStop(1, '#d8a866');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // wind ripple streaks
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = Math.random() > 0.5 ? '#fff3d6' : '#a97c40';
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    const y = Math.random() * size;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.3, y + (Math.random() - 0.5) * 40, size * 0.7, y + (Math.random() - 0.5) * 40, size, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // fine grain speckle
  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const shade = Math.random() * 60 - 30;
    ctx.fillStyle = `rgba(${140 + shade}, ${105 + shade * 0.7}, ${60 + shade * 0.5}, 0.35)`;
    ctx.fillRect(x, y, 1.4, 1.4);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(30, 30);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const groundSize = 400;
const groundSegs = 180;
const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize, groundSegs, groundSegs);
groundGeo.rotateX(-Math.PI / 2);

const posAttr = groundGeo.attributes.position;
for (let i = 0; i < posAttr.count; i++) {
  const x = posAttr.getX(i);
  const z = posAttr.getZ(i);
  posAttr.setY(i, duneHeight(x, z));
}
groundGeo.computeVertexNormals();

const groundMat = new THREE.MeshStandardMaterial({
  map: makeSandTexture(),
  roughness: 0.95,
  metalness: 0.02,
  envMapIntensity: 0.4
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.receiveShadow = true;
scene.add(ground);

// ---------- Loading UI ----------
const loadingEl = document.getElementById('loading');
const pctEl = loadingEl.querySelector('.pct');
const manager = new THREE.LoadingManager();
manager.onProgress = (url, loaded, total) => {
  const pct = Math.round((loaded / total) * 100);
  pctEl.textContent = pct + '%';
};
manager.onLoad = () => {
  loadingEl.classList.add('hidden');
};

// ---------- Character model (PBR via glTF metalness/roughness workflow + IBL) ----------
const MODEL_URL = 'model/Robot_sample.glb';

let mixer = null;
let actions = {};
let activeAction = null;
const clock = new THREE.Clock();

function fadeToAction(name, duration = 0.35) {
  if (!actions[name] || activeAction === actions[name]) return;
  const prev = activeAction;
  activeAction = actions[name];
  if (prev) prev.fadeOut(duration);
  activeAction.reset().setEffectiveWeight(1).fadeIn(duration).play();

  document.querySelectorAll('#ui button').forEach(b => {
    b.classList.toggle('active', b.dataset.action === name);
  });
}

  // function buildUI(names) {
  //   const ui = document.getElementById('ui');
  //   const preferredOrder = ['Idle', 'Walking', 'Running', 'Jump', 'Dance', 'Wave', 'Yes', 'No', 'ThumbsUp', 'Punch', 'Sitting'];
  //   const ordered = preferredOrder.filter(n => names.includes(n)).concat(names.filter(n => !preferredOrder.includes(n)));

  //   ordered.forEach(name => {
  //     const btn = document.createElement('button');
  //     btn.textContent = name;
  //     btn.dataset.action = name;
  //     btn.addEventListener('click', () => fadeToAction(name));
  //     ui.appendChild(btn);
  //   });
  // }

function addFallbackCharacter() {
  // Physically-based fallback humanoid (MeshPhysicalMaterial: roughness/metalness + clearcoat)
  const group = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x3f6fa8,
    roughness: 0.35,
    metalness: 0.6,
    clearcoat: 0.5,
    clearcoatRoughness: 0.25,
    envMapIntensity: 1.0
  });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.9, 6, 12), mat);
  body.position.y = 1.05;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), mat);
  head.position.y = 1.85;
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.6, 4, 8), mat);
  armL.position.set(-0.5, 1.15, 0);
  armL.rotation.z = 0.25;
  const armR = armL.clone();
  armR.position.x = 0.5;
  armR.rotation.z = -0.25;
  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.7, 4, 8), mat);
  legL.position.set(-0.18, 0.35, 0);
  const legR = legL.clone();
  legR.position.x = 0.18;

  [body, head, armL, armR, legL, legR].forEach(m => { m.castShadow = true; group.add(m); });
  scene.add(group);
  loadingEl.classList.add('hidden');
}

const loader = new GLTFLoader(manager);
loader.load(
  MODEL_URL,
  (gltf) => {
    const model = gltf.scene;
    model.scale.setScalar(1);
    model.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        // boost image-based lighting response so the PBR material reacts to the desert sky
        if (obj.material) {
          obj.material.envMapIntensity = 1.2;
          obj.material.needsUpdate = true;
        }
      }
    });
    scene.add(model);

    mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach(clip => {
      actions[clip.name] = mixer.clipAction(clip);
    });

    const names = Object.keys(actions);
    if (names.length) {
      // buildUI(names);
      fadeToAction(names.includes('Idle') ? 'Idle' : names[0], 0);
    }
  },
  undefined,
  (err) => {
    console.warn('ไม่สามารถโหลดโมเดลจากภายนอกได้ ใช้ตัวละครสำรองแทน', err);
    addFallbackCharacter();
  }
);

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Render loop ----------
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  controls.update();
  renderer.render(scene, camera);
}
animate();