// ============================================
// GLOBAL VARIABLES & CONFIGURATION
// ============================================

let autoArrangeEnabled = true;
let snapToGridEnabled = true;
let gridSize = 50; // pixels per grid cell
let isDragging = false;
let isResizing = false;
let currentCard = null;
let currentHandle = null;
let startX, startY, startWidth, startHeight;
let originalX, originalY;
let gridVisible = false;
let arrangementTimeout = null;

// Grid presets for auto-arrangement
const PRESETS = {
    verticalStack: {
        left: [{ height: '60%' }, { height: '40%' }],
        right: [{ height: '50%' }, { height: '50%' }]
    },
    horizontalSplit: {
        left: [{ height: '100%' }],
        right: [{ height: '100%' }, { height: '0%', display: 'none' }]
    },
    videoFocus: {
        left: [{ height: '80%' }, { height: '20%' }],
        right: [{ height: '60%' }, { height: '40%' }]
    },
    default: {
        left: [{ height: '55%' }, { height: '45%' }],
        right: [{ height: '50%' }, { height: '50%' }]
    }
};

// ============================================
// DOM ELEMENT REFERENCES
// ============================================

const arrangeStatus = document.getElementById('arrangeStatus');
const snapIndicator = document.getElementById('snapIndicator');
const leftPanelContent = document.getElementById('leftPanelContent');
const rightPanelContent = document.getElementById('rightPanelContent');
const leftGrid = document.getElementById('leftGrid');
const rightGrid = document.getElementById('rightGrid');
const autoArrangeIcon = document.getElementById('autoArrangeIcon');
const autoArrangeText = document.getElementById('autoArrangeText');
const snapIcon = document.getElementById('snapIcon');
const snapText = document.getElementById('snapText');

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Projectile Motion - Auto-Arranging Cards System Initialized');

    // Initialize draggable cards
    initDraggableCards();

    // Initialize resizable cards
    initResizableCards();

    // Initialize tab functionality
    initTabs();

    // Initialize fallback handlers
    initFallbackHandlers();

    // Auto-arrange on initial load
    setTimeout(() => {
        autoArrangeAll();
        showNotification('System ready. Cards auto-arranged.');
    }, 500);
});

// ============================================
// DRAGGABLE CARDS SYSTEM
// ============================================

function initDraggableCards() {
    const headers = document.querySelectorAll('.frame-header');

    headers.forEach(header => {
        header.addEventListener('mousedown', startDrag);
        header.addEventListener('touchstart', startDragTouch, { passive: false });
    });

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', dragTouch, { passive: false });
    document.addEventListener('touchend', stopDrag);
}

function startDrag(e) {
    if (e.button !== 0 && e.type === 'mousedown') return; // Left click only

    e.preventDefault();
    currentCard = e.target.closest('.resource-frame');
    if (!currentCard) return;

    isDragging = true;
    const rect = currentCard.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    originalX = rect.left;
    originalY = rect.top;

    currentCard.style.zIndex = '1000';
    currentCard.style.position = 'fixed';
    currentCard.style.left = rect.left + 'px';
    currentCard.style.top = rect.top + 'px';
    currentCard.style.width = rect.width + 'px';
    currentCard.style.cursor = 'grabbing';

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
}

function startDragTouch(e) {
    e.preventDefault();
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    currentCard = e.target.closest('.resource-frame');
    if (!currentCard) return;

    isDragging = true;
    const rect = currentCard.getBoundingClientRect();
    startX = touch.clientX - rect.left;
    startY = touch.clientY - rect.top;
    originalX = rect.left;
    originalY = rect.top;

    currentCard.style.zIndex = '1000';
    currentCard.style.position = 'fixed';
    currentCard.style.left = rect.left + 'px';
    currentCard.style.top = rect.top + 'px';
    currentCard.style.width = rect.width + 'px';

    document.body.style.userSelect = 'none';
}

