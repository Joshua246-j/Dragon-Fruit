/**
 * HomeFarm — Premium Varieties Grid
 * Generates an exposed CSS Grid for desktop and a swipeable horizontal track for mobile.
 */

class VarietiesCarousel {
    constructor() {
        if (typeof varieties === 'undefined' || !Array.isArray(varieties) || varieties.length === 0) {
            console.error('[VARIETIES] varieties data not found or empty.');
            return;
        }
        
        this.data = varieties;
        this.total = varieties.length;
        this.gridContainer = document.getElementById('varieties-grid');
        this.currentIndex = 0;

        if (!this.gridContainer) {
            console.error('[VARIETIES] #varieties-grid missing.');
            return;
        }

        this.init();
    }

    init() {
        this.renderGrid();
        this.setupMobileScrollObserver();
    }

    getLang() {
        return (window.homeFarmApp && window.homeFarmApp.currentLang === 'ml') ? 'ml' : 'en';
    }

    getField(variety, field) {
        const lang = this.getLang();
        if (lang === 'ml') {
            const mlKey = field + 'ML';
            if (variety[mlKey]) return variety[mlKey];
        }
        return variety[field] || '';
    }

    renderGrid() {
        this.gridContainer.innerHTML = '';
        const lang = this.getLang();

        const labels = {
            mainFeature: { en: 'MAIN FEATURE', ml: 'പ്രധാന സവിശേഷത' },
            about: { en: 'ABOUT', ml: 'ഇതിനെക്കുറിച്ച്' },
            skinLabel: { en: 'Skin', ml: 'തൊലി' },
            fleshLabel: { en: 'Flesh', ml: 'ഉൾഭാഗം' },
            flavorLabel: { en: 'Flavor', ml: 'രുചി' },
            brixLabel: { en: 'Brix', ml: 'ബ്രിക്സ്' },
            orderPlant: { en: 'ORDER PLANT', ml: 'ചെടി ഓർഡർ ചെയ്യുക' },
            orderCutting: { en: 'ORDER CUTTING', ml: 'കട്ടിംഗ് ഓർഡർ ചെയ്യുക' },
            checkFruit: { en: 'CHECK FRUIT', ml: 'പഴം പരിശോധിക്കുക' }
        };

        this.data.forEach((variety, index) => {
            const numberFormatted = (index + 1).toString().padStart(2, '0');
            const totalFormatted = this.total.toString().padStart(2, '0');
            
            // Format name (italicize second word onwards in EN)
            const nameToUse = lang === 'ml' ? variety.nameML : variety.name;
            let styledName = nameToUse;
            if (lang !== 'ml') {
                const nameParts = variety.name.split(' ');
                const firstName = nameParts[0];
                const restName = nameParts.slice(1).join(' ');
                styledName = restName ? `${firstName} <em>${restName}</em>` : firstName;
            }

            const card = document.createElement('div');
            card.className = 'premium-variety-card';
            
            let orderUrl = '#', cuttingUrl = '#', fruitUrl = '#';
            if (typeof getWhatsAppURL === 'function') {
                orderUrl = getWhatsAppURL(variety.name, 'plant');
                cuttingUrl = getWhatsAppURL(variety.name, 'cutting');
                fruitUrl = getWhatsAppURL(variety.name, 'fruit');
            }

            const charVal = this.getField(variety, 'character');
            const mainFeatureVal = this.getField(variety, 'mainFeature');
            const descVal = this.getField(variety, 'description');
            const skinVal = this.getField(variety, 'skin');
            const fleshVal = this.getField(variety, 'flesh');
            const flavorVal = this.getField(variety, 'flavor');
            const brixVal = variety.brix || '';
            const brixNoteVal = this.getField(variety, 'brixNote');
            const pollVal = this.getField(variety, 'pollination');
            const availVal = this.getField(variety, 'availability');

            const loadingStrategy = index < 4 ? 'eager' : 'lazy';

            card.innerHTML = `
                <div class="premium-card-image-wrapper">
                    <div class="premium-card-image-circle">
                        <img src="${variety.image}" alt="${variety.altText}" class="premium-card-image" loading="${loadingStrategy}">
                    </div>
                    <div class="premium-card-number-badge">${numberFormatted} / ${totalFormatted}</div>
                </div>
                <div class="premium-card-body">
                    <div class="premium-card-title-wrapper">
                        <h3 class="premium-card-name">${styledName}</h3>
                    </div>
                    <p class="premium-card-character">${charVal}</p>
                    
                    <div class="premium-card-facts">
                        <div class="premium-fact-grid" style="border: none; padding-top: 0; padding-bottom: 0;">
                            <div class="premium-fact-col">
                                <span class="premium-fact-label">${lang === 'ml' ? 'ഉൾഭാഗം' : 'FLESH'}</span>
                                <span class="premium-fact-value text-[13px] text-pink fact-clamp-1" title="${variety.flesh || ''}">${variety.flesh || '-'}</span>
                            </div>
                            <div class="premium-fact-col" style="border: none;">
                                <span class="premium-fact-label">${lang === 'ml' ? labels.brixLabel.ml : labels.brixLabel.en}</span>
                                <span class="premium-fact-value">${brixVal}</span>
                            </div>
                        </div>
                    </div>

                    <div class="premium-card-footer">
                        <button class="premium-btn premium-btn-secondary w-full mb-2" onclick="openVarietyModal('${variety.id}')">VIEW DETAILS</button>
                        <a href="#contact" onclick="if(window.homeFarmApp && window.homeFarmApp.lenis) window.homeFarmApp.lenis.scrollTo('#contact');" class="premium-btn premium-btn-primary w-full">${lang === 'ml' ? labels.orderPlant.ml : labels.orderPlant.en}</a>
                    </div>
                </div>
            `;
            this.gridContainer.appendChild(card);
        });

        // Initialize mobile dots
        const dotsContainer = document.getElementById('mobile-carousel-dots');
        if (dotsContainer) {
            dotsContainer.innerHTML = varieties.map((_, i) => 
                `<div class="carousel-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></div>`
            ).join('');
        }
    }

