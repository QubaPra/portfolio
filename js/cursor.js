/* CUSTOM CURSOR — white circle with mix-blend-mode: difference */
function initCustomCursor() {
  const cursor = document.getElementById('cursor');
  if (!cursor) return;

  // Initially hide the cursor to prevent it from resting in the top left corner
  cursor.style.opacity = '0';
  let cursorVisible = false;

  window.addEventListener('mousemove', (e) => {
    if (window.innerWidth <= 768) return;
    if (!cursorVisible) {
      cursor.style.opacity = '1';
      cursorVisible = true;
    }
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
  });

  // Expand cursor to subtle ring over interactive elements
  document.addEventListener('mouseover', (e) => {
    if (window.innerWidth <= 768) return;
    if (e.target.closest('a, button, .project-item, .project-card, .skill-panel, .btn-pill-pro, .email-copy-box, .cursor-hover')) {
      cursor.classList.add('hover');
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (window.innerWidth <= 768) return;
    const interactive = e.target.closest('a, button, .project-item, .project-card, .skill-panel, .btn-pill-pro, .email-copy-box, .cursor-hover');
    if (interactive) {
      if (!e.relatedTarget || !e.relatedTarget.closest('a, button, .project-item, .project-card, .skill-panel, .btn-pill-pro, .email-copy-box, .cursor-hover')) {
        cursor.classList.remove('hover');
      }
    }
  });
}