function drag(e) {
    if (!isDragging || !currentCard) return;
    e.preventDefault();

    let x = e.clientX - startX;
    let y = e.clientY - startY;

    // Apply boundaries
    const container = document.querySelector('.container').getBoundingClientRect();
    const cardRect = currentCard.getBoundingClientRect();

    x = Math.max(container.left, Math.min(x, container.right - cardRect.width));
    y = Math.max(container.top, Math.min(y, container.bottom - cardRect.height));

    currentCard.style.left = x + 'px';
    currentCard.style.top = y + 'px';

    // Check for panel drops
    highlightDropZones(x, y, cardRect);
}

function dragTouch(e) {
    if (!isDragging || !currentCard || e.touches.length !== 1) return;
    e.preventDefault();

    const touch = e.touches[0];
    let x = touch.clientX - startX;
    let y = touch.clientY - startY;

    // Apply boundaries
    const container = document.querySelector('.container').getBoundingClientRect();
    const cardRect = currentCard.getBoundingClientRect();

    x = Math.max(container.left, Math.min(x, container.right - cardRect.width));
    y = Math.max(container.top, Math.min(y, container.bottom - cardRect.height));

    currentCard.style.left = x + 'px';
    currentCard.style.top = y + 'px';

    // Check for panel drops
    highlightDropZones(x, y, cardRect);
}

function stopDrag(e) {
    if (!isDragging || !currentCard) return;

    isDragging = false;
    currentCard.style.cursor = '';
    currentCard.style.zIndex = '';

    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Get final position
    const rect = currentCard.getBoundingClientRect();
    const targetPanel = getDropPanel(rect.left + rect.width / 2, rect.top + rect.height / 2);

    if (targetPanel) {
        // Snap to grid if enabled
        if (snapToGridEnabled) {
            snapToGrid(currentCard, targetPanel);
            showSnapIndicator();
        }

        // Move to target panel
        moveCardToPanel(currentCard, targetPanel);

        // Auto-arrange if enabled
        if (autoArrangeEnabled) {
            scheduleAutoArrange(targetPanel);
        }
    } else {
        // Return to original position
        currentCard.style.position = '';
        currentCard.style.left = '';
        currentCard.style.top = '';
    }

    // Reset drop zone highlighting
    resetDropZones();
    currentCard = null;
}

// ============================================
// RESIZABLE CARDS SYSTEM
// ============================================

function initResizableCards() {
    const resizeHandles = document.querySelectorAll('.resize-handle');

    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', startResize);
        handle.addEventListener('touchstart', startResizeTouch, { passive: false });
    });
}

function startResize(e) {
    e.preventDefault();
    e.stopPropagation();

    currentCard = e.target.closest('.resource-frame');
    if (!currentCard) return;

    isResizing = true;
    currentHandle = e.target.closest('.resize-handle');

    const rect = currentCard.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    startWidth = rect.width;
    startHeight = rect.height;

    currentCard.style.userSelect = 'none';
    document.body.style.cursor = 'se-resize';
    document.body.style.userSelect = 'none';
}

function startResizeTouch(e) {
    e.preventDefault();
    e.stopPropagation();

    if (e.touches.length !== 1) return;

    currentCard = e.target.closest('.resource-frame');
    if (!currentCard) return;

    isResizing = true;
    currentHandle = e.target.closest('.resize-handle');

    const rect = currentCard.getBoundingClientRect();
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    startWidth = rect.width;
    startHeight = rect.height;

    currentCard.style.userSelect = 'none';
    document.body.style.userSelect = 'none';
}

document.addEventListener('mousemove', resize);
document.addEventListener('mouseup', stopResize);
document.addEventListener('touchmove', resizeTouch, { passive: false });
document.addEventListener('touchend', stopResize);

