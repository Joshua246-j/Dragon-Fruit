/** 
 * State-based showcase: robust layout, debounced interaction, clean transitions.
 * v3 — Free scroll, mouse drag, infinite loop, fast transitions.
 */
class VarietiesCarousel {
    constructor() {
        this.data = varieties;
        this.section = document.getElementById('varieties');
        this.stage = document.getElementById('showcase-stage');
        if (!this.section || !this.stage || !this.data.length) return;
        
        // 3-slot architecture
        const slotElements = [...this.stage.querySelectorAll('.showcase-fruit')];
        this.slots = {
            prev: slotElements[0],
            active: slotElements[1],
            next: slotElements[2]
        };
        
        this.copy = {
            container: document.querySelector('.showcase-copy'),
            number: document.getElementById('showcase-number'), title: document.getElementById('showcase-title'),
            character: document.getElementById('showcase-character'), flesh: document.getElementById('showcase-flesh'),
            brix: document.getElementById('showcase-brix'), flavor: document.getElementById('showcase-flavor'),
            pollination: document.getElementById('showcase-pollination'), details: document.getElementById('showcase-details')
        };
        
        this.currentIndex = 0;
        this.isAnimating = false;
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        // Drag/swipe state (shared by touch + mouse)
        this.dragState = null;
        
        this.init();
    }

    /** Wrap index for infinite loop. */
    _wrap(index) {
        const len = this.data.length;
        return ((index % len) + len) % len;
    }

