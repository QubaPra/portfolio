/* Smooth Scrolling with Lenis */
let lenis;

function initSmoothScroll() {
  if (window.innerWidth < 1024) return; // Optional: Only on desktop as user requested

  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // https://www.desmos.com/calculator/brs54l4xou
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);
}

function pauseSmoothScroll() {
  if (lenis) lenis.stop();
}

function resumeSmoothScroll() {
  if (lenis) lenis.start();
}

let modalLenis;
let modalRafId;

function initModalSmoothScroll() {
  const modalContent = document.getElementById('project-modal-content');
  if (!modalContent || window.innerWidth < 1024) return;

  modalLenis = new Lenis({
    wrapper: modalContent,
    content: modalContent,
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'horizontal',
    gestureOrientation: 'both',
    smoothWheel: true,
  });

  function modalRaf(time) {
    modalLenis.raf(time);
    modalRafId = requestAnimationFrame(modalRaf);
  }
  modalRafId = requestAnimationFrame(modalRaf);
}

function destroyModalSmoothScroll() {
  if (modalLenis) {
    modalLenis.destroy();
    modalLenis = null;
  }
  if (modalRafId) {
    cancelAnimationFrame(modalRafId);
    modalRafId = null;
  }
}