function resize(e) {
    if (!isResizing || !currentCard) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // Calculate new dimensions with constraints
    const minWidth = 300;
    const minHeight = 200;
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.8;

    let newWidth = Math.max(minWidth, Math.min(startWidth + deltaX, maxWidth));
    let newHeight = Math.max(minHeight, Math.min(startHeight + deltaY, maxHeight));

    // Apply constraints based on panel
    const panel = currentCard.closest('.panel-content');
    if (panel) {
        const panelRect = panel.getBoundingClientRect();
        newWidth = Math.min(newWidth, panelRect.width);
        newHeight = Math.min(newHeight, panelRect.height);
    }

    currentCard.style.width = newWidth + 'px';
    currentCard.style.height = newHeight + 'px';

    // Update size indicator
    updateSizeIndicator(currentCard);
}

function resizeTouch(e) {
    if (!isResizing || !currentCard || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    // Calculate new dimensions with constraints
    const minWidth = 300;
    const minHeight = 200;
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.8;

    let newWidth = Math.max(minWidth, Math.min(startWidth + deltaX, maxWidth));
    let newHeight = Math.max(minHeight, Math.min(startHeight + deltaY, maxHeight));

    // Apply constraints based on panel
    const panel = currentCard.closest('.panel-content');
    if (panel) {
        const panelRect = panel.getBoundingClientRect();
        newWidth = Math.min(newWidth, panelRect.width);
        newHeight = Math.min(newHeight, panelRect.height);
    }

    currentCard.style.width = newWidth + 'px';
    currentCard.style.height = newHeight + 'px';

    // Update size indicator
    updateSizeIndicator(currentCard);
}

function stopResize() {
    if (!isResizing || !currentCard) return;

    isResizing = false;
    currentCard.style.userSelect = '';
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Auto-arrange after resize if enabled
    if (autoArrangeEnabled) {
        const panel = currentCard.closest('.panel-content');
        if (panel) {
            scheduleAutoArrange(panel);
        }
    }

    currentCard = null;
    currentHandle = null;
}

// ============================================
// AUTO-ARRANGE SYSTEM
// ============================================

function toggleAutoArrange() {
    autoArrangeEnabled = !autoArrangeEnabled;

    if (autoArrangeEnabled) {
        autoArrangeIcon.className = 'fas fa-robot';
        autoArrangeText.textContent = 'Auto: ON';
        showNotification('Auto-arrange enabled');
    } else {
        autoArrangeIcon.className = 'fas fa-robot';
        autoArrangeText.textContent = 'Auto: OFF';
        showNotification('Auto-arrange disabled');
    }
}

function autoArrangeAll() {
    showArrangeStatus();

    // Arrange left panel
    const leftCards = Array.from(leftPanelContent.querySelectorAll('.resource-frame'));
    arrangeCardsInPanel(leftCards, leftPanelContent);

    // Arrange right panel
    const rightCards = Array.from(rightPanelContent.querySelectorAll('.resource-frame'));
    arrangeCardsInPanel(rightCards, rightPanelContent);

    setTimeout(() => {
        hideArrangeStatus();
        showNotification('All cards auto-arranged');
    }, 800);
}

function smartArrange() {
    showArrangeStatus();

    // Analyze current layout and choose best arrangement
    const leftCards = Array.from(leftPanelContent.querySelectorAll('.resource-frame'));
    const rightCards = Array.from(rightPanelContent.querySelectorAll('.resource-frame'));

    // Choose preset based on number of cards
    let preset;
    if (leftCards.length >= 2 && rightCards.length >= 2) {
        preset = 'verticalStack';
    } else if (leftCards.length === 1 && rightCards.length === 2) {
        preset = 'horizontalSplit';
    } else {
        preset = 'default';
    }

    applyPreset(preset);

    setTimeout(() => {
        hideArrangeStatus();
        showNotification(`Smart arrangement applied: ${preset}`);
    }, 800);
}

function arrangeCardsInPanel(cards, panel) {
    if (cards.length === 0) return;

    // Sort cards by current vertical position
    cards.sort((a, b) => {
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();
        return rectA.top - rectB.top;
    });

    const panelRect = panel.getBoundingClientRect();
    const availableHeight = panelRect.height;
    const cardCount = cards.length;
    const gap = 25; // Gap between cards

    // Calculate equal heights for all cards
    const cardHeight = (availableHeight - (cardCount - 1) * gap) / cardCount;

    cards.forEach((card, index) => {
        card.style.position = '';
        card.style.left = '';
        card.style.top = '';
        card.style.width = '100%';
        card.style.height = cardHeight + 'px';
        card.style.transform = '';

        // Position card
        card.style.marginTop = index === 0 ? '0' : gap + 'px';

        // Add arranging animation
        card.classList.add('arranging');
        setTimeout(() => card.classList.remove('arranging'), 500);
    });
}

function scheduleAutoArrange(panel) {
    if (!autoArrangeEnabled) return;

    if (arrangementTimeout) {
        clearTimeout(arrangementTimeout);
    }

    arrangementTimeout = setTimeout(() => {
        const cards = Array.from(panel.querySelectorAll('.resource-frame'));
        arrangeCardsInPanel(cards, panel);
        arrangementTimeout = null;
    }, 300);
}

// ============================================
// GRID SYSTEM
// ============================================

function toggleSnapToGrid() {
    snapToGridEnabled = !snapToGridEnabled;

    if (snapToGridEnabled) {
        snapIcon.className = 'fas fa-magnet';
        snapText.textContent = 'Snap: ON';
        showNotification('Snap to grid enabled');
    } else {
        snapIcon.className = 'fas fa-magnet';
        snapText.textContent = 'Snap: OFF';
        showNotification('Snap to grid disabled');
    }
}

function showGrid() {
    gridVisible = !gridVisible;

    if (gridVisible) {
        leftGrid.classList.add('active');
        rightGrid.classList.add('active');
        showNotification('Grid visible');
    } else {
        leftGrid.classList.remove('active');
        rightGrid.classList.remove('active');
        showNotification('Grid hidden');
    }
}

function snapToGrid(card, panel) {
    if (!snapToGridEnabled) return;

    const cardRect = card.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();

    // Calculate grid-aligned position
    const gridX = Math.round((cardRect.left - panelRect.left) / gridSize) * gridSize;
    const gridY = Math.round((cardRect.top - panelRect.top) / gridSize) * gridSize;

    // Apply snapped position
    card.style.left = (panelRect.left + gridX) + 'px';
    card.style.top = (panelRect.top + gridY) + 'px';

    // Add snap animation
    card.classList.add('snapped');
    setTimeout(() => card.classList.remove('snapped'), 300);
}

// ============================================
// DROP ZONE MANAGEMENT
// ============================================

function highlightDropZones(x, y, cardRect) {
    const panels = [
        { element: leftPanelContent, rect: leftPanelContent.getBoundingClientRect() },
        { element: rightPanelContent, rect: rightPanelContent.getBoundingClientRect() }
    ];

    // Reset all panels
    panels.forEach(panel => {
        panel.element.style.boxShadow = '';
        panel.element.style.borderColor = '';
    });

    // Find which panel the card is over
    const centerX = x + cardRect.width / 2;
    const centerY = y + cardRect.height / 2;

    panels.forEach(panel => {
        const rect = panel.rect;
        if (centerX > rect.left && centerX < rect.right &&
            centerY > rect.top && centerY < rect.bottom) {
            // Highlight the panel
            panel.element.style.boxShadow = 'inset 0 0 0 3px var(--secondary-color)';
            panel.element.style.borderColor = 'var(--secondary-color)';
        }
    });
}

function resetDropZones() {
    leftPanelContent.style.boxShadow = '';
    leftPanelContent.style.borderColor = '';
    rightPanelContent.style.boxShadow = '';
    rightPanelContent.style.borderColor = '';
}

function getDropPanel(x, y) {
    const panels = [
        { element: leftPanelContent, rect: leftPanelContent.getBoundingClientRect() },
        { element: rightPanelContent, rect: rightPanelContent.getBoundingClientRect() }
    ];

    for (const panel of panels) {
        const rect = panel.rect;
        if (x > rect.left && x < rect.right && y > rect.top && y < rect.bottom) {
            return panel.element;
        }
    }

    return null;
}

function moveCardToPanel(card, targetPanel) {
    const currentPanel = card.parentElement;

    if (currentPanel === targetPanel) {
        // Card is already in this panel
        card.style.position = '';
        card.style.left = '';
        card.style.top = '';
        card.style.width = '';
        card.style.height = '';
        return;
    }

    // Move card to target panel
    currentPanel.removeChild(card);
    targetPanel.appendChild(card);

    // Reset styles
    card.style.position = '';
    card.style.left = '';
    card.style.top = '';
    card.style.width = '';
    card.style.height = '';
    card.style.marginTop = '';

    // Update data-panel attribute
    card.setAttribute('data-panel', targetPanel === leftPanelContent ? 'left' : 'right');

    // Update index for all cards in target panel
    const newCards = Array.from(targetPanel.querySelectorAll('.resource-frame'));
    newCards.forEach((c, index) => {
        c.setAttribute('data-index', index);
    });
}

// ============================================
// PRESET LAYOUTS
// ============================================

function applyPreset(presetName) {
    showArrangeStatus();

    const preset = PRESETS[presetName] || PRESETS.default;

    // Apply to left panel
    const leftCards = Array.from(leftPanelContent.querySelectorAll('.resource-frame'));
    leftCards.forEach((card, index) => {
        const settings = preset.left[index] || preset.left[preset.left.length - 1];
        applyCardSettings(card, settings);
    });

    // Apply to right panel
    const rightCards = Array.from(rightPanelContent.querySelectorAll('.resource-frame'));
    rightCards.forEach((card, index) => {
        const settings = preset.right[index] || preset.right[preset.right.length - 1];
        applyCardSettings(card, settings);
    });

    setTimeout(() => {
        hideArrangeStatus();
        showNotification(`Preset applied: ${presetName}`);
    }, 800);
}

function applyCardSettings(card, settings) {
    if (settings.display === 'none') {
        card.style.display = 'none';
    } else {
        card.style.display = 'flex';
        card.style.width = '100%';

        if (settings.height) {
            card.style.height = settings.height;
        }

        if (settings.width) {
            card.style.width = settings.width;
        }
    }

    card.classList.add('arranging');
    setTimeout(() => card.classList.remove('arranging'), 500);
}

function resetToDefault() {
    applyPreset('default');
    showNotification('Reset to default layout');
}

// ============================================
// CARD CONTROLS
// ============================================

function autoFitCard(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;

    const panel = card.closest('.panel-content');
    const panelRect = panel.getBoundingClientRect();
    const cards = Array.from(panel.querySelectorAll('.resource-frame'));
    const cardIndex = cards.indexOf(card);

    if (cardIndex === 0) {
        // First card takes 70% height
        card.style.height = '70%';
        if (cards.length > 1) {
            cards[1].style.height = '30%';
        }
    } else if (cardIndex === 1 && cards.length === 2) {
        // Second card takes 70% height
        card.style.height = '70%';
        cards[0].style.height = '30%';
    } else {
        // Single card or other position
        card.style.height = '100%';
    }

    card.style.width = '100%';

    // Add animation
    card.classList.add('arranging');
    setTimeout(() => card.classList.remove('arranging'), 500);

    showNotification(`Auto-fit applied to ${cardId}`);
}

// ============================================
// TAB SYSTEM
// ============================================

function initTabs() {
    // PDF tabs
    const pdfTabs = document.querySelectorAll('[data-pdf]');
    pdfTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const pdfType = this.getAttribute('data-pdf');
            switchPDFTab(pdfType);
        });
    });

    // Simulation tabs
    const simTabs = document.querySelectorAll('[data-sim]');
    simTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const simType = this.getAttribute('data-sim');
            switchSimulationTab(simType);
        });
    });
}

