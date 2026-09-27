/* 9. EMAIL COPY WITH TOAST NOTICE */
function initEmailCopy() {
  const emailBtn = document.getElementById('email-btn-trigger');
  if (!emailBtn) return;
  const span = emailBtn.querySelector('span');
  if (!span) return;

  // Setting relative enables absolute positioning of the "Copied" text perfectly centered
  span.style.position = 'relative';
  span.style.display = 'inline-block'; // Necessary for correct transform and position relative behaviour

  emailBtn.addEventListener('click', () => {
    // Don't prevent default so mailto: normally opens the mail client
    const email = 'kubaprazuch@onet.pl';

    function copyFallback(text) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try { document.execCommand('copy'); } catch (err) {}
      document.body.removeChild(textarea);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).catch(() => copyFallback(email));
    } else {
      copyFallback(email);
    }

    // Button animation
    if (!span.dataset.animating) {
      span.dataset.animating = 'true';
      
      // Instead of changing text (which would resize the button), we make the original text transparent.
      // The original text is still physically there and takes up exactly the same space!
      const originalColor = window.getComputedStyle(span).color;
      span.style.transition = 'color 0.2s ease';
      span.style.color = 'transparent';
      
      // Create a new overlay layer with "Copied" text, centered perfectly over the button
      const copySpan = document.createElement('span');
      copySpan.innerText = 'Skopiowano';
      copySpan.style.color = originalColor; // Inherit correct color (e.g. black)
      copySpan.style.position = 'absolute';
      copySpan.style.left = '50%';
      copySpan.style.top = '50%';
      copySpan.style.transform = 'translate(-50%, 20px)'; // Starts slightly below
      copySpan.style.opacity = '0';
      copySpan.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      copySpan.style.pointerEvents = 'none'; // So it doesn't block clicks
      copySpan.style.whiteSpace = 'nowrap'; // Prevents line breaking
      
      span.appendChild(copySpan);
      
      // Force repaint
      void copySpan.offsetWidth;
      
      // Slide in from below and reveal "Copied"
      copySpan.style.opacity = '1';
      copySpan.style.transform = 'translate(-50%, -50%)';
      
      // After 2.5 seconds it flies upward
      setTimeout(() => {
        copySpan.style.opacity = '0';
        copySpan.style.transform = 'translate(-50%, -150%)';
        
        // Wait for "Copied" disappear animation to finish
        setTimeout(() => {
          span.removeChild(copySpan);
          // Restore original text color (returns to "Write email")
          span.style.color = '';
          
          setTimeout(() => {
            delete span.dataset.animating;
          }, 200);
        }, 200);
      }, 2500);
    }
  });
}
