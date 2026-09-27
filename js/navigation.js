/* 10. NAV SCROLL SPY */
function initNavScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.navbar-link-pro, .nav-link');

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    sections.forEach((sec) => {
      const top = sec.offsetTop - 180;
      const height = sec.offsetHeight;
      const id = sec.getAttribute('id');

      if (scrollY >= top && scrollY < top + height) {
        navLinks.forEach((link) => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  });
}
