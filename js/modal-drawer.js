/* PROJECT DATA — populates the project details modal on card click */
const projectData = {
  obozowanie: {
    tag: 'Gamedev • 3D',
    title: 'Obozowanie - gra Unity',
    description:
      'Strategiczno-edukacyjny symulator, której celem jest przybliżenie zasad zarządzania obozem harcerskim. W ramach projektu samodzielnie zaprojektowałem i wdrożyłem mechaniki rozgrywki w silniku Unity. Odpowiadałem również za level design oraz modelowanie kluczowych obiektów 3D.',
    stack: 'Unity, C#, Blender',
  },
  ekapitula: {
    tag: 'Fullstack • Web App',
    title: 'System eKapituła',
    description:
      'Dedykowana aplikacja webowa stworzona dla organizacji harcerskiej, cyfryzująca proces zgłoszeń i weryfikacji prób na stopnie. Zastąpiłem papierowy obieg dokumentów, znacznie skracając czas obsługi wniosków przez kapitułę.',
    stack: 'Django, React, SQLite',
  },
  szlakai: {
    tag: 'Machine Learning • Data Science',
    title: 'Predykcja Trudności Szlaków',
    description:
      'Autorski model uczenia maszynowego szacujący realną trudność tras górskich na podstawie danych telemetrycznych z zegarka sportowego oraz metryk subiektywnych. Tym modelem zapewniłem bardziej precyzyjną i konsekwentną ocenę szlaku niż tradycyjne przewodniki, ułatwiając bezpieczne planowanie wypraw.',
    stack: 'Python, Scikit-learn, Pandas',
  },
  morsujemy: {
    tag: 'Mobile • Android',
    title: 'Aplikacja Morsujemy?',
    description:
      'Natywna aplikacja mobilna na platformę Android służąca do interaktywnej nauki alfabetu Morse\'a. W tym narzędziu celowo postawiłem na proste, nowoczesne UI z mechanizmami grywalizacji, ułatwiając przyswajanie wiedzy w sposób angażujący.',
    stack: 'Kotlin, Android Studio, XML',
  },
  eskladki: {
    tag: 'Frontend • Systemy Informacyjne',
    title: 'Platforma eSkładki',
    description:
      'Platforma finansowa dla harcerzy i instruktorów zapewniająca transparentny podgląd opłaconych składek. Tym systemem wyeliminowałem nieścisłości w ewidencji wpłat i zmniejszyłem ilość zapytań o stan składek.',
    stack: 'HTML, CSS, JavaScript, PHP',
  },
  itcd: {
    tag: 'Backend • Automatyzacja',
    title: 'Wyszukiwarka Korespondencji',
    description:
      'Narzędzie wykonałem w firmie ITCD pracującej dla Uniwersytetu UKEN. Zintegrowałem je z systemem Webcon do elektronicznego obiegu dokumentów. Umożliwiłem błyskawiczne przeszukiwanie i filtrowanie historii korespondencji ze studentami i pracownikami, optymalizując codzienną pracę administracji.',
    stack: 'Python, PostgreSQL, Webcon BPS, Linux',
  },
};