    init() {
        this.renderProgress();
        
        // Initialize DOM state
        this.slots.prev.style.transform = 'translateX(-30vw) scale(0.85)';
        this.slots.prev.style.opacity = '0';
        this.slots.active.style.transform = 'translateX(0) scale(1)';
        this.slots.active.style.opacity = '1';
        this.slots.next.style.transform = 'translateX(30vw) scale(0.85)';
        this.slots.next.style.opacity = '0';

        this.updateContent(this.currentIndex, true);
        
        // Navigation Buttons — looping via _wrap
        document.getElementById('showcase-prev').addEventListener('click', () => {
            this.goTo(this._wrap(this.currentIndex - 1));
        });
        document.getElementById('showcase-next').addEventListener('click', () => {
            this.goTo(this._wrap(this.currentIndex + 1));
        });
        
        // Details Modal
        this.copy.details.addEventListener('click', () => openVarietyModal(this.data[this.currentIndex].id));
        
        // Keyboard Support
        this.stage.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); this.goTo(this._wrap(this.currentIndex - 1)); }
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); this.goTo(this._wrap(this.currentIndex + 1)); }
        });
        
        // ─── Touch Events (all screen sizes) ───
        this.section.addEventListener('touchstart', (e) => {
            this.dragState = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
        }, { passive: true });
        
        this.section.addEventListener('touchend', (e) => {
            if (!this.dragState) return;
            const touch = e.changedTouches[0];
            this._handleSwipeEnd(touch.clientX, touch.clientY);
        }, { passive: true });
        
        // ─── Mouse Drag Events (desktop swipe-like) ───
        this.section.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            const tag = e.target.tagName.toLowerCase();
            if (tag === 'button' || tag === 'a' || e.target.closest('button') || e.target.closest('a')) return;
            
            this.dragState = { x: e.clientX, y: e.clientY, time: Date.now() };
            this.section.classList.add('is-dragging');
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.dragState || !this.section.classList.contains('is-dragging')) return;
        });
        
        document.addEventListener('mouseup', (e) => {
            if (!this.dragState || !this.section.classList.contains('is-dragging')) return;
            this.section.classList.remove('is-dragging');
            this._handleSwipeEnd(e.clientX, e.clientY);
        });
        
        // Listen to image errors
        Object.values(this.slots).forEach(slot => {
            const img = slot.querySelector('img');
            img.addEventListener('error', () => { img.style.opacity = '0'; });
            img.addEventListener('load', () => { img.style.opacity = '1'; });
        });
    }
    
    /**
     * Shared swipe/drag end handler with looping.
     */
    _handleSwipeEnd(endX, endY) {
        if (!this.dragState) return;
        const dx = endX - this.dragState.x;
        const dy = endY - this.dragState.y;
        const elapsed = Date.now() - this.dragState.time;
        
        this.dragState = null;
        
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40 && elapsed < 800) {
            if (dx < 0) this.goTo(this._wrap(this.currentIndex + 1));
            else this.goTo(this._wrap(this.currentIndex - 1));
        }
    }

    renderProgress() {
        const progress = document.getElementById('showcase-progress');
        progress.innerHTML = this.data.map((variety, index) => 
            `<button type="button" data-index="${index}" aria-label="Show ${variety.name}"><span></span></button>`
        ).join('');
        
        progress.addEventListener('click', (event) => { 
            const button = event.target.closest('button'); 
            if (button) {
                this.goTo(Number(button.dataset.index)); 
            }
        });
    }

    preload(index) {
        // Preload neighbors (with wrapping)
        const prevIdx = this._wrap(index - 1);
        const nextIdx = this._wrap(index + 1);
        const img1 = new Image(); img1.src = this.data[prevIdx].heroAsset;
        const img2 = new Image(); img2.src = this.data[nextIdx].heroAsset;
    }

    goTo(index) {
        // Allow same index only if it's a wrap-around from boundary
        if (index === this.currentIndex || this.isAnimating) return;
        if (index < 0 || index >= this.data.length) return;
        
        this.isAnimating = true;
        
        // Determine visual direction: handle loop wrap
        let direction;
        if (this.currentIndex === 0 && index === this.data.length - 1) {
            direction = -1; // wrapping backward from first to last
        } else if (this.currentIndex === this.data.length - 1 && index === 0) {
            direction = 1;  // wrapping forward from last to first
        } else {
            direction = index > this.currentIndex ? 1 : -1;
        }
        
        this.currentIndex = index;
        this.updateContent(index, false);
        
        const oldActive = this.slots.active;
        const travelDist = window.innerWidth < 768 ? 60 : 30;
        const duration = this.reducedMotion ? '0s' : '0.4s'; // Faster transitions
        const easing = 'cubic-bezier(0.22, 1, 0.36, 1)';

        if (direction === 1) {
            const oldNext = this.slots.next;
            const oldPrev = this.slots.prev;

            this.slots.active = oldNext;
            this.slots.prev = oldActive;
            this.slots.next = oldPrev;

            oldActive.style.transition = `transform ${duration} ${easing}, opacity ${duration} ${easing}`;
            oldActive.style.transform = `translateX(-${travelDist}vw) scale(0.85)`;
            oldActive.style.opacity = '0';
            oldActive.setAttribute('aria-hidden', 'true');

            this.slots.active.style.transition = `transform ${duration} ${easing}, opacity ${duration} ${easing}`;
            this.slots.active.style.transform = 'translateX(0) scale(1)';
            this.slots.active.style.opacity = '1';
            this.slots.active.setAttribute('aria-hidden', 'false');
            this.slots.active.querySelector('img').src = this.data[index].heroAsset;
            this.slots.active.querySelector('img').alt = `${this.data[index].name} whole dragon fruit`;

            this.slots.next.style.transition = 'none';
            this.slots.next.style.transform = `translateX(${travelDist}vw) scale(0.85)`;
            this.slots.next.style.opacity = '0';
            this.slots.next.setAttribute('aria-hidden', 'true');
            const nextIdx = this._wrap(index + 1);
            this.slots.next.querySelector('img').src = this.data[nextIdx].heroAsset;

        } else {
            const oldNext = this.slots.next;
            const oldPrev = this.slots.prev;

            this.slots.active = oldPrev;
            this.slots.next = oldActive;
            this.slots.prev = oldNext;

            oldActive.style.transition = `transform ${duration} ${easing}, opacity ${duration} ${easing}`;
            oldActive.style.transform = `translateX(${travelDist}vw) scale(0.85)`;
            oldActive.style.opacity = '0';
            oldActive.setAttribute('aria-hidden', 'true');

            this.slots.active.style.transition = `transform ${duration} ${easing}, opacity ${duration} ${easing}`;
            this.slots.active.style.transform = 'translateX(0) scale(1)';
            this.slots.active.style.opacity = '1';
            this.slots.active.setAttribute('aria-hidden', 'false');
            this.slots.active.querySelector('img').src = this.data[index].heroAsset;
            this.slots.active.querySelector('img').alt = `${this.data[index].name} whole dragon fruit`;

            this.slots.prev.style.transition = 'none';
            this.slots.prev.style.transform = `translateX(-${travelDist}vw) scale(0.85)`;
            this.slots.prev.style.opacity = '0';
            this.slots.prev.setAttribute('aria-hidden', 'true');
            const prevIdx = this._wrap(index - 1);
            this.slots.prev.querySelector('img').src = this.data[prevIdx].heroAsset;
        }
        
        setTimeout(() => {
            this.isAnimating = false;
            this.preload(index);
        }, this.reducedMotion ? 50 : 450); // Match the faster 0.4s duration
    }
    
    updateContent(index, isInit = false) {
        const fruit = this.data[index];
        
        // Update dots
        document.querySelectorAll('#showcase-progress button').forEach((button, i) => {
            button.classList.toggle('is-active', i === index);
        });
        
        if (isInit) {
            this.copy.number.textContent = `${String(index + 1).padStart(2, '0')} / ${String(this.data.length).padStart(2, '0')}`;
            this.copy.title.textContent = fruit.name; 
            this.copy.character.textContent = fruit.character; 
            this.copy.flesh.textContent = fruit.flesh; 
            this.copy.brix.textContent = fruit.brix;
            this.copy.flavor.textContent = fruit.flavor; 
            this.copy.pollination.textContent = fruit.pollination;
            this.copy.details.setAttribute('aria-label', `View ${fruit.name} details`);
            
            this.slots.active.querySelector('img').src = fruit.heroAsset;
            this.slots.active.querySelector('img').alt = `${fruit.name} whole dragon fruit`;
            
            // Preload neighbors with wrapping
            const nextIdx = this._wrap(index + 1);
            const prevIdx = this._wrap(index - 1);
            this.slots.next.querySelector('img').src = this.data[nextIdx].heroAsset;
            this.slots.prev.querySelector('img').src = this.data[prevIdx].heroAsset;

            this.slots.active.setAttribute('aria-hidden', 'false');
            this.slots.prev.setAttribute('aria-hidden', 'true');
            this.slots.next.setAttribute('aria-hidden', 'true');
        } else {
            const elementsToFade = [
                this.copy.number, this.copy.title, this.copy.character,
                this.copy.flesh, this.copy.brix, this.copy.flavor, this.copy.pollination
            ];
            
            // Faster text crossfade
            elementsToFade.forEach(el => {
                el.style.transition = 'opacity 0.15s ease';
                el.style.opacity = '0';
            });
            
            setTimeout(() => {
                this.copy.number.textContent = `${String(index + 1).padStart(2, '0')} / ${String(this.data.length).padStart(2, '0')}`;
                this.copy.title.textContent = fruit.name; 
                this.copy.character.textContent = fruit.character; 
                this.copy.flesh.textContent = fruit.flesh; 
                this.copy.brix.textContent = fruit.brix;
                this.copy.flavor.textContent = fruit.flavor; 
                this.copy.pollination.textContent = fruit.pollination;
                this.copy.details.setAttribute('aria-label', `View ${fruit.name} details`);
                
                elementsToFade.forEach(el => {
                    el.style.opacity = '1';
                });
            }, 150);
        }
    }
}

