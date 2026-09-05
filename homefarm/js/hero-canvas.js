/**
 * HomeFarm — Hero Canvas Sequence Engine v3
 * ===========================================================
 * ARCHITECTURE:
 *   - Canvas renders 89 scroll-driven frames
 *   - ScrollTrigger pins section + creates scroll room (no CSS height hack)
 *   - 5-phase GSAP timeline synced to scroll progress
 *   - Subject-focused cropping for mobile (dragon fruit stays centered)
 *   - Aggressive preloading: critical frames first, then fill gaps
 *   - Separate mobile frame set for faster mobile loading
 *
 * SCROLL PHASES (mapped to 0→1 progress):
 *   Phase 1 (0.00–0.15): "PURE." fades in, scroll indicator visible
 *   Phase 2 (0.15–0.35): "LOCAL." fades in, info card appears
 *   Phase 3 (0.35–0.55): "NATURAL." fades in, product tags appear
 *   Phase 4 (0.55–0.75): Product details (Live Cut, Rooted, Seasonal)
 *   Phase 5 (0.75–1.00): Parallax settle, text lifts, hold on frame 89
 */

class HeroCanvasSequence {
    constructor() {
        this.canvas = document.getElementById('hero-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d', { alpha: false }) : null;
        this.heroSection = document.getElementById('hero');
        
        if (!this.canvas || !this.ctx || !this.heroSection) return;

        this.frameCount = 89;
        this.images = new Map();
        this.loadedFrames = new Set();
        this.failedFrames = new Set();
        this.currentFrame = 0;
        this.lastRenderedFrame = -1;
        
        this.isReady = false;
        this.isMobile = window.innerWidth <= 768;
        this.dimensions = { width: 0, height: 0 };
        this.resizeTicking = false;
        this.scrollTicking = false;
        
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.init();
    }