    setupMobileScrollObserver() {
        const hideHint = () => {
            const hint = document.querySelector('.swipe-hint');
            if (hint && !hint.classList.contains('hidden')) {
                hint.classList.add('hidden');
            }
        };
        
        this.gridContainer.addEventListener('touchstart', hideHint, { passive: true });
        this.gridContainer.addEventListener('mousedown', hideHint, { passive: true });

        let scrollTimeout;
        this.gridContainer.addEventListener('scroll', () => {
            if (window.innerWidth > 767) return;
            
            if (scrollTimeout) {
                window.cancelAnimationFrame(scrollTimeout);
            }
            
            scrollTimeout = window.requestAnimationFrame(() => {
                const cards = this.gridContainer.querySelectorAll('.premium-variety-card');
                if (cards.length === 0) return;
                
                let stride = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : cards[0].offsetWidth;
                if (stride <= 0) stride = 300; 
                
                let nearestIndex = Math.round(this.gridContainer.scrollLeft / stride);
                nearestIndex = Math.max(0, Math.min(nearestIndex, cards.length - 1));
                
                if (nearestIndex !== this.currentIndex) {
                    this.currentIndex = nearestIndex;
                    this.updateMobileProgress();
                }
            });
        }, { passive: true });
    }

    updateMobileProgress() {
        const dots = document.querySelectorAll('.carousel-dot');
        dots.forEach((dot, index) => {
            if (index === this.currentIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
}

/* ============================================================
   VARIETY MODAL LOGIC
   ============================================================ */
function openVarietyModal(id) {
    if (typeof varieties === 'undefined') return;
    const variety = varieties.find(v => v.id === id);
    if (!variety) return;
    
    const lang = (window.homeFarmApp && window.homeFarmApp.currentLang === 'ml') ? 'ml' : 'en';
    const getField = (field) => {
        if (lang === 'ml') {
            const mlKey = field + 'ML';
            if (variety[mlKey]) return variety[mlKey];
        }
        return variety[field] || '';
    };

    const modal = document.getElementById('variety-modal');
    if (!modal) return;

    // Populate data
    document.getElementById('modal-image').src = variety.image;
    document.getElementById('modal-image').alt = variety.altText;
    
    const num = (variety.number || 0).toString().padStart(2, '0');
    document.getElementById('modal-badge').textContent = `${num} / ${varieties.length.toString().padStart(2, '0')}`;
    
    document.getElementById('modal-title').textContent = lang === 'ml' ? variety.nameML : variety.name;
    document.getElementById('modal-subtitle').textContent = getField('character');
    
    // Facts
    const factsContainer = document.getElementById('modal-facts');
    factsContainer.innerHTML = `
        <div class="modal-editorial-grid">
            <div class="modal-spec-item">
                <span class="modal-spec-label">${lang === 'ml' ? 'പ്രധാന സവിശേഷത' : 'MAIN FEATURE'}</span>
                <span class="modal-spec-value" style="color: #e6c875;">${getField('mainFeature')}</span>
            </div>
            <div class="modal-spec-item">
                <span class="modal-spec-label">${lang === 'ml' ? 'തൊലി' : 'SKIN'}</span>
                <span class="modal-spec-value">${getField('skin')}</span>
            </div>
            <div class="modal-spec-item">
                <span class="modal-spec-label">${lang === 'ml' ? 'ഉൾഭാഗം' : 'FLESH'}</span>
                <span class="modal-spec-value">${getField('flesh')}</span>
            </div>
            <div class="modal-spec-item">
                <span class="modal-spec-label">${lang === 'ml' ? 'രുചി' : 'FLAVOR'}</span>
                <span class="modal-spec-value">${getField('flavor')}</span>
            </div>
            <div class="modal-spec-item">
                <span class="modal-spec-label">${lang === 'ml' ? 'ബ്രിക്സ്' : 'BRIX'}</span>
                <span class="modal-spec-value">${variety.brix || '-'}</span>
            </div>
            <div class="modal-spec-item">
                <span class="modal-spec-label">${lang === 'ml' ? 'പരാഗണം' : 'POLLINATION'}</span>
                <span class="modal-spec-value">${getField('pollination') || '-'}</span>
            </div>
        </div>
    `;

    // Notes
    const notesContainer = document.getElementById('modal-notes');
    let notesHTML = '';
    if (variety.plantNotes || variety.fruitNotes) {
        notesHTML = `
            <div class="modal-notes-section">
                ${variety.plantNotes ? `<p><strong>${lang === 'ml' ? 'ചെടി:' : 'PLANT:'}</strong> ${getField('plantNotes')}</p>` : ''}
                ${variety.fruitNotes ? `<p><strong>${lang === 'ml' ? 'പഴം:' : 'FRUIT:'}</strong> ${getField('fruitNotes')}</p>` : ''}
            </div>
        `;
    }
    notesContainer.innerHTML = notesHTML;

    // Update Modal Order Button
    const orderBtn = document.getElementById('modal-order-btn');
    if (orderBtn) {
        orderBtn.href = '#contact';
        orderBtn.removeAttribute('target');
        orderBtn.onclick = function(e) {
            e.preventDefault();
            if (typeof closeVarietyModal === 'function') closeVarietyModal();
            if (window.homeFarmApp && window.homeFarmApp.lenis) {
                window.homeFarmApp.lenis.scrollTo('#contact');
            } else {
                document.getElementById('contact').scrollIntoView({behavior: 'smooth'});
            }
        };
    }

    // Show modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    if (window.homeFarmApp && window.homeFarmApp.lenis) {
        window.homeFarmApp.lenis.stop();
    }
}

function closeVarietyModal() {
    const modal = document.getElementById('variety-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        if (window.homeFarmApp && window.homeFarmApp.lenis) {
            window.homeFarmApp.lenis.start();
        }
    }
}

// Bind close events safely
function bindModalCloseEvents() {
    const closeBtn = document.getElementById('variety-modal-close-btn');
    const closeBg = document.getElementById('variety-modal-close-bg');
    if (closeBtn) closeBtn.addEventListener('click', closeVarietyModal);
    if (closeBg) closeBg.addEventListener('click', closeVarietyModal);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindModalCloseEvents);
} else {
    bindModalCloseEvents();
}