function openVarietyModal(id) {
    const variety = varieties.find((item) => item.id === id); const modal = document.getElementById('variety-modal'); if (!variety || !modal) return;
    const lang = window.homeFarmApp && window.homeFarmApp.currentLang === 'ml' ? 'ml' : 'en';
    const field = (name) => lang === 'ml' && variety[`${name}ML`] ? variety[`${name}ML`] : variety[name];
    document.getElementById('modal-image').src = variety.cutAsset; document.getElementById('modal-image').alt = variety.altText;
    document.getElementById('modal-badge').textContent = `${String(variety.number).padStart(2, '0')} / ${String(varieties.length).padStart(2, '0')}`;
    document.getElementById('modal-title').textContent = field('name'); document.getElementById('modal-subtitle').textContent = field('character');
    document.getElementById('modal-facts').innerHTML = [['MAIN FEATURE', field('mainFeature')], ['SKIN', field('skin')], ['FLESH', field('flesh')], ['FLAVOR', field('flavor')], ['BRIX', variety.brix], ['POLLINATION', field('pollination')]].map(([label, value]) => `<div class="modal-spec-item"><span class="modal-spec-label">${label}</span><span class="modal-spec-value">${value || '-'}</span></div>`).join('');
    document.getElementById('modal-notes').innerHTML = `<div class="modal-notes-section"><p><strong>PLANT:</strong> ${field('plantNotes') || ''}</p><p><strong>FRUIT:</strong> ${field('fruitNotes') || ''}</p></div>`;
    modal.classList.remove('hidden'); modal.setAttribute('aria-hidden', 'false'); modal.setAttribute('aria-modal', 'true'); document.body.style.overflow = 'hidden'; if (window.homeFarmApp && window.homeFarmApp.lenis) window.homeFarmApp.lenis.stop();
    Array.from(document.getElementById('main').children).forEach(child => { if (child.id !== 'variety-modal') child.setAttribute('inert', 'true'); });
    const header = document.getElementById('main-header'); if (header) header.setAttribute('inert', 'true');
    setTimeout(() => document.getElementById('variety-modal-close-btn').focus(), 100);
}

function closeVarietyModal() {
    const modal = document.getElementById('variety-modal'); if (!modal) return;
    modal.classList.add('hidden'); modal.setAttribute('aria-hidden', 'true'); modal.removeAttribute('aria-modal'); document.body.style.overflow = ''; if (window.homeFarmApp && window.homeFarmApp.lenis) window.homeFarmApp.lenis.start();
    Array.from(document.getElementById('main').children).forEach(child => { if (child.id !== 'variety-modal') child.removeAttribute('inert'); });
    const header = document.getElementById('main-header'); if (header) header.removeAttribute('inert');
}

function bindModalCloseEvents() {
    document.getElementById('variety-modal-close-btn')?.addEventListener('click', closeVarietyModal);
    document.getElementById('variety-modal-close-bg')?.addEventListener('click', closeVarietyModal);
}
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', bindModalCloseEvents) : bindModalCloseEvents();