function initModalDrawer() {
  const wrapper = document.getElementById('project-modal-wrapper');
  const content = document.getElementById('project-modal-content');
  const closeBtn = document.getElementById('nav-close-btn');
  const gallery = document.getElementById('modal-gallery-container');
  if (!wrapper) return;

  let isAnimating = false;

  // Prevent wheel during animation on the whole modal
  content.addEventListener('wheel', (e) => {
    if (isAnimating) {
      e.preventDefault();
    }
  }, { passive: false });
  
  wrapper.addEventListener('touchmove', (e) => {
     if (isAnimating) {
         e.preventDefault();
         return;
     }
     if (!content.contains(e.target)) {
         e.preventDefault();
     }
  }, { passive: false });
  let currentCard = null;

  // Animated container state (shared between opening and closing)
  let animContainer = null;
  let animPlaceholder = null;
  let animOriginalParent = null;
  let animOriginalNextSibling = null;

  // Scroll lock during animation (both opening and closing)
  function blockScroll(e) {
    e.preventDefault();
  }
  function enableScrollBlock() {
    window.addEventListener('wheel', blockScroll, { passive: false });
    window.addEventListener('touchmove', blockScroll, { passive: false });
  }
  function disableScrollBlock() {
    window.removeEventListener('wheel', blockScroll);
    window.removeEventListener('touchmove', blockScroll);
  }

  // Moves the container TO document.body (outside main and stacking context),
  // inserts a placeholder at the card's original position.
  function liftContainerToBody(container, rect) {
    animOriginalParent = container.parentNode;
    animOriginalNextSibling = container.nextSibling;

    // Placeholder preserves the card's height
    animPlaceholder = document.createElement('div');
    animPlaceholder.style.cssText = `width:${rect.width}px;height:${rect.height}px;flex-shrink:0;pointer-events:none;`;
    animOriginalParent.insertBefore(animPlaceholder, container);

    // Move container to body — root stacking context, z-index is always global
    document.body.appendChild(container);
    container.style.position = 'fixed';
    container.style.left = rect.left + 'px';
    container.style.top = rect.top + 'px';
    container.style.width = rect.width + 'px';
    container.style.height = rect.height + 'px';
    container.style.margin = '0';
    container.style.zIndex = '9998';
  }

  // Restores the container to its original position in the DOM and removes the placeholder.
  function restoreContainer(container) {
    container.style.transform = '';
    container.style.zIndex = '';
    const webglCanvas = document.getElementById('webgl-canvas');
    if (webglCanvas) webglCanvas.style.zIndex = ''; // Restore CSS (no override)
    container.style.position = '';
    container.style.left = '';
    container.style.top = '';
    container.style.width = '';
    container.style.height = '';
    container.style.margin = '';
    container.style.pointerEvents = '';
    container.style.transition = '';

    if (animOriginalParent) {
      if (animOriginalNextSibling && animOriginalNextSibling !== animPlaceholder) {
        animOriginalParent.insertBefore(container, animOriginalNextSibling);
      } else {
        animOriginalParent.appendChild(container);
      }
    }
    if (animPlaceholder) {
      animPlaceholder.remove();
      animPlaceholder = null;
    }
    animOriginalParent = null;
    animOriginalNextSibling = null;
  }
  window.openProjectModal = function (id, cardEl) {
    if (isAnimating) return;
    const data = projectData[id];
    if (!data) return;
    
    currentCard = cardEl;
    let container = cardEl.querySelector('.project-item-main');
    
    // Activate this project in WebGL (hides other cards)
    window.activeProjectDom = cardEl;
    cardEl.classList.add('active-project');
    cardEl.classList.add('active-project');
    cardEl.classList.add('active-project');

    // Get card image for gallery
    let imgEl = cardEl.querySelector('.project-item-image');
    let imgSrc = cardEl.dataset.image || (imgEl ? imgEl.src : '');
    
    // Prepare content
    document.getElementById('modal-tag').textContent = data.tag;
    document.getElementById('modal-title').textContent = data.title;
    document.getElementById('modal-description').textContent = data.description;
    
    // Inject tech stack badges
    const stackContainer = document.getElementById('modal-stack-container');
    if (stackContainer) {
      stackContainer.innerHTML = '';
      if (data.stack) {
        const iconMap = {
          'unity': 'devicon-unity-plain',
          'c#': 'devicon-csharp-plain',
          'blender': 'devicon-blender-original',
          'python': 'devicon-python-plain',
          'django': 'devicon-django-plain',
          'react': 'devicon-react-original',
          'sqlite': 'devicon-sqlite-plain',
          'scikit-learn': 'devicon-numpy-plain',
          'pandas': 'devicon-pandas-plain',
          'kotlin': 'devicon-kotlin-plain',
          'android studio': 'devicon-android-plain',
          'xml': 'devicon-xml-plain',
          'html': 'devicon-html5-plain',
          'css': 'devicon-css3-plain',
          'javascript': 'devicon-javascript-plain',
          'php': 'devicon-php-plain',
          'postgresql': 'devicon-postgresql-plain',
          'linux': 'devicon-linux-plain',
          'webcon bps': 'devicon-googlecolab-plain'
        };
        
        const techs = data.stack.split(',').map(s => s.trim());
        techs.forEach(tech => {
          const lowerTech = tech.toLowerCase();
          const iconClass = iconMap[lowerTech] || 'devicon-devicon-plain';
          
          const badge = document.createElement('div');
          badge.className = 'tech-badge';
          
          const icon = document.createElement('i');
          icon.className = iconClass;
          
          const label = document.createElement('span');
          label.textContent = tech;
          
          badge.appendChild(icon);
          badge.appendChild(label);
          stackContainer.appendChild(badge);
        });
      }
    }
    
    // Inject placeholder images for gallery
    gallery.innerHTML = '';
    for(let i=0; i<5; i++) {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.className = 'gallery-image';
        gallery.appendChild(img);
    }

    const rect = container.getBoundingClientRect();
    container.style.transition = 'none';
    container.style.pointerEvents = 'none';
    
    // Move the container to document.body IMMEDIATELY — outside main
    // Thanks to this, the card doesn't fade with main for the first 250ms (no airplane flicker)
    liftContainerToBody(container, rect);
    animContainer = container;

    wrapper.classList.add('is-active');
    wrapper.classList.remove('bg-visible', 'content-visible', 'image-faded');

    // Fade out main content (all text and other images lose opacity, but NOT our card since it's in body)
    document.body.classList.add('modal-is-open');
    document.documentElement.classList.add('modal-is-open');

    content.scrollTop = 0;
    content.scrollLeft = 0;
    isAnimating = true;
    content.style.overflow = 'hidden';
    enableScrollBlock();
    if (typeof pauseSmoothScroll === 'function') pauseSmoothScroll();

    // Push history state for "Back" button handling
    window.history.pushState({ modal: 'project' }, '');

    // When the rest of the page fades, we start the scale-up animation
    setTimeout(() => {
        const duration = 1000;
        const startTime = performance.now();
        const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        // Scale up to fill the screen and a bit beyond
        const targetScale = Math.max(window.innerWidth / rect.width, window.innerHeight / rect.height) * 1.05;
        const targetTranslateX = (window.innerWidth / 2) - (rect.left + rect.width / 2);
        const targetTranslateY = (window.innerHeight / 2) - (rect.top + rect.height / 2);

        let bgFadingIn = false;

        function animateFrame(currentTime) {
            let progress = (currentTime - startTime) / duration;
            if (progress > 1) progress = 1;

            const ease = easeInOut(progress);
            const scale = 1 + ((targetScale - 1) * ease);
            const translateX = targetTranslateX * ease;
            const translateY = targetTranslateY * ease;

            container.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;

            // Force Projects WebGL update (without global resize)
            window.dispatchEvent(new Event('updateProjectRects'));

            // When the image fills the screen, fade to a solid background
            if (progress > 0.7 && !bgFadingIn) {
                bgFadingIn = true;
                wrapper.classList.add('bg-visible');

                // When the background covers the image, we show the content
                setTimeout(() => {
                    wrapper.classList.add('content-visible');
                    document.documentElement.classList.add('content-visible-nav');

                    content.style.overflow = '';
                    isAnimating = false;
                    disableScrollBlock();
                    if (typeof initModalSmoothScroll === 'function') initModalSmoothScroll();
                }, 400);
            }

            if (progress < 1) {
                requestAnimationFrame(animateFrame);
            } else {
                window.dispatchEvent(new Event('updateProjectRects'));
            }
        }

        requestAnimationFrame(animateFrame);
    }, 250);
  };

  const cards = document.querySelectorAll('.project-item, .project-card');
  cards.forEach((card) => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const id = card.dataset.projectId;
      window.openProjectModal(id, card);
    });
  });

  function closeModal(fromPopState = false) {
    if (fromPopState && typeof fromPopState === 'object' && fromPopState.type) {
      fromPopState = false;
    }
    if (isAnimating || !currentCard) return;

    // If closed via page button, go back in history,
    // which will trigger the popstate event and start the close animation.
    if (fromPopState !== true && window.history.state && window.history.state.modal === 'project') {
      window.history.back();
      return;
    }

    isAnimating = true;
    content.style.overflow = 'hidden';
    enableScrollBlock();

    if (typeof destroyModalSmoothScroll === 'function') destroyModalSmoothScroll();

    document.documentElement.classList.remove('content-visible-nav');

    // Step 1: modal text fades out
    wrapper.classList.remove('content-visible');

    // Wait for text fade out
    setTimeout(() => {
        wrapper.classList.remove('bg-visible');

        // animContainer is already in document.body (set during opening)
        const container = animContainer || currentCard.querySelector('.project-item-main');
        const duration = 1000;
        const startTime = performance.now();
        const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        // Read current (scaled) transform state
        const match = container.style.transform.match(/translate\(([^p]+)px,\s*([^p]+)px\)\s*scale\(([^)]+)\)/);
        let startTx = 0, startTy = 0, startS = 1;
        if (match) {
            startTx = parseFloat(match[1]);
            startTy = parseFloat(match[2]);
            startS = parseFloat(match[3]);
        }

        // Immediately: page visible, scrollbar hidden only by modal-closing
        document.body.classList.remove('modal-is-open');
        document.documentElement.classList.remove('modal-is-open');
        document.documentElement.classList.add('modal-closing');
        document.body.classList.add('modal-closing');
        
        window.activeProjectDom = null;
        if (currentCard) currentCard.classList.add('active-closing');

        function animateFrame(currentTime) {
            let progress = (currentTime - startTime) / duration;
            if (progress > 1) progress = 1;

            const ease = easeInOut(progress);
            const scale = startS + ((1 - startS) * ease);
            const translateX = startTx + ((0 - startTx) * ease);
            const translateY = startTy + ((0 - startTy) * ease);

            container.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
            window.dispatchEvent(new Event('updateProjectRects'));

            if (progress < 1) {
                requestAnimationFrame(animateFrame);
            } else {
                // Restore container to its original position in the DOM
                restoreContainer(container);
                animContainer = null;
                if (currentCard) {
                    currentCard.classList.remove('active-closing');
                    currentCard.classList.remove('active-project');
                }
                window.dispatchEvent(new Event('updateProjectRects'));
                // Restore scrollbar after animation completes
                document.documentElement.classList.remove('modal-closing');
                document.body.classList.remove('modal-closing');
                wrapper.classList.remove('is-active');
                content.style.overflow = '';
                isAnimating = false;
                disableScrollBlock();
                if (typeof resumeSmoothScroll === 'function') resumeSmoothScroll();
                currentCard = null;
            }
        }
        requestAnimationFrame(animateFrame);

    }, 800);
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  // Handle browser/phone "Back" button
  window.addEventListener('popstate', () => {
    const wrapper = document.getElementById('project-modal-wrapper');
    if (wrapper && wrapper.classList.contains('is-active')) {
      closeModal(true);
    }
  });
}