function switchPDFTab(pdfType) {
    // Update active tab
    const tabs = document.querySelectorAll('.resource-tab[data-pdf]');
    tabs.forEach(tab => tab.classList.remove('active'));
    document.querySelector(`.resource-tab[data-pdf="${pdfType}"]`).classList.add('active');

    // Show corresponding pane
    const panes = document.querySelectorAll('.resource-pane');
    panes.forEach(pane => pane.classList.remove('active'));
    document.getElementById(`pdf${capitalizeFirst(pdfType)}Pane`).classList.add('active');
}

function switchSimulationTab(simType) {
    // Update active tab
    const tabs = document.querySelectorAll('.resource-tab[data-sim]');
    tabs.forEach(tab => tab.classList.remove('active'));
    document.querySelector(`.resource-tab[data-sim="${simType}"]`).classList.add('active');

    // Show corresponding pane
    const panes = document.querySelectorAll('.resource-pane');
    panes.forEach(pane => pane.classList.remove('active'));
    document.getElementById(`sim${capitalizeFirst(simType)}Pane`).classList.add('active');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function updateSizeIndicator(card) {
    const indicator = card.querySelector('.size-indicator');
    if (indicator) {
        const rect = card.getBoundingClientRect();
        indicator.textContent = `${Math.round(rect.width)}×${Math.round(rect.height)}`;
    }
}

function showArrangeStatus() {
    arrangeStatus.classList.add('active');
}

function hideArrangeStatus() {
    arrangeStatus.classList.remove('active');
}

function showSnapIndicator() {
    snapIndicator.classList.add('active');
    setTimeout(() => {
        snapIndicator.classList.remove('active');
    }, 1000);
}

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'auto-arrange-status';
    notification.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    notification.style.top = '120px';
    notification.style.backgroundColor = 'var(--dark-color)';

    document.body.appendChild(notification);

    // Show and animate
    setTimeout(() => notification.classList.add('active'), 10);

    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('active');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// ============================================
// FALLBACK HANDLERS
// ============================================

function initFallbackHandlers() {
    // Check if iframes loaded successfully
    setTimeout(() => {
        checkIframeLoad('videoContainer', 'videoFallback');
        checkIframeLoad('pdfBasicIframe', 'pdfBasicFallback');
        checkIframeLoad('pdfAdvancedIframe', 'pdfAdvancedFallback');
        checkIframeLoad('simMotionIframe', 'simMotionFallback');
        checkIframeLoad('simDataIframe', 'simDataFallback');
    }, 3000);
}

function checkIframeLoad(iframeId, fallbackId) {
    const iframe = document.getElementById(iframeId);
    const fallback = document.getElementById(fallbackId);

    if (iframe) {
        // Check if iframe has content
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDoc && iframeDoc.body && iframeDoc.body.children.length === 0) {
                // Iframe loaded but empty - show fallback
                if (fallback) fallback.style.display = 'flex';
            }
        } catch (e) {
            // Cross-origin error - iframe loaded but we can't access it
            // This is normal for YouTube, Google Drive, etc.
            console.log(`Iframe ${iframeId} loaded (cross-origin)`);
        }
    }
}

