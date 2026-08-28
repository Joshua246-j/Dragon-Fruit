/**
 * HomeFarm — Main Application Logic
 * Initializes Lenis smooth scrolling, orchestrates modules, and handles UI events.
 */

const safeInit = (name, fn) => {
    try {
        fn();
        console.log(`[INIT] ${name} successfully initialized.`);
    } catch (error) {
        console.error(`[ERROR] Failed to initialize ${name}:`, error);
    }
};

class App {
    constructor() {
        this.currentLang = 'en';
        this.lenis = null;
        this.init();
    }

    init() {
        safeInit('Smooth Scroll (Lenis)', () => this.initLenis());
        safeInit('Language Toggle', () => this.initLanguageToggle());
        safeInit('Mobile Menu', () => this.initMobileMenu());
        safeInit('Dynamic Header', () => this.initDynamicHeader());
        
        // Modules
        safeInit('Hero Canvas Sequence', () => new HeroCanvasSequence());
        safeInit('Varieties Carousel', () => new VarietiesCarousel());
        safeInit('Comparison Grid', () => new ComparisonGrid());
        
        safeInit('GSAP Scroll Reveals', () => this.initScrollReveals());
    }

    initLenis() {
        if (typeof Lenis !== 'undefined') {
            this.lenis = new Lenis({
                lerp: 0.05,
                duration: 1.5,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                orientation: 'vertical',
                gestureOrientation: 'vertical',
                smoothWheel: true,
                wheelMultiplier: 1.2,
                touchMultiplier: 2,
            });

            // Connect GSAP ScrollTrigger to Lenis
            if (typeof ScrollTrigger !== 'undefined') {
                this.lenis.on('scroll', ScrollTrigger.update);
                gsap.ticker.add((time) => {
                  this.lenis.raf(time * 1000);
                });
                gsap.ticker.lagSmoothing(0);
            } else {
                const lenis = this.lenis;
                function raf(time) {
                    lenis.raf(time);
                    requestAnimationFrame(raf);
                }
                requestAnimationFrame(raf);
            }
            
            // Handle anchor links for smooth scrolling
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = anchor.getAttribute('href');
                    if (this.lenis) {
                        this.lenis.scrollTo(target, {
                            offset: 0,
                            duration: 1.2,
                        });
                    }
                });
            });
        }
    }

    initDynamicHeader() {
        const header = document.getElementById('main-header');
        if (!header) return;
        
        // Use IntersectionObserver to determine current section theme
        const sections = document.querySelectorAll('section');
        const observerOptions = {
            root: null,
            rootMargin: '-80px 0px -80% 0px', // Trigger precisely when section touches the header area (approx 80px)
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.id;
                    if (sectionId === 'comparison') {
                        header.classList.add('header-light');
                    } else {
                        header.classList.remove('header-light');
                    }
                }
            });
        }, observerOptions);

        sections.forEach(section => observer.observe(section));
        
        const updateHeader = () => {
            const scrollY = window.scrollY || window.pageYOffset;
            
            if (scrollY > 60) {
                header.classList.add('header-scrolled');
            } else {
                header.classList.remove('header-scrolled');
            }
        };

        // Use passive scroll listener for performance
        window.addEventListener('scroll', updateHeader, { passive: true });
        
        // Initial check in case page is already scrolled
        updateHeader();
    }

    initLanguageToggle() {
        const langBtns = document.querySelectorAll('.lang-btn');
        langBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.target.dataset.lang;
                if (lang === this.currentLang) return;
                
                this.currentLang = lang;
                this.updateLanguage(lang);
            });
        });
    }

    updateLanguage(lang) {
        if (!lang) lang = this.currentLang;
        
        // Update active state on buttons
        document.querySelectorAll('.lang-btn').forEach(b => {
            if (b.dataset.lang === lang) {
                b.classList.add('active');
                b.style.opacity = '1';
                b.setAttribute('aria-pressed', 'true');
            } else {
                b.classList.remove('active');
                b.style.opacity = '0.5';
                b.setAttribute('aria-pressed', 'false');
            }
        });

        // Update text content across the site
        document.querySelectorAll('.lang-text').forEach(el => {
            if (el.dataset[lang]) {
                // Use innerHTML if there's a break tag in the dataset
                if (el.dataset[lang].includes('<br>')) {
                     el.innerHTML = el.dataset[lang];
                } else {
                     el.textContent = el.dataset[lang];
                }
            }
        });

        // Update fonts for Malayalam globally
        if (lang === 'ml') {
            document.body.classList.add('font-ml');
        } else {
            document.body.classList.remove('font-ml');
        }
    }

    initMobileMenu() {
        const btn = document.getElementById('mobile-menu-btn');
        const overlay = document.getElementById('mobile-menu-overlay');
        const links = document.querySelectorAll('.mobile-nav-link');
        
        if (!btn || !overlay) return;

        let isOpen = false;

        const toggleMenu = () => {
            isOpen = !isOpen;
            btn.setAttribute('aria-expanded', isOpen.toString());
            btn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
            
            if (isOpen) {
                overlay.classList.add('open');
                // Change icon to close
                btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-6 h-6"><path d="M6 18L18 6M6 6l12 12"></path></svg>`;
                // Prevent body scroll when menu is open
                document.body.style.overflow = 'hidden';
                setTimeout(() => links[0]?.focus(), 100);
            } else {
                overlay.classList.remove('open');
                // Change icon to hamburger
                btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-6 h-6"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>`;
                document.body.style.overflow = '';
            }
        };

        btn.addEventListener('click', toggleMenu);

        // Close menu when a link is clicked
        links.forEach(link => {
            link.addEventListener('click', () => {
                if(isOpen) toggleMenu();
            });
        });
        
        // Accessibility: Escape to close
        document.addEventListener('keydown', (e) => {
            if (isOpen && e.key === 'Escape') {
                toggleMenu();
                btn.focus();
            }
        });

        // Focus trap
        const focusableElements = overlay.querySelectorAll('a, button');
        if (focusableElements.length > 0) {
            const firstFocusable = focusableElements[0];
            const lastFocusable = focusableElements[focusableElements.length - 1];

            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' && isOpen) {
                    if (e.shiftKey) {
                        if (document.activeElement === firstFocusable) {
                            e.preventDefault();
                            btn.focus();
                        } else if (document.activeElement === btn) {
                            e.preventDefault();
                            lastFocusable.focus();
                        }
                    } else {
                        if (document.activeElement === lastFocusable) {
                            e.preventDefault();
                            btn.focus();
                        } else if (document.activeElement === btn) {
                            e.preventDefault();
                            firstFocusable.focus();
                        }
                    }
                }
            });
        }
    }
    
    initScrollReveals() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
        
        // Fade-up for section headers
        const headers = document.querySelectorAll('.section-header');
        headers.forEach(el => {
            gsap.fromTo(el, 
                { opacity: 0, y: 30 },
                { 
                    scrollTrigger: {
                        trigger: el,
                        start: "top 80%",
                    },
                    opacity: 1, 
                    y: 0, 
                    duration: 0.8, 
                    ease: "power2.out" 
                }
            );
        });
    }
}

// Boot application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.homeFarmApp = new App();
    });
} else {
    window.homeFarmApp = new App();
}
