/**
 * LUSION-PROJECTS.JS — REVERSE-ENGINEERED LUSION.CO FEATURED WORK ENGINE
 * Features:
 * 1. WebGL 3D Mesh pipeline with Orthographic pixel-perfect DOM tracking
 * 2. 2.5D Raymarched Parallax with Depth Map (photo.jpeg + photo-depth.jpeg)
 * 3. Smooth Outward Cylinder 3D Scroll Corner Distortion (continuous, no tearing)
 * 4. Card Entrance Frame Expansion: frame expands from 75% to 100% on every scroll in/out
 * 5. Optical Camera Autofocus Hunting Blur (on hover enter: quick hunt & lock sequence)
 * 6. Optimized Image Scale (ZOOM_SCALE = 0.99 constant, maximizing visible image)
 * 7. Smooth Parallax on mousemove (jitter-free, gentle sensitivity)
 * 8. ASCII Glitch Text Scrambler typing left-to-right (only on entrance into view)
 * 9. Title Right-to-Left Cascade & Arrow easing with smooth cubic-bezier(0.4, 0.0, 0.15, 1)
 * 10. Case Study Modal Drawer binding
 */

(function () {
  'use strict';

  /* GLSL SHADER SOURCES */
  const vertexShader = `
    varying vec2 v_uv;
    varying vec2 v_ndc;

    void main() {
      v_uv = uv;
      vec4 pos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      v_ndc = pos.xy / pos.w;
      gl_Position = pos;
    }
  `;

  const fragmentShader = `
    precision highp float;

    uniform sampler2D u_texture;
    uniform sampler2D u_depthTexture;
    uniform vec2 u_textureSize;
    uniform vec2 u_domWH;
    uniform vec2 u_meshWH;
    uniform float u_isLeft;
    uniform float u_rollDx;
    uniform float u_cornerDxTop;
    uniform float u_cornerDxBottom;
    uniform vec2 u_resolution;
    uniform vec2 u_shiftXY;
    uniform vec3 u_focusPos;
    uniform float u_time;
    uniform float u_focusProgress;
    uniform float u_afStrength;
    uniform vec2 u_lensShake;
    uniform float u_showRatio;
    uniform float u_globalRadius;
    uniform float u_opacity;
    varying vec2 v_uv;
    varying vec2 v_ndc;

    #define PARALLAX_LAYERS 16

    // Depth sampling function with clean background noise cutoff:
    // Ensures black background (depth = 0.0) is mathematically 0.0 and 100% static
    float sampleDepth(vec2 coord) {
      float raw = texture2D(u_depthTexture, clamp(coord + 0.5, 0.001, 0.999)).r;
      return raw < 0.03 ? 0.0 : ((raw - 0.03) / 0.97);
    }

    float linearStep(float edge0, float edge1, float x) {
      return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    }

    // Signed Distance Function for a 2D rounded box centered at (0, 0)
    float sdRoundedBox(in vec2 p, in vec2 b, in float r) {
      vec2 q = abs(p) - b + r;
      return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
    }

    // Pseudo-random blue noise approximation for jitter and bokeh spiral
    vec2 getNoise(vec2 coord) {
      float n1 = fract(sin(dot(coord, vec2(12.9898, 78.233))) * 43758.5453);
      float n2 = fract(sin(dot(coord, vec2(39.346, 11.135))) * 23421.6312);
      return vec2(n1, n2);
    }

    void main() {
      // 1. Pixel coordinate p in screen-aligned mesh space relative to card center
      // v_uv ranges [0, 1] across the expanded geometry quad (u_meshWH)
      vec2 p = (v_uv - 0.5) * u_meshWH;

      // 2. Global screen-space cylinder roll curvature (Hourglass / Apple-Core profile)
      // Evaluated continuously in window NDC coordinates:
      // - At window center (v_ndc.y = 0.0): flare = 0% (0px displacement, side stays in place).
      // - At halfway (abs(v_ndc.y) = 0.5): flare = 0.5^2 = 25% displacement.
      // - At window edges (abs(v_ndc.y) >= 1.0): flare = 100% displacement.
      // Continuous mathematical curve: every point along the side follows this exact quadratic arc.
      float distCenter = clamp(abs(v_ndc.y), 0.0, 1.0);
      float flareFactor = distCenter * distCenter;
      float flare = flareFactor * u_rollDx;

      float halfH = u_domWH.y * 0.5;
      float halfW = u_domWH.x * 0.5;

      // Continuous horizontal ramp from inner edge (0) to outer edge (1)
      // Inner column edges stay 100% flat and parallel, outer edges form the concave hourglass curve:
      vec2 pWarped = p;
      if (u_isLeft > 0.5) {
        // Left Column Cards: outer edge is to the LEFT (-halfW)
        float uRamp = clamp((halfW - p.x) / u_domWH.x, 0.0, 1.0);
        pWarped.x += uRamp * flare;
      } else {
        // Right Column Cards: outer edge is to the RIGHT (+halfW)
        float uRamp = clamp((p.x + halfW) / u_domWH.x, 0.0, 1.0);
        pWarped.x -= uRamp * flare;
      }

      // 3. Card frame entrance expansion (smoothly grows from 75% to 100% size)
      float smoothShow = smoothstep(0.0, 1.0, u_showRatio);
      float frameScale = mix(0.90, 1.0, smoothShow);
      vec2 halfDom = u_domWH * 0.5 * frameScale;

      // 4. Anti-aliased SDF clipping mask
      float d = sdRoundedBox(pWarped, halfDom, u_globalRadius);
      float aa = max(fwidth(d), 0.7);
      float imageAlpha = smoothstep(aa, -aa, d);
      if (imageAlpha <= 0.005) {
        discard;
      }

      // 5. Optimized Object-Fit: Cover UV mapping
      // Fixed zoom scale = 0.94 (~6% safe buffer horizontally, 21% vertically).
      // Shows as much of the original photo as possible, does not zoom in/out on hover,
      // and ensures mouse parallax never goes out of bounds.
      vec2 toUvSpace = 1.0 / (u_textureSize * max(u_domWH.x / u_textureSize.x, u_domWH.y / u_textureSize.y));
      const float ZOOM_SCALE = 0.99;
      vec2 uv = pWarped * toUvSpace * ZOOM_SCALE;

      // 6. Depth Parallax Occlusion Mapping (POM)
      // The black background (depth = 0.0) is mathematically 100% static and anchored.
      // Foreground layers (depth > 0.0) displace smoothly and proportionally to their depth.
      vec2 baseUv = uv;
      const float PARALLAX_SCALE = 0.055;
      vec2 parallaxShift = u_shiftXY * PARALLAX_SCALE;

      float layerStep = 1.0 / float(PARALLAX_LAYERS);
      float currentLayer = 1.0;
      vec2 currentUv = baseUv + parallaxShift * currentLayer;
      float currentDepth = sampleDepth(currentUv);

      vec2 prevUv = currentUv;
      float prevLayer = currentLayer;
      float prevDepth = currentDepth;

      for (int i = 0; i < PARALLAX_LAYERS; i++) {
        if (currentLayer <= currentDepth) {
          break;
        }
        prevUv = currentUv;
        prevLayer = currentLayer;
        prevDepth = currentDepth;

        currentLayer -= layerStep;
        currentUv = baseUv + parallaxShift * currentLayer;
        currentDepth = sampleDepth(currentUv);
      }

      float afterDepth = currentDepth - currentLayer;
      float beforeDepth = prevLayer - prevDepth;
      float denom = afterDepth + beforeDepth;
      float weight = denom > 0.00001 ? clamp(afterDepth / denom, 0.0, 1.0) : 0.0;
      uv = mix(currentUv, prevUv, weight);

      // Micro lens shake on hover autofocus (affects only foreground, background stays rock-solid)
      float depth = sampleDepth(uv);
      uv += u_lensShake * smoothstep(0.01, 0.20, depth);

      // 7. Depth Rack Autofocus Blur removed for performance
      vec2 sampleUv = clamp(uv + 0.5, 0.001, 0.999);
      vec3 color = texture2D(u_texture, sampleUv).rgb;

      // 8. Subtle technological contrast & grading
      float luma = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(vec3(luma), color, 1.05);

      gl_FragColor = vec4(color, imageAlpha * u_opacity);
    }
  `;

  /* WEBGL SHADER ENGINE */
  class LusionProjectsWebGL {
    constructor() {
      this.container = document.getElementById('projects-grid') || document.querySelector('.project-list');
      if (!this.container) return;

      this.isInitialized = false;

      if (window.innerWidth > 768) {
        this.initializeEngine();
      }

      window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && !this.isInitialized) {
          this.initializeEngine();
        }
      }, { passive: true });
    }

    initializeEngine() {
      this.isInitialized = true;
      this.initCanvas();
      this.initThree();
      this.textureLoader = new THREE.ImageBitmapLoader();
      this.textureLoader.setOptions({ imageOrientation: 'flipY' });
      this.textureCache = new Map();
      this.defaultDepthTexture = this.createDefaultDepthTexture();
      this.buildMeshes();
      this.bindEvents();

      // Optimization: sleep rendering loop when section is not visible
      this.isVisible = true; // Default true, to render at least the first frame
      if (this.container) {
        this.visibilityObserver = new IntersectionObserver((entries) => {
          this.isVisible = entries[0].isIntersecting;
        }, { rootMargin: '300px' });
        this.visibilityObserver.observe(this.container);
      }

      this.animate();
    }

    initCanvas() {
      // Force projects to create their own canvas (#projects-webgl-canvas),
      // so it can have an independent z-index and not conflict with the airplane (#webgl-canvas).
      
      let canvas = document.getElementById('projects-webgl-canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'projects-webgl-canvas';
        document.body.appendChild(canvas);
      }
      this.canvas = canvas;
    }

    initThree() {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));

      this.scene = new THREE.Scene();
      window.SharedProjectsScene = this.scene;

      // Orthographic camera for 1:1 pixel coordinates mapping
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 1000);
      this.camera.position.z = 10;
      window.SharedProjectsCamera = this.camera;

      this.items = [];
      this.planeGeometry = new THREE.PlaneGeometry(1, 1, 16, 16);

      this.scrollVelocity = 0;
      this.smoothScrollVelocity = 0;
      this.lastScrollY = window.scrollY;
      this.time = 0;
    }

    // Creates a 1x1 flat fallback texture (depth 0.0 = no parallax deformation when depth file is missing)
    createDefaultDepthTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 2;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 2, 2);
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
      return tex;
    }

    // Automatically finds the depth map file with -depth suffix (e.g. 'eKapitula.webp' -> 'eKapitula-depth.webp')
    deriveDepthSrc(colorSrc) {
      if (!colorSrc) return 'photo-depth.jpeg';
      const clean = colorSrc.split('?')[0].split('#')[0];
      const lastDot = clean.lastIndexOf('.');
      if (lastDot === -1) return clean + '-depth';
      return clean.substring(0, lastDot) + '-depth' + clean.substring(lastDot);
    }

    loadTexture(url, isDepth = false, onLoaded = null) {
      if (!url) return isDepth ? this.defaultDepthTexture : null;

      if (this.textureCache.has(url)) {
        const entry = this.textureCache.get(url);
        if (entry.isLoaded) {
          if (onLoaded) onLoaded(entry.texture);
        } else if (onLoaded) {
          entry.callbacks.push(onLoaded);
        }
        return entry.texture;
      }

      const entry = {
        texture: new THREE.Texture(),
        isLoaded: false,
        callbacks: onLoaded ? [onLoaded] : []
      };

      // ImageBitmapLoader decodes in parallel (asynchronously) before passing to WebGL,
      // instead of standard loading which blocks the main thread during decode.
      this.textureLoader.load(
        url,
        (imageBitmap) => {
          const tex = entry.texture;
          tex.image = imageBitmap;
          tex.generateMipmaps = !isDepth;
          tex.minFilter = isDepth ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter;
          tex.magFilter = isDepth ? THREE.NearestFilter : THREE.LinearFilter;
          
          if (this.renderer && !isDepth) {
            tex.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
          }
          
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.needsUpdate = true;
          
          if (this.renderer && typeof this.renderer.initTexture === 'function') {
            this.renderer.initTexture(tex);
          }

          entry.isLoaded = true;
          const cbs = entry.callbacks.slice();
          entry.callbacks = [];
          cbs.forEach((cb) => {
            try { cb(tex); } catch (e) { console.error(e); }
          });
        },
        undefined,
        (err) => {
          if (isDepth) {
            console.warn(`Lusion WebGL: depth map "${url}" not found. Using default flat depth.`);
          } else {
            console.warn(`Lusion WebGL: error loading image "${url}". DOM fallback active.`, err);
          }
        }
      );

      this.textureCache.set(url, entry);
      return entry.texture;
    }
    updateRects() {
      const scrollY = window.scrollY;
      this.items.forEach(item => {
        const rect = item.domMain.getBoundingClientRect();
        item.cachedRect = {
          width: rect.width,
          height: rect.height,
          left: rect.left,
          top: rect.top + scrollY
        };
      });
    }

    buildMeshes() {
      const projectItems = document.querySelectorAll('.project-item');
      const BLEED_X = 140;
      const BLEED_Y = 60;

      projectItems.forEach((domItem, index) => {
        const domMain = domItem.querySelector('.project-item-main');
        if (!domMain) return;

        // Read the image assigned to the card in HTML (e.g. <img src="eKapitula.webp"> or data-image / data-depth)
        const img = domMain.querySelector('.project-item-image') || domMain.querySelector('img');
        const colorSrc = domItem.dataset.image || (img ? (img.getAttribute('src') || img.src) : 'photo.jpeg');
        const depthSrc = domItem.dataset.depth || (img ? img.getAttribute('data-depth') : null) || this.deriveDepthSrc(colorSrc);

        const imgNaturalW = (img && (img.naturalWidth || img.width)) || 0;
        const imgNaturalH = (img && (img.naturalHeight || img.height)) || 0;
        const initialW = imgNaturalW > 0 ? imgNaturalW : 1200;
        const initialH = imgNaturalH > 0 ? imgNaturalH : 900;

        const isLeft = (index % 2 === 0) ? 1.0 : 0.0;

        const uniforms = {
          u_texture: { value: this.defaultDepthTexture },
          u_depthTexture: { value: this.defaultDepthTexture },
          u_textureSize: { value: new THREE.Vector2(initialW, initialH) },
          u_domWH: { value: new THREE.Vector2(400, 225) },
          u_meshWH: { value: new THREE.Vector2(400 + BLEED_X * 2, 225 + BLEED_Y * 2) },
          u_isLeft: { value: isLeft },
          u_rollDx: { value: 0.0 },
          u_cornerDxTop: { value: 0.0 },
          u_cornerDxBottom: { value: 0.0 },
          u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          u_shiftXY: { value: new THREE.Vector2(0, 0) },
          u_focusPos: { value: new THREE.Vector3(0, 0, -1) },
          u_time: { value: 0 },
          u_focusProgress: { value: 0.0 },
          u_afStrength: { value: 0.0 },
          u_lensShake: { value: new THREE.Vector2(0, 0) },
          u_showRatio: { value: 0 },
          u_globalRadius: { value: 16.0 },
          u_opacity: { value: 1.0 }
        };

        // Load dedicated color texture for this project
        const colorTex = this.loadTexture(colorSrc, false, (tex) => {
          uniforms.u_texture.value = tex;
          const w = (tex.image && (tex.image.naturalWidth || tex.image.width)) || 0;
          const h = (tex.image && (tex.image.naturalHeight || tex.image.height)) || 0;
          if (w > 0 && h > 0) {
            uniforms.u_textureSize.value.set(w, h);
          }
          document.body.classList.add('webgl-active');
        });
        if (colorTex) {
          uniforms.u_texture.value = colorTex;
          const w = (colorTex.image && (colorTex.image.naturalWidth || colorTex.image.width)) || 0;
          const h = (colorTex.image && (colorTex.image.naturalHeight || colorTex.image.height)) || 0;
          if (w > 0 && h > 0) {
            uniforms.u_textureSize.value.set(w, h);
          }
        }

        // Load dedicated depth map texture for this project (or flat fallback)
        const depthTex = this.loadTexture(depthSrc, true, (tex) => {
          uniforms.u_depthTexture.value = tex;
        });
        if (depthTex) {
          uniforms.u_depthTexture.value = depthTex;
        }

        const material = new THREE.ShaderMaterial({
          vertexShader: vertexShader,
          fragmentShader: fragmentShader,
          uniforms: uniforms,
          transparent: true,
          depthTest: false,
          depthWrite: false
        });

        const mesh = new THREE.Mesh(this.planeGeometry, material);
        this.scene.add(mesh);

        const itemState = {
          domItem,
          domMain,
          mesh,
          material,
          uniforms,
          index,
          isHover: false,
          hoverStartTime: 0,
          focusProgress: 0.0,
          afStrength: 0.0,
          focusPos: new THREE.Vector3(0, 0, -1),
          shiftXY: new THREE.Vector2(0, 0),
          shiftXYTarget: new THREE.Vector2(0, 0),
          mouseRel: { x: 0, y: 0 },
          showRatio: 0,
          currentDxTop: 0,
          currentDxBottom: 0,
          cachedRect: { width: 0, height: 0, left: 0, top: 0 }
        };

        this.items.push(itemState);
        domItem._webglItem = itemState;

        // Clean mouse hover listeners: trigger optical depth rack focus sweep on enter
        domItem.addEventListener('mouseenter', (e) => {
          itemState.isHover = true;
          itemState.hoverStartTime = performance.now();
          itemState.focusProgress = 0.0;
          itemState.afStrength = 1.0;

          const scrollY = window.scrollY;
          if (itemState.cachedRect && itemState.cachedRect.width > 0) {
            itemState.mouseRel.x = (e.clientX - itemState.cachedRect.left) / itemState.cachedRect.width - 0.5;
            itemState.mouseRel.y = (e.clientY - (itemState.cachedRect.top - scrollY)) / itemState.cachedRect.height - 0.5;
          }

          const cur = document.getElementById('cursor');
          if (cur) cur.classList.add('hover');
        });

        domItem.addEventListener('mouseleave', () => {
          itemState.isHover = false;
          itemState.afStrength = 0.0;
          itemState.focusProgress = 1.0;

          const cur = document.getElementById('cursor');
          if (cur) cur.classList.remove('hover');
        });

        domItem.addEventListener('mousemove', (e) => {
          const scrollY = window.scrollY;
          if (itemState.cachedRect && itemState.cachedRect.width > 0) {
            itemState.mouseRel.x = (e.clientX - itemState.cachedRect.left) / itemState.cachedRect.width - 0.5;
            itemState.mouseRel.y = (e.clientY - (itemState.cachedRect.top - scrollY)) / itemState.cachedRect.height - 0.5;
          }
        });
      });
      
      // Initial cache fill
      setTimeout(() => this.updateRects(), 100);
      window.addEventListener('load', () => this.updateRects());
      
      // FORCE SHADER COMPILATION: eliminates hitch on first scroll
      this.renderer.compile(this.scene, this.camera);
    }

    bindEvents() {
      // Layout observer (fixes misaligned images when document height changes)
      const resizeObserver = new ResizeObserver(() => {
        this.updateRects();
      });
      resizeObserver.observe(document.body);
      
      window.addEventListener('resize', () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.renderer.setSize(w, h);
        this.camera.left = -w / 2;
        this.camera.right = w / 2;
        this.camera.top = h / 2;
        this.camera.bottom = -h / 2;
        this.camera.updateProjectionMatrix();

        this.items.forEach((item) => {
          item.uniforms.u_resolution.value.set(w, h);
        });
        
        this.updateRects();
      }, { passive: true });

      // Lightweight event fired by modal-drawer.js to update positions only (without heavy WebGL resize)
      window.addEventListener('updateProjectRects', () => {
        this.updateRects();
      });

      window.addEventListener('scroll', () => {
        const currentY = window.scrollY;
        this.scrollVelocity = currentY - this.lastScrollY;
        this.lastScrollY = currentY;
      }, { passive: true });
    }

    animate() {
      requestAnimationFrame(() => this.animate());
      window.SharedProjectsVisible = this.isVisible;

      // Sleep heavy calculations and rendering when the projects section is off-screen
      // Also stop on mobile screens (resize resilience)
      if (!this.isVisible || window.innerWidth <= 768) return;

      const now = performance.now() * 0.001;
      const dt = 0.016;
      this.time = now;

      // Smooth scroll velocity damping
      this.smoothScrollVelocity += (this.scrollVelocity - this.smoothScrollVelocity) * 0.12;
      this.scrollVelocity *= 0.84;

      const vW = window.innerWidth;
      const vH = window.innerHeight;

      // =========================================================================
      // GLOBAL CYLINDRICAL SCROLL PHYSICS (WHOLE SECTION AS ONE GIANT CARD)
      // All card points across the window height form a single coherent 3D roll.
      // The center of the window is stationary, and edges bend smoothly according to distance.
      // =========================================================================
      const MAX_ROLL_DX = 64.0;     // Maximum edge bend at the screen border (px)
      const speed = Math.abs(this.smoothScrollVelocity);

      // Smooth non-linear velocity saturation (soft compression, no sharp jumps)
      const normSpeed = Math.min(1.0, speed / 32.0);
      const targetRoll = MAX_ROLL_DX * (normSpeed * (2.0 - normSpeed));

      // Asymmetric smoothing:
      // - Attack (bending): smoother, less abrupt, slightly delayed (lerp ~0.085)
      // - Recovery (straightening): slower and softer (lerp ~0.045)
      this.currentRoll = this.currentRoll || 0;
      const rollLerpSpeed = targetRoll > this.currentRoll ? 0.085 : 0.045;
      this.currentRoll += (targetRoll - this.currentRoll) * rollLerpSpeed;
      if (Math.abs(this.currentRoll) < 0.05) this.currentRoll = 0;

      const BLEED_X = 140;
      const BLEED_Y = 60;

      // Depth parallax parameters
      const ENABLE_LENS_SHAKE = false;   // Set to true to enable camera shake on hover
      const afDuration = 0.50; // Snappy 500ms total rack focus sequence
      const PARALLAX_STRENGTH = 0.35;   // Mouse movement sensitivity
      const PARALLAX_DIR_X = -1.0;       // Horizontal direction: 1.0 (normal) or -1.0 (inverted)
      const PARALLAX_DIR_Y = 1.0;        // Vertical direction: 1.0 (normal) or -1.0 (inverted)
      const PARALLAX_SMOOTHING = 0.055;  // Smoothness of cursor tracking
      const RETURN_SMOOTHING = 0.01;     // Smoothness of return to center (lower = slower return)

      const currentScrollY = window.scrollY;

      this.items.forEach((item) => {
        // Instead of getBoundingClientRect, use cachedRect + scroll offset
        const rect = {
          width: item.cachedRect.width,
          height: item.cachedRect.height,
          left: item.cachedRect.left,
          top: item.cachedRect.top - currentScrollY
        };

        // Viewport frustum culling
        let targetOpacity = 1.0;
        if (window.activeProjectDom && item.domItem !== window.activeProjectDom) {
            targetOpacity = 0.0;
        }

        if ((window.activeProjectDom && item.domItem === window.activeProjectDom) || item.domItem.classList.contains('active-closing')) {
            item.mesh.renderOrder = 999;
        } else {
            item.mesh.renderOrder = 0;
        }

        item.currentOpacity = item.currentOpacity !== undefined ? item.currentOpacity : 1.0;
        item.currentOpacity += (targetOpacity - item.currentOpacity) * 0.1;
        item.uniforms.u_opacity.value = item.currentOpacity;

        if ((rect.bottom < -120 || rect.top > vH + 120) || (item.currentOpacity < 0.01 && targetOpacity === 0.0)) {
          item.mesh.visible = false;
          return;
        }

        item.mesh.visible = true;

        // Position & scale matching DOM element with bleed margin
        item.mesh.scale.set(rect.width + BLEED_X * 2, rect.height + BLEED_Y * 2, 1);
        item.mesh.position.x = rect.left + rect.width / 2 - vW / 2;
        item.mesh.position.y = -(rect.top + rect.height / 2 - vH / 2);

        item.uniforms.u_domWH.value.set(rect.width, rect.height);
        item.uniforms.u_meshWH.value.set(rect.width + BLEED_X * 2, rect.height + BLEED_Y * 2);
        item.uniforms.u_resolution.value.set(vW, vH);
        item.uniforms.u_time.value = this.time;
        item.uniforms.u_rollDx.value = this.currentRoll;

        // Ensure u_textureSize always precisely matches actual image dimensions (no squashing/stretching)
        const curTex = item.uniforms.u_texture.value;
        if (curTex && curTex.image) {
          const imgW = curTex.image.naturalWidth || curTex.image.videoWidth || curTex.image.width || 0;
          const imgH = curTex.image.naturalHeight || curTex.image.videoHeight || curTex.image.height || 0;
          if (imgW > 0 && imgH > 0) {
            if (item.uniforms.u_textureSize.value.x !== imgW || item.uniforms.u_textureSize.value.y !== imgH) {
              item.uniforms.u_textureSize.value.set(imgW, imgH);
            }
          }
        }

        // Dynamic column detection: left column if center is on left half
        const isLeft = (rect.left + rect.width / 2 <= vW / 2 + 5) ? 1.0 : 0.0;
        item.uniforms.u_isLeft.value = isLeft;

        // Entrance show ratio: frame expands from 75% to 100% on every scroll into view
        if (item.domItem._isIntersecting) {
          item.showRatio = Math.min(1.0, item.showRatio + dt * 1.15);
        } else {
          item.showRatio = 0.0;
        }
        item.uniforms.u_showRatio.value = item.showRatio;

        // Optical Depth Rack Autofocus Sweep & Mechanical Lens Shake
        if (item.isHover) {
          const elapsed = (performance.now() - item.hoverStartTime) * 0.001; // seconds

          // Visible mechanical lens autofocus vibration (shakes image directly inside the card frame)
          let shakeUvX = 0;
          let shakeUvY = 0;
          if (ENABLE_LENS_SHAKE && elapsed < 0.28) {
            const decay = Math.exp(-elapsed * 14.0); // sharp decay in ~250ms
            const freq = 48.0; // crisp lens click vibration
            const amp = 0.0075; // ~5-6px visible displacement inside card
            shakeUvX = Math.sin(elapsed * freq) * decay * amp;
            shakeUvY = Math.cos(elapsed * (freq * 1.3)) * decay * (amp * 0.6);
          }
          item.uniforms.u_lensShake.value.set(shakeUvX, shakeUvY);

          if (elapsed < afDuration) {
            item.focusProgress = elapsed / afDuration;
            item.afStrength = 1.0;
          } else {
            // Locked in crystal razor-sharp focus
            item.focusProgress = 1.0;
            item.afStrength = 0.0;
          }

          item.shiftXYTarget.set(
            item.mouseRel.x * PARALLAX_STRENGTH * PARALLAX_DIR_X,
            item.mouseRel.y * PARALLAX_STRENGTH * PARALLAX_DIR_Y
          );
          item.shiftXY.lerp(item.shiftXYTarget, PARALLAX_SMOOTHING);
        } else {
          item.afStrength = Math.max(0.0, item.afStrength - 0.2);
          item.focusProgress = 1.0;
          item.uniforms.u_lensShake.value.set(0, 0);

          item.focusPos.x += (0 - item.focusPos.x) * 0.12;
          item.focusPos.y += (0 - item.focusPos.y) * 0.12;

          item.shiftXYTarget.set(0, 0);
          item.shiftXY.lerp(item.shiftXYTarget, RETURN_SMOOTHING); // Using separate return smoothing value
        }

        item.uniforms.u_focusProgress.value = item.focusProgress;
        item.uniforms.u_afStrength.value = item.afStrength;
        item.uniforms.u_focusPos.value.copy(item.focusPos);
        item.uniforms.u_shiftXY.value.copy(item.shiftXY);
      });

      this.renderer.render(this.scene, this.camera);
    }
  }

  /* DOM INTERACTION & TYPOGRAPHY ENGINE */
  class LusionProjectsDOM {
    constructor() {
      this.initAsciiGlitchTags();
      this.initIntersectionReveal();
      this.initTitleLetterGravity();
      this.initModalTriggers();
      this.initSectionHeaderAnimations();
    }

    // Smooth card entrance and exit from view (animation repeats every time)
    initIntersectionReveal() {
      const items = document.querySelectorAll('.project-item');
      if (!items.length) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          const line1 = el.querySelector('.project-item-line-1');

          if (entry.isIntersecting) {
            el.classList.add('is-revealed');
            el._isIntersecting = true;
            // Trigger tag typing left-to-right ONLY on entering the viewport
            if (line1 && line1._triggerGlitch) {
              line1._triggerGlitch();
            }
          } else {
            // Reset state when leaving the screen
            el.classList.remove('is-revealed');
            el._isIntersecting = false;
            if (el._webglItem) {
              el._webglItem.showRatio = 0.0;
            }
            if (line1 && line1._resetGlitch) {
              line1._resetGlitch();
            }
          }
        });
      }, {
        threshold: 0.06,
        rootMargin: '20px 0px 20px 0px'
      });

      items.forEach((item) => observer.observe(item));
    }

    // Universal left-to-right decipherer with a running cursor of random glyphs
    setupAsciiGlitchElement(el, options = {}) {
      if (!el || el._glitchInitialized) return;
      el._glitchInitialized = true;

      const GLYPHS = options.glyphs || '!@#$%^&*()_+{}[]:;<>?/\\|~0123456789ABCDEF';
      const originalText = el.dataset.original || el.textContent.trim().replace(/\s+/g, ' ');
      el.dataset.original = originalText;

      // Empty by default until element enters the viewport
      el.textContent = '';

      let frameId = null;
      let startTime = null;
      const charsPerSecond = options.charsPerSecond || 34; // Typing speed in characters per second
      const headSize = options.headSize || 4;              // Length of the random glyph cursor at the front

      const runGlitch = () => {
        if (frameId) cancelAnimationFrame(frameId);
        startTime = performance.now();

        const updateGlitch = (now) => {
          const elapsed = (now - startTime) * 0.001; // in seconds
          const typedCount = Math.floor(elapsed * charsPerSecond);
          const resolvedCount = Math.max(0, typedCount - headSize);
          const activeCount = Math.min(originalText.length, typedCount);

          let result = '';
          // 1. Letters already resolved (from left to resolvedCount)
          for (let i = 0; i < resolvedCount; i++) {
            result += originalText[i];
          }
          // 2. Cursor with rotating random digits/symbols
          for (let i = resolvedCount; i < activeCount; i++) {
            const ch = originalText[i];
            if (ch === ' ' || ch === '•' || ch === '/') {
              result += ch;
            } else {
              result += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            }
          }
          // 3. Remaining text after cursor is still untyped

          el.textContent = result;

          if (resolvedCount < originalText.length) {
            frameId = requestAnimationFrame(updateGlitch);
          } else {
            el.textContent = originalText;
          }
        };

        frameId = requestAnimationFrame(updateGlitch);
      };

      el._triggerGlitch = runGlitch;
      el._resetGlitch = () => {
        if (frameId) cancelAnimationFrame(frameId);
        el.textContent = '';
      };
    }

    // Decipherer for project card tags (.project-item-line-1)
    initAsciiGlitchTags() {
      const line1Elements = document.querySelectorAll('.project-item-line-1');
      line1Elements.forEach((el) => this.setupAsciiGlitchElement(el));
    }

    // Split section title letters into masks for bottom-left rise animation
    splitTitleIntoChars(element) {
      if (!element || element.dataset.splitTitle === 'true') return;
      element.dataset.splitTitle = 'true';
      element.setAttribute('aria-label', element.textContent.trim());

      let charIndex = 0;

      const processNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          if (!text) return document.createDocumentFragment();

          const frag = document.createDocumentFragment();
          const words = text.split(/(\s+)/);

          words.forEach((word) => {
            if (!word) return;
            if (/^\s+$/.test(word)) {
              frag.appendChild(document.createTextNode(' '));
            } else {
              const wordSpan = document.createElement('span');
              wordSpan.className = 'title-word';

              for (const char of word) {
                const maskSpan = document.createElement('span');
                maskSpan.className = 'title-char-mask';

                const charSpan = document.createElement('span');
                charSpan.className = 'title-char';
                charSpan.style.setProperty('--char-i', charIndex++);
                charSpan.textContent = char;

                maskSpan.appendChild(charSpan);
                wordSpan.appendChild(maskSpan);
              }
              frag.appendChild(wordSpan);
            }
          });

          return frag;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName.toLowerCase() === 'br') {
            return node.cloneNode(true);
          }
          const clone = node.cloneNode(false);
          Array.from(node.childNodes).forEach((child) => {
            clone.appendChild(processNode(child));
          });
          return clone;
        }
        return document.createDocumentFragment();
      };

      const childNodes = Array.from(element.childNodes);
      const newFrag = document.createDocumentFragment();
      childNodes.forEach((child) => {
        newFrag.appendChild(processNode(child));
      });

      element.innerHTML = '';
      element.appendChild(newFrag);
      element.classList.add('is-splitting');
    }

    // Dynamic section header animations:
    // 1. Kicker (e.g. 02 // Portfolio) - ASCII decipherer identical to project card tags
    // 2. Section title (e.g. Projects) - letters rising from bottom-left
    // 3. Section description (e.g. Disclaimer) - smooth entry with optical de-blur
    initSectionHeaderAnimations() {
      // 1. Split section title letters
      const titles = document.querySelectorAll('.section-title, .contact-title-pro');
      titles.forEach((titleEl) => this.splitTitleIntoChars(titleEl));

      // 2. Initialize ASCII decipherer for section kickers
      const kickers = document.querySelectorAll('.section-kicker');
      kickers.forEach((kicker) => this.setupAsciiGlitchElement(kicker));

      // 3. Observe entry into viewport (header containers)
      const headerContainers = document.querySelectorAll(
        '.featured-header, .about-section, .contact-inner-pro'
      );

      if (!headerContainers.length) return;

      const headerObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const container = entry.target;
          const containerKickers = container.querySelectorAll('.section-kicker');
          const containerTitles = container.querySelectorAll('.section-title, .contact-title-pro');
          const containerDisclaimers = container.querySelectorAll('.section-disclaimer, .contact-desc-pro');
          const aboutQuote = container.querySelector('.about-quote');
          const aboutBody = container.querySelector('.about-body');

          if (entry.isIntersecting) {
            container.classList.add('is-revealed');
            containerKickers.forEach((k) => {
              if (k._triggerGlitch) k._triggerGlitch();
            });
            containerTitles.forEach((t) => t.classList.add('is-revealed'));
            containerDisclaimers.forEach((d) => d.classList.add('is-revealed'));
            if (aboutQuote) aboutQuote.classList.add('is-revealed');
            if (aboutBody) aboutBody.classList.add('is-revealed');
          } else {
            container.classList.remove('is-revealed');
            containerKickers.forEach((k) => {
              if (k._resetGlitch) k._resetGlitch();
            });
            containerTitles.forEach((t) => t.classList.remove('is-revealed'));
            containerDisclaimers.forEach((d) => d.classList.remove('is-revealed'));
            if (aboutQuote) aboutQuote.classList.remove('is-revealed');
            if (aboutBody) aboutBody.classList.remove('is-revealed');
          }
        });
      }, {
        threshold: 0.08,
        rootMargin: '0px 0px -20px 0px'
      });

      headerContainers.forEach((container) => headerObserver.observe(container));

      // Ensure kickers outside main containers are also observed
      kickers.forEach((kicker) => {
        const parent = kicker.closest('.featured-header, .about-section, .contact-inner-pro');
        if (!parent && kicker.parentElement) {
          headerObserver.observe(kicker.parentElement);
        }
      });
    }

    // Split title letters and right-to-left gravitational cascade
    initTitleLetterGravity() {
      if (window.innerWidth <= 768) return; // Skip letter splitting on mobile (allows natural word wrapping)

      const titles = document.querySelectorAll('.project-item-line-2-inner');
      titles.forEach((el) => {
        const text = el.textContent.trim();
        if (!text || el.dataset.split === 'true') return;
        el.dataset.split = 'true';
        el.setAttribute('aria-label', text);
        el.innerHTML = '';

        const chars = Array.from(text);
        const total = chars.length;
        const maxIdx = Math.max(total - 1, 1);

        chars.forEach((char, i) => {
          const span = document.createElement('span');
          span.className = 'char';
          span.textContent = char === ' ' ? '\u00A0' : char;

          // Normalized indices from 0.0 to 1.0 for constant cascade duration
          const normI = i / maxIdx;               // for return (left to right)
          const normRi = (total - 1 - i) / maxIdx; // for hover (right to left - gravity)
          span.style.setProperty('--norm-i', normI.toFixed(3));
          span.style.setProperty('--norm-ri', normRi.toFixed(3));

          el.appendChild(span);
        });
      });
    }

    // Attach click to the existing Case Study Modal Drawer
    initModalTriggers() {
      const items = document.querySelectorAll('.project-item');
      items.forEach((item) => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const projectId = item.dataset.projectId;
          if (!projectId) return;

          if (window.openProjectModal) {
            window.openProjectModal(projectId);
          } else {
            const modalEvent = new CustomEvent('open-project-modal', { detail: { id: projectId } });
            window.dispatchEvent(modalEvent);
          }
        });
      });
    }
  }

  /* INITIALIZATION ON DOM READY */
  function initLusionProjects() {
    new LusionProjectsDOM();
    if (typeof THREE !== 'undefined' && window.innerWidth > 768) {
      new LusionProjectsWebGL();
    } else {
      console.warn('Three.js not loaded or mobile device. Running DOM mode.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLusionProjects);
  } else {
    initLusionProjects();
  }
})();
