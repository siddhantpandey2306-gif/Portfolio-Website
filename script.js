/* =========================================
   01. MOBILE NAVIGATION
========================================= */
const nav = document.querySelector('.nav');
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelectorAll('.nav-links a:not([target="_blank"])');

if (nav && menuToggle) {
  menuToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open menu');
    });
  });
}

/* =========================================
   02. INTERACTIVE SKILLS CATEGORY FILTER
========================================= */
const filterButtons = document.querySelectorAll('.skills-filter-btn');
const categoryCards = document.querySelectorAll('.skill-category-card');

if (filterButtons.length && categoryCards.length) {
  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const selectedFilter = btn.getAttribute('data-filter');

      // Update active tab button state
      filterButtons.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      // Filter and transition category cards
      categoryCards.forEach((card) => {
        const category = card.getAttribute('data-category');
        if (selectedFilter === 'all' || category === selectedFilter) {
          card.style.display = 'block';
          card.style.opacity = '0';
          card.style.transform = 'translateY(8px)';
          setTimeout(() => {
            card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 10);
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/* =========================================
   03. CLICK-TO-COPY EMAIL BUTTON
========================================= */
const copyEmailBtn = document.getElementById('copyEmailBtn');
if (copyEmailBtn) {
  copyEmailBtn.addEventListener('click', async () => {
    const email = 'siddhantpandey4444@gmail.com';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(email);
      } else {
        const tempInput = document.createElement('input');
        tempInput.value = email;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }
      copyEmailBtn.classList.add('copied');
      setTimeout(() => {
        copyEmailBtn.classList.remove('copied');
      }, 2500);
    } catch (err) {
      console.error('Failed to copy email:', err);
    }
  });
}

/* =========================================
   04. ACTIVE NAVIGATION LINK ON SCROLL
========================================= */
const sections = document.querySelectorAll('main > section[id]');
if ('IntersectionObserver' in window && sections.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach((link) => {
            const href = link.getAttribute('href');
            if (href === `#${id}`) {
              link.classList.add('active-nav');
            } else {
              link.classList.remove('active-nav');
            }
          });
        }
      });
    },
    { threshold: 0.35 }
  );

  sections.forEach((section) => observer.observe(section));
}
