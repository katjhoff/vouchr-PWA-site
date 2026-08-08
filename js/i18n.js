// js/i18n.js
(function() {
    const supportedLocales = ['en', 'es', 'fr', 'de', 'ja', 'ko', 'pt', 'da', 'sv'];
    let currentLocale = 'en';
    let translations = {};
    window.translations = translations; // <-- EXPOSE GLOBALLY

    // 1. Detect browser language or load from localStorage
    function detectLocale() {
        const stored = localStorage.getItem('vouchr-locale');
        if (stored && supportedLocales.includes(stored)) {
            return stored;
        }
        const browserLang = navigator.language.split('-')[0];
        return supportedLocales.includes(browserLang) ? browserLang : 'en';
    }

    // 2. Fetch the translation JSON
    async function loadLocale(locale) {
        try {
            const response = await fetch(`locales/${locale}.json`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            translations = await response.json();
            window.translations = translations; // <-- UPDATE GLOBAL COPY
            currentLocale = locale;
            localStorage.setItem('vouchr-locale', locale);
            translatePage();
            updateSwitcherUI(locale);
        } catch (error) {
            console.warn(`Failed to load locale ${locale}, falling back to en.`, error);
            if (locale !== 'en') {
                loadLocale('en');
            } else {
                // Emergency fallback if en.json fails (should not happen)
                translations = {};
                window.translations = translations;
                translatePage();
            }
        }
    }

    // 3. Translate the entire page
    function translatePage() {
        // Translate elements with data-i18n attribute (innerHTML replacement)
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[key] !== undefined) {
                el.innerHTML = translations[key];
            }
        });

        // Translate placeholders (data-i18n-placeholder)
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (translations[key] !== undefined) {
                el.placeholder = translations[key];
            }
        });

        // Translate title tags (data-i18n-title)
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (translations[key] !== undefined) {
                el.title = translations[key];
            }
        });

        // Translate the page <title>
        if (translations['page_title']) {
            document.title = translations['page_title'];
        }
    }

    // 4. Update the language switcher dropdown/buttons
    function updateSwitcherUI(locale) {
        document.querySelectorAll('.lang-switcher-select').forEach(select => {
            select.value = locale;
        });
        document.querySelectorAll('.lang-flag-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === locale);
        });
    }

    // 5. Expose function for the language switcher to call
    window.changeLanguage = function(locale) {
        if (supportedLocales.includes(locale) && locale !== currentLocale) {
            loadLocale(locale);
        }
    };

    // 6. Auto-initialize
    const initialLocale = detectLocale();
    loadLocale(initialLocale);
})();