// ============================================
// EXTERNAL LINK FUNCTIONS
// ============================================

function openVideoInNewWindow() {
    window.open('https://www.youtube.com/watch?v=NwL6QR9kJOM', '_blank');
}

function openVideoFullscreen() {
    const videoCard = document.getElementById('videoCard');
    const videoContainer = document.getElementById('videoContainer');

    if (videoCard.requestFullscreen) {
        videoCard.requestFullscreen();
    } else if (videoCard.webkitRequestFullscreen) {
        videoCard.webkitRequestFullscreen();
    } else if (videoCard.msRequestFullscreen) {
        videoCard.msRequestFullscreen();
    }
}

function switchPDF() {
    const activeTab = document.querySelector('.resource-tab[data-pdf].active');
    const pdfType = activeTab ? activeTab.getAttribute('data-pdf') : 'basic';

    // Cycle through PDFs
    const pdfTypes = ['basic', 'advanced', 'extra'];
    const currentIndex = pdfTypes.indexOf(pdfType);
    const nextIndex = (currentIndex + 1) % pdfTypes.length;

    switchPDFTab(pdfTypes[nextIndex]);
    showNotification(`Switched to ${pdfTypes[nextIndex]} PDF`);
}

function openPDF(type) {
    const urls = {
        basic: 'https://drive.google.com/file/d/1KiM-siIliBZXq_EORIz3ET6EzaWYyfUC/view',
        advanced: 'https://drive.google.com/file/d/1Pl2_7sNlqPdkFHt-mni9zRrMXgA6ES2B/view',
        extra: 'https://drive.google.com/drive/folders/1ABC123'
    };

    if (urls[type]) {
        window.open(urls[type], '_blank');
    }
}

