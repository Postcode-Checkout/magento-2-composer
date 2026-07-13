(function () {
    'use strict';
    function boot() {
        if (window.PCM2 && typeof window.PCM2.init === 'function') {
            window.PCM2.init(document);
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
    window.addEventListener('load', boot);
    window.addEventListener('postcodecheckout:hyva-ready', boot);
    window.addEventListener('postcodecheckout:hyva-checkout:ready', boot);
    document.addEventListener('hyva.checkout.api-v1.after', boot);
    document.addEventListener('magewire:load', boot);
    document.addEventListener('magewire:update', boot);
    document.addEventListener('address-form-modal-show', function () {
        if (!window.hyva || !window.hyva.modal || !window.hyva.modal.eventListeners) return;
        var original = window.hyva.modal.eventListeners.click;
        if (!original || original.pcm2Wrapped) return;
        document.removeEventListener('click', original);
        var wrapped = function (event) {
            if (!String(event.target.className || '').match(/\bpostcodenl-autocomplete-item\b/)) original(event);
        };
        wrapped.pcm2Wrapped = true;
        window.hyva.modal.eventListeners.click = wrapped;
        document.addEventListener('click', wrapped);
    });
}());
