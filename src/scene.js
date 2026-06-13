import * as THREE from 'three';
import { GLTFLoader }      from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader }       from 'three/addons/loaders/HDRLoader.js';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass }        from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js';
import hdrUrl from '../assets/textures/winter_lake_01_04k.hdr?url';
import glbUrl from '../assets/3D/Acclimation-Animation2.glb?url';

export function initScene() {
  const section = document.getElementById('glbSection');
  const canvas  = document.getElementById('glbCanvas');
  if (!section || !canvas) return;

  const W = section.clientWidth;
  const H = section.clientHeight;

  // ---- Renderer ----
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.outputColorSpace    = THREE.SRGBColorSpace;
  renderer.toneMapping         = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.shadowMap.enabled   = true;
  renderer.shadowMap.type      = THREE.PCFShadowMap;

  // ---- Scene ----
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // HDR environment — IBL lighting only, not shown as background
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  new HDRLoader().load(hdrUrl, (hdr) => {
    const envMap = pmrem.fromEquirectangular(hdr).texture;
    scene.environment = envMap;
    hdr.dispose();
    pmrem.dispose();
  });

  // ---- Camera ----
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 5000);
  camera.up.set(0, 0, -1);
  camera.position.set(0, 50, 0);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  // ---- Lighting ----
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  scene.add(new THREE.HemisphereLight(0xd0e8ff, 0x222222, 0.6));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(-1, 2, 1.5);
  keyLight.castShadow              = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near      = 0.1;
  keyLight.shadow.camera.far       = 2000;
  keyLight.shadow.camera.left      = -500;
  keyLight.shadow.camera.right     =  500;
  keyLight.shadow.camera.top       =  500;
  keyLight.shadow.camera.bottom    = -500;
  keyLight.shadow.bias             = -0.0003;
  keyLight.shadow.normalBias       =  0.06;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
  fillLight.position.set(1, 1, -1);
  scene.add(fillLight);

  // ---- Post-processing pipeline ----
  const composer = new EffectComposer(renderer);

  // 1. Base render
  composer.addPass(new RenderPass(scene, camera));

  // 2. Ambient occlusion
  const ssaoPass = new SSAOPass(scene, camera, W, H);
  ssaoPass.kernelRadius = 6;
  ssaoPass.minDistance  = 0.001;
  ssaoPass.maxDistance  = 0.03;
  ssaoPass.enabled = false;
  composer.addPass(ssaoPass);

  // 3. Final colour-space output
  composer.addPass(new OutputPass());

  // ---- Timer ----
  const timer = new THREE.Timer();
  let mixer = null;

  // ---- Camera click-cycle state ----
  const camDefault = new THREE.Vector3();
  const camZoomed  = new THREE.Vector3();
  const camFront   = new THREE.Vector3();
  const camTarget  = new THREE.Vector3();
  let camState = 0;

  // ---- Hover (cursor only, no colour highlight) ----
  const raycaster = new THREE.Raycaster();
  const mouse     = new THREE.Vector2();
  const hoverSkip = new Set();

  function restoreHovered() {
    canvas.style.cursor = '';
  }

  // ---- GLB loader ----
  const loader = new GLTFLoader();
  loader.load(
    glbUrl,
    (gltf) => {
      const model = gltf.scene;
      scene.add(model);

      const box    = new THREE.Box3().setFromObject(model);
      const centre = new THREE.Vector3();
      const size   = new THREE.Vector3();
      box.getCenter(centre);
      box.getSize(size);

      model.position.x -= centre.x;
      model.position.z -= centre.z;

      const span   = Math.max(size.x, size.z);
      const fovRad = camera.fov * Math.PI / 180;
      const dist   = (span / 2) / Math.tan(fovRad / 2) * 0.126;

      camera.position.set(0, dist, dist * 0.15);
      camera.near = dist * 0.001;
      camera.far  = dist * 100;
      camera.updateProjectionMatrix();
      camera.lookAt(0, 0, 0);

      // Fit shadow frustum to model
      const halfSpan = span * 0.6;
      keyLight.shadow.camera.left   = -halfSpan;
      keyLight.shadow.camera.right  =  halfSpan;
      keyLight.shadow.camera.top    =  halfSpan;
      keyLight.shadow.camera.bottom = -halfSpan;
      keyLight.shadow.camera.far    = dist * 10;
      keyLight.shadow.camera.updateProjectionMatrix();

      camDefault.set(0, dist, dist * 0.15);
      const zd = dist * 0.3;
      camZoomed.set(0, zd * 0.707, zd * 0.707);
      const fd = zd * 1.15;
      camFront.set(0, fd * 0.18, fd);
      camTarget.copy(camDefault);

      const uniformMat = new THREE.MeshStandardMaterial({
        color:     0xffffff,
        roughness: 0.35,
        metalness: 0.0,
        side:      THREE.DoubleSide,
      });

      model.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow    = true;
        child.receiveShadow = true;

        const b = new THREE.Box3().setFromObject(child);
        const s = new THREE.Vector3();
        b.getSize(s);
        const name      = (child.name || '').toLowerCase();
        const footprint = Math.max(s.x, s.z);
        const isGround  = /plane|ground|floor|shadow/i.test(name) || footprint > span * 0.6;

        if (isGround) {
          child.visible = false;
          hoverSkip.add(child);
        } else {
          child.material = uniformMat;
        }
      });

      if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(model);
        // Most clips are 95 frames; Variation1.096Action is 120. Trim outliers by
        // cutting keyframes beyond the modal duration so all clips loop in sync.
        const sorted = gltf.animations.map(c => c.duration).sort((a, b) => a - b);
        const modal  = sorted[Math.floor(sorted.length / 2)];
        gltf.animations.forEach((clip) => {
          let c = clip;
          if (clip.duration > modal + 0.1) {
            c = clip.clone();
            c.duration = modal;
            c.tracks.forEach(track => {
              const sz = track.getValueSize();
              let end = track.times.length;
              for (let i = 0; i < track.times.length; i++) {
                if (track.times[i] >= modal) { end = i; break; }
              }
              track.times  = track.times.slice(0, end);
              track.values = track.values.slice(0, end * sz);
            });
          }
          mixer.clipAction(c).play();
        });
      }
    },
    undefined,
    (err) => console.error('GLB load error:', err)
  );

  // ---- Events ----
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const targets = [];
    scene.traverse((o) => { if (o.isMesh && o.visible && !hoverSkip.has(o)) targets.push(o); });
    const hits = raycaster.intersectObjects(targets, false);

    if (hits.length === 0) { restoreHovered(); return; }
    canvas.style.cursor = 'pointer';
  });

  canvas.addEventListener('mouseleave', restoreHovered);

  canvas.addEventListener('click', () => {
    if (camDefault.length() === 0) return;
    camState = (camState + 1) % 3;
    if (camState === 0)      camTarget.copy(camDefault);
    else if (camState === 1) camTarget.copy(camZoomed);
    else                     camTarget.copy(camFront);
  });

  window.addEventListener('resize', () => {
    const w = section.clientWidth;
    const h = section.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    ssaoPass.setSize(w, h);
  });

  // ---- Animate ----
  (function animate() {
    requestAnimationFrame(animate);
    timer.update();
    if (mixer) mixer.update(timer.getDelta());
    if (camTarget.length() > 0) {
      camera.position.lerp(camTarget, 0.06);
      camera.lookAt(0, 0, 0);
    }
    composer.render();
  }());
}
