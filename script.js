// Luxury Theme Manager
class LuxuryTheme {
  constructor() {
      this.themeToggle = document.getElementById('themeToggle');
      this.init();
  }

  init() {
      this.loadTheme();
      this.bindEvents();
  }

  loadTheme() {
      const savedTheme = localStorage.getItem('luxury-theme');
      
      if (savedTheme === 'light') {
          document.body.classList.add('light');
          this.updateThemeIcon('light');
      } else {
          document.body.classList.remove('light');
          this.updateThemeIcon('dark');
      }
  }

  bindEvents() {
      this.themeToggle.addEventListener('click', () => {
          this.toggleTheme();
      });
  }

  toggleTheme() {
      const isLight = document.body.classList.toggle('light');
      this.updateThemeIcon(isLight ? 'light' : 'dark');
      localStorage.setItem('luxury-theme', isLight ? 'light' : 'dark');
      
      // Add toggle animation
      this.themeToggle.style.transform = 'scale(0.9)';
      setTimeout(() => {
          this.themeToggle.style.transform = 'scale(1)';
      }, 150);
  }

  updateThemeIcon(theme) {
      const icon = this.themeToggle.querySelector('i');
      if (theme === 'light') {
          icon.className = 'fas fa-sun';
      } else {
          icon.className = 'fas fa-moon';
      }
  }
}

// Smooth Scroll Manager
class SmoothScroll {
  constructor() {
      this.init();
  }

  init() {
      this.bindNavLinks();
      this.addScrollBehavior();
  }

  bindNavLinks() {
      document.querySelectorAll('a[href^="#"]').forEach(link => {
          link.addEventListener('click', (e) => {
              e.preventDefault();
              const targetId = link.getAttribute('href');
              const targetElement = document.querySelector(targetId);
              
              if (targetElement) {
                  const headerHeight = document.querySelector('.luxury-header').offsetHeight;
                  const targetPosition = targetElement.offsetTop - headerHeight - 20;
                  
                  window.scrollTo({
                      top: targetPosition,
                      behavior: 'smooth'
                  });
              }
          });
      });
  }

  addScrollBehavior() {
      let ticking = false;
      
      const updateHeader = () => {
          const header = document.querySelector('.luxury-header');
          const scrolled = window.pageYOffset;
          
          if (document.body.classList.contains('light')) {
              if (scrolled > 100) {
                  header.style.background = 'rgba(255, 255, 255, 0.95)';
              } else {
                  header.style.background = 'rgba(255, 255, 255, 0.8)';
              }
          } else {
              if (scrolled > 100) {
                  header.style.background = 'rgba(10, 10, 10, 0.95)';
              } else {
                  header.style.background = 'rgba(10, 10, 10, 0.8)';
              }
          }
          
          ticking = false;
      };

      window.addEventListener('scroll', () => {
          if (!ticking) {
              requestAnimationFrame(updateHeader);
              ticking = true;
          }
      });
  }
}

// Intersection Observer for Animations
class ScrollAnimations {
  constructor() {
      this.observerOptions = {
          threshold: 0.1,
          rootMargin: '0px 0px -50px 0px'
      };
      
      this.init();
  }

  init() {
      this.setupObservers();
  }

  setupObservers() {
      const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
              if (entry.isIntersecting) {
                  entry.target.classList.add('visible');
                  
                  // Add delay for sequential animation
                  if (entry.target.classList.contains('tech-section') || 
                      entry.target.classList.contains('sources-section')) {
                      const sections = document.querySelectorAll('.tech-section, .sources-section');
                      const delay = Array.from(sections).indexOf(entry.target) * 200;
                      entry.target.style.transitionDelay = `${delay}ms`;
                  }
              }
          });
      }, this.observerOptions);

      // Observe all sections
      document.querySelectorAll('.tech-section, .sources-section').forEach(section => {
          observer.observe(section);
      });
  }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new LuxuryTheme();
  new SmoothScroll();
  new ScrollAnimations();
  
  // Add loading animation
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.8s ease';
  
  setTimeout(() => {
      document.body.style.opacity = '1';
  }, 100);
});

// Add scroll animations for all sections
window.addEventListener('scroll', () => {
  const elements = document.querySelectorAll('.tech-section, .sources-section');
  const trigger = window.innerHeight * 0.8;
  
  elements.forEach(el => {
      const top = el.getBoundingClientRect().top;
      if (top < trigger) {
          el.classList.add('visible');
      }
  });
});
