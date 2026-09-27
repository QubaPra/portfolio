/**
 * PORTFOLIO JAKUB PRAŻUCH — Application entry point
 * Sequentially initializes all modules:
 *   - Custom cursor (cursor.js)
 *   - Three.js 3D scene with airplane (three-airplane.js)
 *   - Project details modal (modal-drawer.js)
 *   - Email copy to clipboard (email-copy.js)
 *   - Navigation scroll spy (navigation.js)
 *   - Skills card swipe on mobile (mobile-skills.js)
 *   - Navbar hide on scroll (mobile-skills.js)
 *   - Smooth scroll with Lenis (smooth-scroll.js)
 */

function initApp() {
  initCustomCursor();
  initThreeAirplaneScene();
  initModalDrawer();
  initEmailCopy();
  initNavScrollSpy();
  initMobileSkillsSwipe();
  initSmartNavbar();
  if (typeof initSmoothScroll === 'function') initSmoothScroll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

