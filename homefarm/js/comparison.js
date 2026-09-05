/**
 * HomeFarm — Interactive Comparison
 * Handles the overlapping visual cards and filtering.
 * 
 * FIX: Card widths are now properly set via CSS (.comp-card in style.css).
 * Negative margins are reduced so text is never clipped.
 * The inline width/margin classes from the old JS are removed.
 */

class ComparisonGrid {
    constructor() {
        if (typeof varieties === 'undefined' || varieties.length === 0) return;
        
        this.data = varieties;
        this.container = document.getElementById('comparison-cards-area');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        
        if (!this.container) return;

        this.init();
    }

    init() {
        this.renderCards(this.data);
        this.setupFilters();
        this.renderBrixCallouts();
    }

    renderBrixCallouts() {
        const calloutsContainer = document.getElementById('dynamic-brix-callouts');
        if (!calloutsContainer) return;

        // Sort varieties by max reported brix
        const sorted = [...this.data].sort((a, b) => {
            return b.maxBrix - a.maxBrix;
        });

        // Take top 2
        const topTwo = sorted.slice(0, 2);
        
        calloutsContainer.innerHTML = '';
        topTwo.forEach(variety => {
            const callout = document.createElement('div');
            callout.className = 'bg-black text-cream p-5 md:p-6 rounded-xl flex flex-col min-w-[180px] flex-1 max-w-[280px]';
            callout.innerHTML = `
                <span class="text-[9px] tracking-[0.15em] opacity-60 mb-2 uppercase lang-text" data-en="HIGHEST REPORTED BRIX" data-ml="ഏറ്റവും ഉയർന്ന ബ്രിക്സ്">HIGHEST REPORTED BRIX</span>
                <span class="font-display text-2xl md:text-3xl font-bold text-pink mb-1">${variety.brix}</span>
                <span class="text-[11px] tracking-wider font-semibold uppercase lang-text" data-en="${variety.name}" data-ml="${variety.nameML}">${variety.name}</span>
            `;
            calloutsContainer.appendChild(callout);
        });
    }

    renderCards(filteredData) {
        this.container.innerHTML = '';
        
        filteredData.forEach((variety, index) => {
            const card = document.createElement('div');
            // Use the CSS .comp-card class for width and overlap — no more inline w-[300px] or -ml-16
            card.className = `comp-card shrink-0 snap-center relative`;
            card.style.zIndex = index; // ensures proper stacking order left-to-right

            // Calculate visual Brix scale (Assuming max 22 for scale since Palora is 22)
            const brixStr = variety.brix || "";
            let brixAvg = (variety.minBrix + variety.maxBrix) / 2;
            const brixPercentage = Math.min(100, (brixAvg / 22) * 100);

            card.innerHTML = `
                <div class="font-display text-4xl text-black/10 font-black leading-none mb-3">0${variety.number}</div>
                <h3 class="text-lg font-semibold mb-4 leading-tight lang-text" data-en="${variety.name}" data-ml="${variety.nameML}">${variety.name}</h3>
                
                <div class="w-full h-[140px] rounded-xl overflow-hidden mb-5">
                    <img src="${variety.image}" alt="${variety.altText}" loading="lazy" class="w-full h-full object-cover">
                </div>

                <div class="flex flex-col gap-1 mb-4">
                    <span class="text-[9px] uppercase tracking-[0.1em] opacity-50">Sweetness (Brix)</span>
                    <span class="font-semibold text-sm">${brixStr}</span>
                    <div class="w-full h-1 bg-black/10 rounded-full relative mt-1">
                        <div class="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-pink rounded-full transition-all duration-500" style="left: ${brixPercentage}%"></div>
                    </div>
                </div>

                <div class="flex flex-col gap-1 mb-3">
                    <span class="text-[9px] uppercase tracking-[0.1em] opacity-50">Flesh Color</span>
                    <span class="font-semibold text-sm lang-text" data-en="${variety.flesh}" data-ml="${variety.fleshML}">${variety.flesh}</span>
                </div>

                <div class="flex flex-col gap-1">
                    <span class="text-[9px] uppercase tracking-[0.1em] opacity-50">Pollination</span>
                    <span class="font-semibold text-sm lang-text" data-en="${variety.pollination}" data-ml="${variety.pollinationML}">${variety.pollination}</span>
                </div>
            `;

            this.container.appendChild(card);
        });

        // Animate entrance
        if (typeof gsap !== 'undefined') {
            gsap.fromTo('.comp-card', 
                { opacity: 0, x: 40 },
                { opacity: 1, x: 0, duration: 0.4, stagger: 0.04, ease: "power2.out" }
            );
        }
        // Persist language on newly rendered cards
        if (window.homeFarmApp && typeof window.homeFarmApp.updateLanguage === 'function') {
            window.homeFarmApp.updateLanguage(window.homeFarmApp.currentLang);
        }
    }

    setupFilters() {
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active state
                this.filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                const filter = e.target.dataset.filter;
                let filteredData = this.data;

                if (filter === 'sweetest') {
                    // Filter for max brix >= 18
                    filteredData = this.data.filter(v => v.maxBrix >= 18);
                } else if (filter === 'white-flesh') {
                    filteredData = this.data.filter(v => v.fleshCategory === 'white');
                } else if (filter === 'red-flesh') {
                    filteredData = this.data.filter(v => v.fleshCategory === 'red');
                } else if (filter === 'self-fertile') {
                    filteredData = this.data.filter(v => v.isSelfFertile);
                }

                this.renderCards(filteredData);
                
                // Scroll container back to start after filter change
                this.container.scrollLeft = 0;
            });
        });
    }
}