function downloadPDF(type) {
    const urls = {
        basic: 'https://drive.google.com/uc?export=download&id=1KiM-siIliBZXq_EORIz3ET6EzaWYyfUC',
        advanced: 'https://drive.google.com/uc?export=download&id=1Pl2_7sNlqPdkFHt-mni9zRrMXgA6ES2B'
    };

    if (urls[type]) {
        window.open(urls[type], '_blank');
    }
}

function switchSimulation() {
    const activeTab = document.querySelector('.resource-tab[data-sim].active');
    const simType = activeTab ? activeTab.getAttribute('data-sim') : 'motion';

    // Cycle through simulations
    const simTypes = ['motion', 'data', 'more'];
    const currentIndex = simTypes.indexOf(simType);
    const nextIndex = (currentIndex + 1) % simTypes.length;

    switchSimulationTab(simTypes[nextIndex]);
    showNotification(`Switched to ${simTypes[nextIndex]} simulation`);
}

function openSimulation(type) {
    const urls = {
        motion: 'https://phet.colorado.edu/sims/html/projectile-motion/latest/projectile-motion_all.html',
        data: 'https://phet.colorado.edu/sims/html/projectile-data-lab/latest/projectile-data-lab_all.html',
        more: 'https://phet.colorado.edu/en/simulations/filter?subjects=physics&type=html'
    };

    if (urls[type]) {
        window.open(urls[type], '_blank');
    }
}

function openExtraResources() {
    window.open('https://drive.google.com/drive/folders/1ABC123', '_blank');
}

function openMoreSimulations() {
    window.open('https://phet.colorado.edu/en/simulations/filter?subjects=physics&type=html', '_blank');
}

// ============================================
// WINDOW RESIZE HANDLER
// ============================================

let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(() => {
        if (autoArrangeEnabled) {
            autoArrangeAll();
        }
    }, 250);
});

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', function(e) {
    // Ctrl + A: Auto-arrange all
    if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        autoArrangeAll();
    }

    // Ctrl + G: Toggle grid
    if (e.ctrlKey && e.key === 'g') {
        e.preventDefault();
        showGrid();
    }

    // Ctrl + S: Toggle snap
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        toggleSnapToGrid();
    }

    // Ctrl + R: Reset to default
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        resetToDefault();
    }

    // Escape: Cancel drag/resize
    if (e.key === 'Escape') {
        if (isDragging) {
            stopDrag();
        }
        if (isResizing) {
            stopResize();
        }
    }
});

console.log('Projectile Motion - Auto-Arranging Cards System Loaded Successfully');