    async init() {
        this.resize();
        
        // Debounced resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.isMobile = window.innerWidth <= 768;
                this.resize();
            }, 100);
        });
        
        // Load critical frames first and ensure minimum loader duration
        await Promise.all([
            this.ensureFirstFrame(),
            new Promise(resolve => setTimeout(resolve, 800))
        ]);
        
        let initialFrame = 1;
        for (let i = 1; i <= this.frameCount; i++) {
            if (this.loadedFrames.has(i)) {
                initialFrame = i;
                break;
            }
        }
        
        this.renderFrame(initialFrame);
        this.hideLoader();
        this.isReady = true;

        if (this.prefersReducedMotion) {
            this.initReducedMotion();
        } else {
            this.initScrollTrigger();
        }
        
        // 3. Preload initial buffer around frame 1
        this.manageBuffer(1);
    }

    hideLoader() {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
                loader.remove();
            }, 700);
        }
    }

    resize() {
        const container = this.canvas.parentElement;
        if (!container) return;
        
        this.dimensions.width = container.clientWidth;
        this.dimensions.height = container.clientHeight;
        
        // Cap DPR at 2 on desktop, 1.5 on mobile for performance
        const maxDpr = this.isMobile ? 1.5 : 2;
        const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
        
        this.canvas.width = this.dimensions.width * dpr;
        this.canvas.height = this.dimensions.height * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        // Force re-render after resize
        if (this.isReady && this.currentFrame > 0) {
            this.lastRenderedFrame = -1; // Force redraw
            this.renderFrame(this.currentFrame);
        }
    }

    getFramePath(index) {
        const paddedIndex = index.toString().padStart(3, '0');
        if (this.isMobile) {
            return `assets/images/hero section/mobile/${paddedIndex}.webp`;
        }
        return `assets/images/hero section/${paddedIndex}.webp`;
    }

    async loadFrame(index) {
        if (this.loadedFrames.has(index) || this.failedFrames.has(index)) return;
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                if (typeof img.decode === 'function') {
                    img.decode().then(() => {
                        this.images.set(index, img);
                        this.loadedFrames.add(index);
                        resolve();
                    }).catch((e) => {
                        this.failedFrames.add(index);
                        reject(e);
                    });
                } else {
                    this.images.set(index, img);
                    this.loadedFrames.add(index);
                    resolve();
                }
            };
            img.onerror = () => {
                this.failedFrames.add(index);
                reject(new Error(`Frame ${index} failed to load`));
            };
            img.src = this.getFramePath(index);
        });
    }

    async loadSingleFrame(index) {
        return this.loadFrame(index);
    }

    async ensureFirstFrame() {
        try {
            await this.loadFrame(1);
            return 1;
        } catch (e) {
            console.warn('[HERO] Frame 001 failed, trying fallbacks...');
        }
        // Try nearby frames
        for (let i = 2; i <= 6; i++) {
            try {
                await this.loadFrame(i);
                return i;
            } catch (e) {}
        }
        // Ultimate fallback
        return new Promise((resolve) => {
            const fallbackImg = new Image();
            fallbackImg.onload = () => {
                this.images.set(1, fallbackImg);
                this.loadedFrames.add(1);
                resolve(1);
            };
            fallbackImg.onerror = () => resolve(1);
            fallbackImg.src = 'assets/images/varieties/ecuador-palora-yellow-cut.jpg';
        });
    }

    manageBuffer(currentFrame) {
        const bufferSize = 10; // Keep 10 frames ahead and behind
        
        // Load nearby frames
        for (let i = Math.max(1, currentFrame - bufferSize); i <= Math.min(this.frameCount, currentFrame + bufferSize); i++) {
            if (!this.images.has(i)) {
                this.loadSingleFrame(i);
            }
        }
        
        // Unload far frames to prevent memory leaks on mobile
        for (let [key, img] of this.images.entries()) {
            if (key < currentFrame - bufferSize * 2 || key > currentFrame + bufferSize * 2) {
                img.src = ""; // Force GC
                this.images.delete(key);
                this.loadedFrames.delete(key);
            }
        }
    }

    renderFrame(index) {
        if (index === this.lastRenderedFrame) return; // Skip duplicate renders
        
        this.manageBuffer(index);
        const img = this.images.get(index);
        if (!img) {
            // Frame not loaded yet — find nearest loaded frame
            let nearest = index;
            for (let d = 1; d <= this.frameCount; d++) {
                if (this.images.has(index - d) && index - d >= 1) { nearest = index - d; break; }
                if (this.images.has(index + d) && index + d <= this.frameCount) { nearest = index + d; break; }
            }
            const fallback = this.images.get(nearest);
            if (!fallback) return;
            this._drawImage(fallback);
            this.currentFrame = index;
            return;
        }
        
        this._drawImage(img);
        this.currentFrame = index;
        this.lastRenderedFrame = index;
    }

    /**
     * Subject-focused cover crop.
     * The dragon fruit is center-to-right in all frames.
     * On mobile portrait, we crop to center on the fruit subject.
     * On desktop landscape, standard center crop.
     */
    _drawImage(img) {
        const cw = this.dimensions.width;
        const ch = this.dimensions.height;
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        
        const canvasRatio = cw / ch;
        const imgRatio = iw / ih;
        
        let drawWidth, drawHeight, offsetX, offsetY;

        if (canvasRatio > imgRatio) {
            // Canvas is wider than image — scale to width, crop height
            drawWidth = cw;
            drawHeight = cw / imgRatio;
            offsetX = 0;
            offsetY = (ch - drawHeight) / 2;
        } else {
            // Canvas is taller than image — scale to height, crop width
            drawWidth = ch * imgRatio;
            drawHeight = ch;
            
            if (this.isMobile) {
                // MOBILE: The fruit is at ~50% horizontal position in the image.
                // Depending on the frame, the fruit can shift slightly. We'll use 0.5.
                const fruitCenterRatio = 0.5;
                offsetX = -(drawWidth * fruitCenterRatio - cw / 2);
                // Clamp so we don't show blank space
                offsetX = Math.min(0, Math.max(cw - drawWidth, offsetX));
            } else {
                // Desktop: standard center crop
                offsetX = (cw - drawWidth) / 2;
            }
            offsetY = 0;
        }

        this.ctx.clearRect(0, 0, cw, ch);
        this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    }

    initReducedMotion() {
        this.loadFrame(89).then(() => this.renderFrame(89));
        
        gsap.set(".hero-word", { y: 20, opacity: 0 });
        gsap.set("#hero-marketing-text", { y: 20, opacity: 0 });
        gsap.set(".hero-product-tag", { y: 20, opacity: 0 });

        gsap.to(".hero-word", { opacity: 1, y: 0, duration: 1, stagger: 0.15 });
        gsap.to("#hero-marketing-text", { opacity: 1, y: 0, duration: 1, delay: 0.5 });
        gsap.to(".hero-product-tag", { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, delay: 0.8 });
    }

    initScrollTrigger() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

        gsap.set(".hero-product-tag", { y: 30, opacity: 0 });

        const masterTl = gsap.timeline({
            scrollTrigger: {
                trigger: this.heroSection,
                start: "top top",
                end: "+=250vh",  // Responsive scroll distance
                pin: true,
                scrub: 0.3,     // Smooth but responsive
                anticipatePin: 1,
                onUpdate: (self) => {
                    const p = self.progress;
                    
                    // Map scroll to 89 frames
                    const frameIndex = Math.min(
                        this.frameCount,
                        Math.max(1, Math.round(p * (this.frameCount - 1)) + 1)
                    );
                    
                    // Use rAF to batch canvas draws
                    if (!this.scrollTicking) {
                        window.requestAnimationFrame(() => {
                            this.renderFrame(frameIndex);
                            this.scrollTicking = false;
                        });
                        this.scrollTicking = true;
                    }
                }
            }
        });

        // ═══════════════════════════════════════════════════════
        // PHASE 1 (0.00 → 0.20): Fade out typography & Fade in Marketing
        // ═══════════════════════════════════════════════════════
        // Fade out original words
        masterTl.to(".hero-word", {
            y: -50, opacity: 0, duration: 0.20, stagger: 0.02, ease: "power1.inOut"
        }, 0);

        // Entire block continuous parallax 
        masterTl.to("#hero-text-block", {
            y: () => window.innerHeight < 800 ? "-20vh" : "-15vh",
            duration: 0.20, 
            ease: "none"
        }, 0);

        // Fade in new Marketing text
        masterTl.to("#hero-marketing-text", {
            opacity: 1, y: 0, duration: 0.25, ease: "power2.out"
        }, 0.20);
        
        // ═══════════════════════════════════════════════════════
        // PHASE 2 (0.35 → 0.55): Premium Tags Appear
        // ═══════════════════════════════════════════════════════
        masterTl.to("#hero-tag-1", {
            opacity: 1, y: 0, duration: 0.15, ease: "power2.out"
        }, 0.35);
        
        masterTl.to("#hero-tag-2", {
            opacity: 1, y: 0, duration: 0.15, ease: "power2.out"
        }, 0.42);
        
        masterTl.to("#hero-tag-3", {
            opacity: 1, y: 0, duration: 0.15, ease: "power2.out"
        }, 0.49);
        
        masterTl.to("#hero-scroll-indicator", {
            opacity: 0, duration: 0.08
        }, 0.55);
    }
}
