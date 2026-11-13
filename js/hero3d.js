/* IRON PULSE — 3D hero (Three.js r128). Builds a chrome dumbbell from primitives,
   lights it with the brand colour from CSS (--brand) and reacts to mouse + scroll. */
(function () {
  const canvas = document.getElementById('hero3d');
  if (!canvas || typeof THREE === 'undefined') return;

  const css = getComputedStyle(document.documentElement);
  const BRAND = new THREE.Color(css.getPropertyValue('--brand').trim() || '#c6ff3d');
  const BRAND2 = new THREE.Color(css.getPropertyValue('--brand-2').trim() || '#ff5a36');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  /* ---- Environment map built from glowing panels (gives chrome reflections) ---- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x050608);
  const panel = (color, intensity, w, h, pos, rot) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos); if (rot) m.rotation.set(...rot); envScene.add(m);
  };
  panel(new THREE.Color(0xffffff), 3, 10, 2, [0, 6, 0], [Math.PI / 2, 0, 0]);
  panel(BRAND, 4, 4, 10, [-7, 0, 2], [0, Math.PI / 2, 0]);
  panel(BRAND2, 3, 4, 10, [7, 0, -2], [0, -Math.PI / 2, 0]);
  panel(new THREE.Color(0xffffff), 1.5, 8, 4, [0, 0, -8], null);
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;

  /* ---- Materials ---- */
  const chrome = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, metalness: 1, roughness: 0.16 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x15171c, metalness: 0.85, roughness: 0.35 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x020203, metalness: 0.0, roughness: 0.6, envMapIntensity: 0.15 });
  const accent = new THREE.MeshStandardMaterial({ color: BRAND, metalness: 0.4, roughness: 0.25, emissive: BRAND, emissiveIntensity: 0.35 });

  /* ---- Dumbbell ---- */
  const dumbbell = new THREE.Group();
  const cyl = (r, l, mat, seg = 64) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, seg), mat);

  const handle = cyl(0.22, 3.2, chrome); handle.rotation.z = Math.PI / 2; dumbbell.add(handle);
  // knurling grip rings
  for (let i = -6; i <= 6; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.018, 8, 40), darkMetal);
    ring.rotation.y = Math.PI / 2; ring.position.x = i * 0.1; dumbbell.add(ring);
  }
  [-1, 1].forEach((s) => {
    const collar = cyl(0.36, 0.22, chrome); collar.rotation.z = Math.PI / 2; collar.position.x = s * 1.7; dumbbell.add(collar);
    const plates = [
      { r: 1.35, w: 0.34, x: 2.0 }, { r: 1.2, w: 0.3, x: 2.36 }, { r: 1.0, w: 0.26, x: 2.68 },
    ];
    plates.forEach((p, idx) => {
      const g = new THREE.Group();
      const body = cyl(p.r, p.w, rubber, 80); body.rotation.z = Math.PI / 2; g.add(body);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(p.r - 0.02, 0.045, 16, 100), idx === 0 ? accent : chrome);
      rim.rotation.y = Math.PI / 2; rim.position.x = (p.w / 2) * s; g.add(rim);
      const hub = cyl(0.5, p.w + 0.04, chrome); hub.rotation.z = Math.PI / 2; g.add(hub);
      g.position.x = s * p.x; dumbbell.add(g);
    });
    const cap = cyl(0.3, 0.18, chrome); cap.rotation.z = Math.PI / 2; cap.position.x = s * 2.95; dumbbell.add(cap);
  });
  dumbbell.rotation.set(0.35, -0.6, 0.25);
  const rig = new THREE.Group(); rig.add(dumbbell); scene.add(rig);

  /* ---- Orbit rings + wireframe sphere ---- */
  const ringMat = new THREE.MeshBasicMaterial({ color: BRAND, transparent: true, opacity: 0.55 });
  const orbit1 = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.012, 8, 200), ringMat);
  const orbit2 = new THREE.Mesh(new THREE.TorusGeometry(5.0, 0.008, 8, 200), new THREE.MeshBasicMaterial({ color: BRAND2, transparent: true, opacity: 0.35 }));
  orbit1.rotation.set(1.2, 0.2, 0); orbit2.rotation.set(1.4, -0.4, 0.3);
  rig.add(orbit1, orbit2);
  const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(3.6, 2), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.045 }));
  rig.add(wire);
  // small glowing orbs on the ring
  const orbs = [];
  for (let i = 0; i < 3; i++) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), new THREE.MeshBasicMaterial({ color: i % 2 ? BRAND2 : BRAND }));
    orbit1.add(o); orbs.push({ mesh: o, off: (i / 3) * Math.PI * 2 });
  }

  /* ---- Particles ---- */
  const COUNT = window.innerWidth < 700 ? 500 : 1200;
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const r = 6 + Math.random() * 14, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(p) * Math.cos(t); pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t) * 0.6; pos[i * 3 + 2] = r * Math.cos(p) - 6;
  }
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: BRAND, size: 0.045, transparent: true, opacity: 0.7, depthWrite: false }));
  scene.add(particles);

  /* ---- Lights ---- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(4, 6, 6); scene.add(key);
  const rimL = new THREE.PointLight(BRAND, 1.2, 30); rimL.position.set(-6, 2, 3); scene.add(rimL);
  const rimR = new THREE.PointLight(BRAND2, 1.0, 30); rimR.position.set(6, -3, 2); scene.add(rimR);

  /* ---- Layout: dumbbell sits beside the text (left in RTL, right in LTR); centred on top on mobile ---- */
  let baseX = 0, baseY = 0, baseScale = 1;
  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const rtl = document.documentElement.dir === 'rtl';
    if (w < 900) { baseX = 0; baseY = 2.6; baseScale = Math.min(0.62, w / 700); }
    else { baseX = (rtl ? -1 : 1) * Math.min(3.6, camera.aspect * 1.9); baseY = 0; baseScale = 0.92; }
  }
  layout();
  window.addEventListener('resize', layout);
  document.addEventListener('langchange', layout);

  /* ---- Interaction ---- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
  });
  let scrollP = 0;
  window.addEventListener('scroll', () => { scrollP = Math.min(1, window.scrollY / window.innerHeight); }, { passive: true });

  // intro spin-in
  let intro = 0;
  let visible = true;
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(canvas);

  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    if (!visible) return;
    const t = clock.getElapsedTime();
    intro = Math.min(1, intro + 0.012);
    const ease = 1 - Math.pow(1 - intro, 3);
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;

    rig.position.x = baseX + mouse.x * 0.3;
    rig.position.y = baseY + Math.sin(t * 1.1) * 0.18 - mouse.y * 0.2 + scrollP * 2;
    const s = baseScale * (0.4 + 0.6 * ease) * (1 - scrollP * 0.25);
    rig.scale.setScalar(s);

    dumbbell.rotation.y = -0.6 + t * 0.35 + mouse.x * 0.6 + (1 - ease) * 4 + scrollP * 2.5;
    dumbbell.rotation.x = 0.35 + mouse.y * 0.3 + Math.sin(t * 0.6) * 0.08;
    orbit1.rotation.z = t * 0.25; orbit2.rotation.z = -t * 0.18;
    wire.rotation.y = t * 0.05; wire.rotation.x = t * 0.03;
    orbs.forEach((o) => { const a = t * 0.8 + o.off; o.mesh.position.set(Math.cos(a) * 4.2, Math.sin(a) * 4.2, 0); });
    particles.rotation.y = t * 0.02 + mouse.x * 0.08; particles.rotation.x = mouse.y * 0.05;

    renderer.render(scene, camera);
  }
  tick();
})();
