/* 2. THREE.JS 3D SCENE: NAVY PAPER AIRPLANE & PLANE CREATIVE WHITE STARS */
function initThreeAirplaneScene() {
  const canvas = document.getElementById('webgl-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050608, 0.0015);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 18);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.autoClear = false; // Holy Grail: allow multiple scenes
  window.SharedRenderer = renderer;

  // Lighting: Soft white ambient + intense Royal/Navy blue key light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambientLight);

  const blueKeyLight = new THREE.PointLight(0x2563eb, 3.8, 65);
  blueKeyLight.position.set(12, 10, 12);
  scene.add(blueKeyLight);

  const cobaltRimLight = new THREE.PointLight(0x1d4ed8, 2.5, 45);
  cobaltRimLight.position.set(-10, -8, 6);
  scene.add(cobaltRimLight);

  /* --- 1. WHITE STARFIELD --- */
  const particlesGeometry = new THREE.BufferGeometry();
  const particlesCount = 2000;
  const posArray = new Float32Array(particlesCount * 3);

  for (let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 150;
  }
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

  // Circular particle texture via programmatic canvas radial gradient
  const starCanvas = document.createElement('canvas');
  starCanvas.width = 16;
  starCanvas.height = 16;
  const starCtx = starCanvas.getContext('2d');
  const gradient = starCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  starCtx.fillStyle = gradient;
  starCtx.fillRect(0, 0, 16, 16);
  const starTexture = new THREE.CanvasTexture(starCanvas);

  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.55,
    map: starTexture,
    transparent: true,
    opacity: 0.0, // START INVISIBLE (will fade in to 0.45)
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const particleMesh = new THREE.Points(particlesGeometry, particlesMaterial);
  scene.add(particleMesh);

  /* --- 2. 3D LOW-POLY PAPER AIRPLANE (ROYAL NAVY BLUE ACCENT) --- */
  const planeGroup = new THREE.Group();

  const planeGeom = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    // Nose tip to left wing & center fold
    0.0, 0.2, 2.5,   // Nose tip
    -2.4, 0.0, -1.8, // Left wingtip
    0.0, 0.0, -1.2,  // Central fold bottom

    // Nose tip to right wing & center fold
    0.0, 0.2, 2.5,   // Nose tip
    0.0, 0.0, -1.2,  // Central fold bottom
    2.4, 0.0, -1.8,  // Right wingtip

    // Underbody keel / fuselage rudder
    0.0, 0.2, 2.5,
    0.0, -0.7, -1.2,
    0.0, 0.0, -1.2,
  ]);

  planeGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  planeGeom.computeVertexNormals();

  // Rich Royal Navy Blue metallic PBR surface
  const planeMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    roughness: 0.6,
    metalness: 0.9,
    side: THREE.DoubleSide,
    transparent: false,
    opacity: 1.0
  });
  const paperAirplane = new THREE.Mesh(planeGeom, planeMat);
  planeGroup.add(paperAirplane);

  // Glowing electric blue wireframe overlay
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x60a5fa,
    wireframe: true,
    transparent: true,
    opacity: 0.55
  });
  const wireAirplane = new THREE.Mesh(planeGeom, wireMat);
  wireAirplane.scale.set(1.015, 1.015, 1.015);
  planeGroup.add(wireAirplane);

  scene.add(planeGroup);

  // 3D flight path of the airplane in world space (Catmull-Rom spline)
  const flightPoints = [
    new THREE.Vector3(12.8, 4.4, -1.0),  // 1. Hero: Start
    new THREE.Vector3(-14.8, 0.5, 2.4),  // 2. Fast arc
    new THREE.Vector3(-19.4, 1.2, -9.2), // 3. Left edge: Distance
    new THREE.Vector3(-9.0, 0.2, -14.6), // 4. Projects entry: Climbing
    new THREE.Vector3(4.8, -0.4, -11.6), // 5. Projects: Flying right
    new THREE.Vector3(13.1, -2.0, 0.0),  // 6. Projects (right edge): Diving
    new THREE.Vector3(-14.0, -2.6, 4.0), // 7. Skills: Deep space
    new THREE.Vector3(-18.9, -7.4, -8.7),// 8. About: Exiting upward
    new THREE.Vector3(-3.5, -6.2, -1.0), // 9. Contact / Footer: Stable glide
  ];

  const flightCurve = new THREE.CatmullRomCurve3(flightPoints, false, 'catmullrom', 0.5);
  // Start the plane off-screen to camouflage the initial shader compile
  planeGroup.position.copy(flightPoints[0]);
  planeGroup.position.x += 30.0;
  planeGroup.position.y += 20.0;

  let mouseX = 0;
  let mouseY = 0;
  let smoothMouseX = 0;
  let smoothMouseY = 0;
  let scrollFraction = 0;
  let smoothScrollFraction = 0;
  let currentBank = 0;

  // Reusable vectors and matrices
  const targetPos = flightPoints[0].clone();
  const forwardDir = new THREE.Vector3(0, 0, 1);
  const rotMatrix = new THREE.Matrix4();
  const targetQuat = new THREE.Quaternion();
  const worldUp = new THREE.Vector3(0, 1, 0);

  window.addEventListener('mousemove', (e) => {
    if (window.innerWidth <= 768) return;
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
  });

  let cachedInnerHeight = window.innerHeight;
  function updateScrollFraction() {
    const currentHeight = window.innerWidth <= 768 ? cachedInnerHeight : window.innerHeight;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - currentHeight);
    scrollFraction = window.scrollY / maxScroll;
    updateIconRect();
  }
  window.addEventListener('scroll', updateScrollFraction, { passive: true });
  
  let cachedIconRect = null;
  function updateIconRect() {
    const iconEl = document.getElementById('email-plane-icon');
    if (iconEl) {
      cachedIconRect = iconEl.getBoundingClientRect();
    }
  }

  let lastWidth = window.innerWidth;
  const isMobile = window.innerWidth <= 768;
  const canvasEl = document.getElementById('webgl-canvas');

  // Fix: On Android the address bar is at the top. When it hides, "top: 0" jumps.
  // Pin the canvas to the bottom on Android to avoid physical background jump.
  if (isMobile && canvasEl && navigator.userAgent.toLowerCase().includes('android')) {
    canvasEl.style.top = 'auto';
    canvasEl.style.bottom = '0';
  }

  window.addEventListener('resize', () => {
    // Fix: on mobile we ignore height-only changes (address bar) to prevent background jump
    if (window.innerWidth <= 768 && Math.abs(window.innerWidth - lastWidth) < 50) {
      return;
    }
    lastWidth = window.innerWidth;
    cachedInnerHeight = window.innerHeight;

    const currentHeight = window.innerWidth <= 768 ? cachedInnerHeight : window.innerHeight;

    camera.aspect = window.innerWidth / currentHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, currentHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    updateIconRect();
  });
  
  updateScrollFraction();
  updateIconRect();

  const clock = new THREE.Clock();

  let introProgress = 0.0;

  function animate3D() {
    requestAnimationFrame(animate3D);
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // 0. Camouflage shader compilation: Fade in stars and fly in airplane
    introProgress = Math.min(1.0, introProgress + delta * 0.8);
    particlesMaterial.opacity = introProgress * 0.45;

    // 1. Smooth, inertial scroll progress damping with flight speed limit
    let scrollStep = (scrollFraction - smoothScrollFraction) * 0.045;
    const maxSpeed = 0.35 * delta; // Max cruising speed (35% of route per second)
    if (scrollStep > maxSpeed) scrollStep = maxSpeed;
    if (scrollStep < -maxSpeed) scrollStep = -maxSpeed;
    smoothScrollFraction += scrollStep;
    
    let currentMouseX = window.innerWidth <= 768 ? 0 : mouseX;
    let currentMouseY = window.innerWidth <= 768 ? 0 : mouseY;
    smoothMouseX += (currentMouseX - smoothMouseX) * 0.06;
    smoothMouseY += (currentMouseY - smoothMouseY) * 0.06;

    const u = THREE.MathUtils.clamp(smoothScrollFraction, 0.0, 1.0);

    // 2. Base position from 3D curve
    const curvePos = flightCurve.getPointAt(u);

    // Intro offset: airplane flies in from the right and from above
    if (introProgress < 1.0) {
      const introEase = 1.0 - Math.pow(1.0 - introProgress, 3); // cubic ease out
      const offsetAmount = 1.0 - introEase;
      curvePos.x += offsetAmount * 30.0; // Flies in from far right
      curvePos.y += offsetAmount * 5.0;  // Flies in from above
    }

    // BLEND LOGIC
    let finalBlend = 0;
    if (u > 0.84) { // TWEAK: Landing start (e.g. 0.88 is slightly earlier than 0.90)
      finalBlend = THREE.MathUtils.clamp((u - 0.84) / 0.145, 0.0, 1.0);
      renderer.domElement.style.zIndex = '10';
      // TWEAK: Math for smooth transition.
      // (u - START) / LENGTH. Here START = 0.84, LENGTH = 0.145 (0.84 + 0.145 ≈ 0.985, landing ends there)
    } else {
      renderer.domElement.style.zIndex = '0';
    }
    
    // Update icon position every frame during landing (responds to CSS hover transform)
    if (finalBlend > 0) {
      updateIconRect();
    }

    let target3D = null;
    let baseIconWidth = 18.0;
    let currentIconWidth = baseIconWidth;

    if (cachedIconRect && finalBlend > 0) {
      const rect = cachedIconRect;
      if (rect.width > 0) {
        currentIconWidth = rect.width;
        // TWEAK: Vertical icon offset in pixels (e.g. -1 = 1px higher, +1 = lower)
        const yOffsetPx = -1; 
        
        const ndcX = (rect.left + rect.width / 2) / window.innerWidth * 2 - 1;
        const ndcY = -((rect.top + yOffsetPx) + rect.height / 2) / window.innerHeight * 2 + 1;
        const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
        vec.unproject(camera);
        const dir = vec.sub(camera.position).normalize();
        const distance = (4.0 - camera.position.z) / dir.z; 
        target3D = camera.position.clone().add(dir.multiplyScalar(distance));
      }
    }

    if (target3D) {
      curvePos.lerp(target3D, finalBlend);
    }

    // 3. Organic aerodynamic drift (thermals and gentle air sway)
    const ambientTime = time * 0.75;
    let swayX = Math.sin(ambientTime * 0.8) * 0.28 + Math.cos(ambientTime * 1.4) * 0.12;
    let swayY = Math.sin(ambientTime * 1.2) * 0.22 + Math.sin(ambientTime * 2.3) * 0.07;
    let swayZ = Math.cos(ambientTime * 0.9) * 0.24;

    if (finalBlend > 0) {
      swayX *= (1 - finalBlend);
      swayY *= (1 - finalBlend);
      swayZ *= (1 - finalBlend);
    }

    // Mouse flight control (gentle impact on the airplane's position in the frame)
    targetPos.x = curvePos.x + swayX + smoothMouseX * 1.35 * (1 - finalBlend);
    targetPos.y = curvePos.y + swayY + smoothMouseY * 0.90 * (1 - finalBlend);
    targetPos.z = curvePos.z + swayZ;
    
    // Scale adjustment for landing
    const baseFinalScale = 0.06; // TWEAK: Change this value to resize the final landing icon
    const dynamicFinalScale = baseFinalScale * (currentIconWidth / baseIconWidth);
    const currentScale = 1.0 * (1 - finalBlend) + dynamicFinalScale * finalBlend;
    planeGroup.scale.setScalar(currentScale);

    // Fade and Color Transition
    planeMat.opacity = 1.0 - finalBlend;
    wireMat.opacity = 0.55 + 0.45 * finalBlend;
    const startColor = new THREE.Color(0x60a5fa);
    const endColor = new THREE.Color(0x000000);
    wireMat.color.copy(startColor).lerp(endColor, finalBlend);

    // Keep the SVG hidden, we will use the 3D plane exclusively
    const iconEl = document.getElementById('email-plane-icon');
    if (iconEl) {
      iconEl.style.opacity = '0';
      planeGroup.visible = true;
    }

    // Smooth flight inertia in 3D space
    planeGroup.position.x += (targetPos.x - planeGroup.position.x) * 0.052;
    planeGroup.position.y += (targetPos.y - planeGroup.position.y) * 0.052;
    planeGroup.position.z += (targetPos.z - planeGroup.position.z) * 0.052;

    // 4. Flight direction (3D curve tangent + mouse steering)
    // The curve tangent determines the natural nose azimuth
    const baseTangent = flightCurve.getTangentAt(u).normalize();

    // Calculate horizontal turn on the path (for realistic wing banking)
    const uAhead = Math.min(1.0, u + 0.025);
    const aheadTangent = flightCurve.getTangentAt(uAhead).normalize();

    // Transverse vector R0 (right wing in the horizontal plane)
    let R0 = new THREE.Vector3().crossVectors(worldUp, baseTangent);
    if (R0.lengthSq() < 0.0001) {
      R0.set(1, 0, 0);
    } else {
      R0.normalize();
    }

    // Measure turn force and direction relative to the airplane (turn rate)
    const turnLateral = (aheadTangent.clone().sub(baseTangent)).dot(R0);
    const curveBank = THREE.MathUtils.clamp(turnLateral * 20.0, -0.70, 0.70);

    // Mouse impact on roll and pitch angle
    const mouseBank = -smoothMouseX * 0.38;
    const mousePitch = -smoothMouseY * 0.16;
    const mouseYaw = smoothMouseX * 0.14;

    // Target wing roll (aerodynamic turn + cursor reaction)
    const targetBank = THREE.MathUtils.clamp(curveBank + mouseBank, -0.80, 0.80);
    currentBank += (targetBank - currentBank) * 0.058;

    // Orient nose vector (F) with mouse steering
    forwardDir.copy(baseTangent)
      .addScaledVector(R0, mouseYaw)
      .addScaledVector(worldUp, mousePitch)
      .normalize();

    // Build orthonormal basis (wings R, up U, nose F) with roll rotation
    const normalUp = new THREE.Vector3().crossVectors(forwardDir, R0).normalize();
    const cosB = Math.cos(currentBank);
    const sinB = Math.sin(currentBank);

    const R = new THREE.Vector3()
      .copy(R0).multiplyScalar(cosB)
      .addScaledVector(normalUp, sinB)
      .normalize();

    const U = new THREE.Vector3()
      .copy(normalUp).multiplyScalar(cosB)
      .addScaledVector(R0, -sinB)
      .normalize();

    rotMatrix.makeBasis(R, U, forwardDir);
    targetQuat.setFromRotationMatrix(rotMatrix);

    if (typeof finalBlend !== 'undefined' && finalBlend > 0) {
      const upRight = new THREE.Vector3(1, 1, 0).normalize(); 
      const toCamera = new THREE.Vector3(0, 0, 1).normalize(); 
      const rightVec = new THREE.Vector3().crossVectors(toCamera, upRight).normalize(); 
      const finalM = new THREE.Matrix4().makeBasis(rightVec, toCamera, upRight);
      const finalQ = new THREE.Quaternion().setFromRotationMatrix(finalM);
      targetQuat.slerp(finalQ, finalBlend);
    }

    // 5. Extremely smooth, delayed spherical rotation interpolation (Slerp)
    // Ensures smooth cornering without sudden flips
    const slerpFactor = (typeof finalBlend !== 'undefined' && finalBlend > 0) ? 0.062 + 0.15 * finalBlend : 0.062;
    planeGroup.quaternion.slerp(targetQuat, slerpFactor);

    // 6. Subtle starfield rotation and mouse parallax
    particleMesh.rotation.y += 0.0004;
    particleMesh.rotation.x += 0.00015;
    particleMesh.position.x += 0.04 * (mouseX * 0.5 - particleMesh.position.x);
    particleMesh.position.y += 0.04 * (mouseY * 0.5 - particleMesh.position.y);

    // Draw main scene
    renderer.clear();
    renderer.render(scene, camera);

  }
  animate3D();
}
