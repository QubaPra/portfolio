/* SMART NAVBAR — hide navigation bar when scrolling down (mobile) */
function initSmartNavbar() {
  let lastScrollY = window.scrollY;
  const navbar = document.querySelector('.site-navbar-pro');
  if (!navbar) return;
  
  window.addEventListener('scroll', () => {
    if (window.innerWidth > 768) {
      navbar.classList.remove('nav-hidden');
      return;
    }
    const currentScrollY = window.scrollY;
    if (currentScrollY > 100) {
      if (currentScrollY > lastScrollY) {
        navbar.classList.add('nav-hidden');
      } else {
        navbar.classList.remove('nav-hidden');
      }
    } else {
      navbar.classList.remove('nav-hidden');
    }
    lastScrollY = currentScrollY;
  }, { passive: true });
}

/* SKILLS CARD SWIPE — animated stack on mobile (touch + click) */
function initMobileSkillsSwipe() {
  const grid = document.querySelector('.skills-grid');
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll('.skill-panel'));
  if (cards.length === 0) return;

  let currentIndex = 0;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let isDragging = false;
  let hasMoved = false;
  let isMobile = window.innerWidth <= 768;
  
  let dotsContainer = grid.querySelector('.skills-pagination');
  if (!dotsContainer) {
    dotsContainer = document.createElement('div');
    dotsContainer.className = 'skills-pagination';
    grid.appendChild(dotsContainer);
    cards.forEach(() => {
      const dot = document.createElement('div');
      dot.className = 'skill-dot';
      dotsContainer.appendChild(dot);
    });
  }
  const dots = Array.from(dotsContainer.querySelectorAll('.skill-dot'));

  function updateCards() {
    if (!isMobile) {
      grid.style.height = '';
      dotsContainer.style.display = 'none';
      cards.forEach(card => {
        card.style.transform = '';
        card.style.opacity = '';
        card.style.filter = '';
        card.style.zIndex = '';
        card.style.position = '';
        card.style.transition = '';
        card.style.height = '';
      });
      return;
    }

    dotsContainer.style.display = 'flex';
    let maxH = 0;
    cards.forEach(c => {
      c.style.position = 'static';
      c.style.transform = 'none';
      const h = c.offsetHeight;
      if(h > maxH) maxH = h;
    });
    grid.style.height = (maxH + 40) + 'px';

    cards.forEach((card, i) => {
      card.style.position = 'absolute';
      card.style.height = maxH + 'px';
      card.style.transition = 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1), filter 0.45s ease';
      
      if (i === currentIndex) {
        card.style.transform = 'translateX(0px) scale(1)';
        card.style.filter = 'brightness(1)';
        card.style.zIndex = '10';
      } else if (i > currentIndex) {
        const offset = i - currentIndex;
        card.style.transform = `translateX(${offset * 18}%) scale(${1 - offset * 0.1})`;
        card.style.filter = `brightness(${Math.max(1 - offset * 0.3, 0.2)})`;
        card.style.zIndex = 10 - offset;
      } else {
        const offset = currentIndex - i;
        card.style.transform = `translateX(${-offset * 18}%) scale(${1 - offset * 0.1})`;
        card.style.filter = `brightness(${Math.max(1 - offset * 0.3, 0.2)})`;
        card.style.zIndex = 10 - offset;
      }
    });

    dots.forEach((dot, i) => {
      if (i === currentIndex) dot.classList.add('active');
      else dot.classList.remove('active');
    });
  }

  window.addEventListener('resize', () => {
    const wasMobile = isMobile;
    isMobile = window.innerWidth <= 768;
    if (wasMobile !== isMobile || isMobile) updateCards();
  });

  let dragIntent = null;
  let touchStartTime = 0;

  grid.addEventListener('touchstart', e => {
    if (!isMobile) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentX = 0;
    currentY = 0;
    isDragging = true;
    hasMoved = false;
    dragIntent = null;
    touchStartTime = Date.now();
    
    // Remove transition so it follows the finger instantly
    cards[currentIndex].style.transition = 'none';
  }, {passive: false});

  grid.addEventListener('touchmove', e => {
    if (!isMobile || !isDragging) return;
    
    currentX = e.touches[0].clientX - startX;
    currentY = e.touches[0].clientY - startY;
    
    if (!dragIntent) {
      if (Math.abs(currentX) > 5 || Math.abs(currentY) > 5) {
        if (Math.abs(currentX) > Math.abs(currentY)) {
          dragIntent = 'horizontal';
        } else {
          dragIntent = 'vertical';
        }
      }
    }

    if (dragIntent === 'vertical') {
      isDragging = false;
      updateCards();
      return;
    }

    if (dragIntent === 'horizontal') {
      e.preventDefault(); // Prevent vertical scroll while dragging
      hasMoved = true;
      cards[currentIndex].style.transform = `translateX(${currentX}px) scale(1)`;
    }
  }, {passive: false});

  grid.addEventListener('touchend', () => {
    if (!isMobile) return;
    isDragging = false;

    // If it was a vertical scroll, ignore as a tap
    if (dragIntent === 'vertical') {
      return;
    }

    const timeElapsed = Date.now() - touchStartTime;
    const distance = Math.max(Math.abs(currentX), Math.abs(currentY));

    // A short tap (quick and little movement)
    if (timeElapsed < 300 && distance < 15) {
      currentIndex = (currentIndex + 1) % cards.length;
    } 
    // A horizontal swipe
    else if (dragIntent === 'horizontal' || hasMoved) {
      if (currentX > 60) {
        currentIndex = (currentIndex - 1 + cards.length) % cards.length;
      } else if (currentX < -60) {
        currentIndex = (currentIndex + 1) % cards.length;
      }
    }
    
    updateCards();
  }, {passive: true});

  // Also handle click for desktop testing
  grid.addEventListener('click', () => {
    if (isMobile) return; // Taps on mobile are fully handled by touchend!
    currentIndex = (currentIndex + 1) % cards.length;
    updateCards();
  });

  updateCards();
}

