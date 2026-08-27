// ─── GLOBALS ───
let storeData = {};
let keyPair = null;
let activeIcon = 'bi-cup-hot-fill';
let activeType = 'cafe';

// ─── SANITIZE ───
function sanitize(input) {
    return input.replace(/[^a-zA-Z0-9\s\-'\.&\/\(\)!?_+=:,%$#€£@*¥¢₩~°₹₽\p{L}\p{N}]/gu, '').substring(0, 40);
}
// ─── UUID ───
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// ─── VALIDATE LOCATION ───
function isValidLocation(loc) {
    if (!loc) return true;
    const parts = loc.split(',');
    if (parts.length !== 2) return false;
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    if (isNaN(lat) || isNaN(lng)) return false;
    if (lat < -90 || lat > 90) return false;
    if (lng < -180 || lng > 180) return false;
    return true;
}

// ─── UPDATE PREVIEW ───
function updatePreview() {
    const rawName = document.getElementById('displayName').value || document.getElementById('storeName').value || "Store Name";
    document.getElementById('previewPassName').textContent = rawName.substring(0, 20);
    const stampsDiv = document.getElementById('previewStamps');
    stampsDiv.innerHTML = '';

    for (let row = 0; row < 2; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'stamp-row';
        for (let col = 0; col < 4; col++) {
            const idx = row * 4 + col;
            const circle = document.createElement('div');
            circle.className = idx < 3 ? 'stamp-filled' : 'stamp-empty';
            circle.innerHTML = `<i class="bi ${activeIcon}"></i>`;
            rowDiv.appendChild(circle);
        }
        stampsDiv.appendChild(rowDiv);
    }
    document.getElementById('previewReward').textContent = document.getElementById('rewardDesc').value || 'Reward description';
}

// ─── NAVIGATION ───
// ─── NAVIGATION ───
function show(stepNum) {
    // Look up the elements *inside* the function, so they exist when this runs
    const s1 = document.getElementById('screen1');
    const s2 = document.getElementById('screen2');
    const s3 = document.getElementById('screen3');
    const sReview = document.getElementById('screenReview');
    const formContainer = document.getElementById('formContainer');

    [s1, s2, s3, sReview].forEach(el => el.classList.remove('active'));

    if (stepNum === 'review') {
        sReview.classList.add('active');
        formContainer.style.display = 'block';
        // Populate review fields
        document.getElementById('reviewStoreName').textContent = document.getElementById('storeName').value || 'Not set';
        document.getElementById('reviewDisplayName').textContent = document.getElementById('displayName').value || document.getElementById('storeName').value || 'Not set';
        document.getElementById('reviewReward').textContent = document.getElementById('rewardDesc').value || 'Not set';
        const activeSec = document.querySelector('.segmented-option.active');
        document.getElementById('reviewSecurity').textContent = activeSec ? activeSec.textContent : 'Not set';
        document.getElementById('reviewExpiry').textContent = document.getElementById('expiryDate').value || 'None set';
        document.getElementById('reviewLocation').textContent = document.getElementById('location').value || 'None set';
        // Update header
        document.getElementById('dynamicHeaderLeft').innerHTML = `<div class="back-btn mb-0 mt-1" onclick="show(2)" style="font-size: 1rem;"><i class="bi bi-arrow-left me-1"></i> Back</div>`;
        window.scrollTo(0, 0);
        // Update dots
        document.querySelectorAll('.step-dot').forEach(dot => {
            dot.classList.toggle('active', parseInt(dot.dataset.step) <= 2);
        });
        document.getElementById('line1').classList.add('active');
        document.getElementById('line2').classList.add('active');
        return;
    }

    document.getElementById('screen' + stepNum).classList.add('active');

    if (stepNum === 3) {
        formContainer.style.display = 'none';
    } else {
        formContainer.style.display = 'block';
    }

    const headerLeft = document.getElementById('dynamicHeaderLeft');
    if (stepNum === 1) {
        headerLeft.innerHTML = ``;
    } else if (stepNum === 2) {
        headerLeft.innerHTML = `<div class="back-btn mb-0 mt-1" onclick="show(1)" style="font-size: 1rem;"><i class="bi bi-arrow-left me-1"></i> Back</div>`;
    } else if (stepNum === 3) {
        headerLeft.innerHTML = `<div class="back-btn mb-0 mt-1" onclick="show(2)" style="font-size: 1rem; padding-left: 0;"><i class="bi bi-arrow-left me-1"></i> Back</div>`;
    }

    window.scrollTo(0, 0);

    document.querySelectorAll('.step-dot').forEach(dot => {
        dot.classList.toggle('active', parseInt(dot.dataset.step) <= stepNum);
    });
    document.getElementById('line1').classList.toggle('active', stepNum >= 2);
    document.getElementById('line2').classList.toggle('active', stepNum >= 3);
}

// ─── QR GENERATION ───
function generateQR() {
    const container = document.getElementById('combinedQr');
    container.innerHTML = '';
    const mode = document.querySelector('.segmented-option.active').dataset.mode;

    const payload = {
        sid: storeData.sid,
        sn: storeData.sn,
        pk: storeData.pk,
        ct: storeData.ct,
        m: mode,
        tz: storeData.tz || 'UTC'
    };

    if (storeData.loc) {
        payload.loc = storeData.loc;
    }

    if (mode === 'simple' || mode === 'secure') {
        payload.d = new Date().toISOString().split('T')[0];
    }
    if (mode === 'secure') {
        const sk = nacl.util.decodeBase64(localStorage.getItem('storePrivateKey'));
        payload.sig = nacl.util.encodeBase64(nacl.sign.detached(nacl.util.decodeUTF8(storeData.sid + payload.d), sk));
    }

    const payloadStr = JSON.stringify(payload);
    const encodedPayload = encodeURIComponent(payloadStr);
    const qrUrl = `https://vouchrdigital.pocketenginestudio.com/get.html?payload=${encodedPayload}`;

    new QRCode(container, {
        text: qrUrl,
        width: 340,
        height: 340,
        colorDark: "#1D1D1F",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

// ─── CREATE STORE ───
async function createStore(skip) {
    const sn = document.getElementById('storeName').value;
    if (!sn) {
        alert(translations['alert_store_name_required'] || 'Please enter a Store Name first.');
        return false;
    }

    keyPair = nacl.sign.keyPair();
    const hhs = document.getElementById('bonusStart').value;
    const hhe = document.getElementById('bonusEnd').value;
    const remindInput = document.getElementById('remindDays').value;

    storeData = {
        sid: uuidv4(),
        sn: skip ? sn : (document.getElementById('displayName').value || sn),
        loc: document.getElementById('location').value || null,
        pk: nacl.util.encodeBase64(keyPair.publicKey),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        ct: {
            dn: skip ? sn : (document.getElementById('displayName').value || sn),
            rd: skip ? 'Reward' : document.getElementById('rewardDesc').value,
            ot: skip ? null : (document.getElementById('openingTime').value || null),
            exp: skip ? null : (document.getElementById('expiryDate').value || null),
            bh: skip ? null : (hhs && hhe ? [hhs, hhe] : null),
            rad: skip ? null : (remindInput ? Math.min(parseInt(remindInput), 365).toString() : null),
            t: activeType
        }
    };

    if (storeData.loc && !isValidLocation(storeData.loc)) {
        alert(translations['alert_gps_invalid'] || 'Please enter a valid GPS location (e.g., 37.7749,-122.4194) or leave it empty.');
        return false;
    }

    localStorage.setItem('storePrivateKey', nacl.util.encodeBase64(keyPair.secretKey));
        localStorage.setItem('storeData', JSON.stringify(storeData));
        const saveStatus = document.getElementById('saveStatus');
        if (saveStatus) {
            saveStatus.style.display = 'inline-block';
        } else {
            console.warn('saveStatus element not found – skipping display.');
        }
        return true;
        }

// ─── CHECK STORAGE RELIABILITY ───
function checkStorageReliability() {
    try {
        const testKey = '__vouchr_test__';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
        return true;
    } catch (e) {
        return false;
    }
}

// ─── INIT ─── (called after partials are loaded)
function initApp() {
    // ── 1. Restore saved data ──
    if (localStorage.getItem('storeData')) {
        storeData = JSON.parse(localStorage.getItem('storeData'));
        document.getElementById('saveStatus').style.display = 'inline-block';

        document.getElementById('storeName').value = storeData.sn;
        document.getElementById('displayName').value = storeData.ct.dn || storeData.sn;
        document.getElementById('location').value = storeData.loc || '';
        document.getElementById('rewardDesc').value = storeData.ct.rd || '';
        document.getElementById('openingTime').value = storeData.ct.ot || '';
        document.getElementById('expiryDate').value = storeData.ct.exp || '';
        if (storeData.ct.bh) {
            document.getElementById('bonusStart').value = storeData.ct.bh[0] || '';
            document.getElementById('bonusEnd').value = storeData.ct.bh[1] || '';
        }
        document.getElementById('remindDays').value = storeData.ct.rad || '';

        updatePreview();
        generateQR();
        show(3);
    }

    // ── 2. Storage reliability warning ──
    if (!checkStorageReliability()) {
        const statusEl = document.getElementById('backupStatus');
        if (statusEl) {
            statusEl.innerHTML = `⚠️ <strong>Storage Restricted:</strong> Private mode detected. Download a backup to preserve store data.`;
            statusEl.style.color = '#FF9500';
        }
    }

    // ── 3. Event Listeners ──

    // Store Name (with QR regen!)
    document.getElementById('storeName').addEventListener('input', function() {
        this.value = sanitize(this.value);
        updatePreview();
        if (document.getElementById('screen3').classList.contains('active')) generateQR();
    });

    // Display Name
    document.getElementById('displayName').addEventListener('input', function() {
        this.value = sanitize(this.value);
        updatePreview();
        if (document.getElementById('screen3').classList.contains('active')) generateQR();
    });

    // Reward Description
    document.getElementById('rewardDesc').addEventListener('input', function() {
        this.value = sanitize(this.value);
        updatePreview();
        if (document.getElementById('screen3').classList.contains('active')) generateQR();
    });

    // GPS Location (validation + QR regen)
    document.getElementById('location').addEventListener('input', function() {
        const val = this.value;
        const warning = document.getElementById('locationWarning');
        if (val && !isValidLocation(val)) {
            warning.style.display = 'block';
        } else {
            warning.style.display = 'none';
        }
        if (document.getElementById('screen3').classList.contains('active')) generateQR();
    });

    // Other fields (QR regen)
    document.getElementById('openingTime').addEventListener('input', function() {
        if (document.getElementById('screen3').classList.contains('active')) generateQR();
    });
    document.getElementById('expiryDate').addEventListener('input', function() {
        if (document.getElementById('screen3').classList.contains('active')) generateQR();
    });
    document.getElementById('bonusStart').addEventListener('input', function() {
        checkHappyHour();
        if (document.getElementById('screen3').classList.contains('active')) generateQR();
    });
    document.getElementById('bonusEnd').addEventListener('input', function() {
        checkHappyHour();
        if (document.getElementById('screen3').classList.contains('active')) generateQR();
    });
    document.getElementById('remindDays').addEventListener('input', function() {
        if (document.getElementById('screen3').classList.contains('active')) generateQR();
    });

    // Happy Hour warning check
    function checkHappyHour() {
        const start = document.getElementById('bonusStart').value;
        const end = document.getElementById('bonusEnd').value;
        const warning = document.getElementById('happyHourWarning');
        if ((start && !end) || (!start && end)) {
            warning.style.display = 'block';
        } else {
            warning.style.display = 'none';
        }
    }
    // Ensure it runs on page load if data is pre-filled
    checkHappyHour();

    // Business Type Pills (with QR regen!)
    document.querySelectorAll('.biz-pill').forEach(pill => {
        pill.addEventListener('click', function() {
            document.querySelectorAll('.biz-pill').forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            activeIcon = this.dataset.icon;
            activeType = this.dataset.type;
            document.getElementById('rewardDesc').value = this.dataset.reward;
            updatePreview();
            if (document.getElementById('screen3').classList.contains('active')) generateQR();
        });
    });

    // GPS Auto-locate
    document.getElementById('btnGetLoc').addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    document.getElementById('location').value =
                        `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
                        document.getElementById('location').dispatchEvent(new Event('input'));
                },
                (err) => {
                    let msg = 'Unable to retrieve location. ';
                    switch (err.code) {
                        case err.PERMISSION_DENIED:
                            msg += 'Please enable location permissions in your browser settings.';
                            break;
                        case err.POSITION_UNAVAILABLE:
                            msg += 'GPS signal unavailable. Try moving to an open area.';
                            break;
                        case err.TIMEOUT:
                            msg += 'Location request timed out. Try again.';
                            break;
                        default:
                            msg += 'Unknown error.';
                    }
                    alert(msg);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    });

    // ── 4. Buttons ──

    // Skip / Customize
    document.getElementById('btnSkip').addEventListener('click', async () => {
        if (await createStore(true)) { generateQR(); show(3); }
    });
    document.getElementById('btnCustomize').addEventListener('click', () => { show(2); });

    // Create Shop -> goes to Review
    document.getElementById('btnCreateShop').addEventListener('click', async () => {
        if (await createStore(false)) {
            show('review');
        }
    });

    // Confirm Review -> Generate QR
    document.getElementById('btnConfirmReview').addEventListener('click', function() {
        generateQR();
        show(3);
    });

    // Security Segmented Control
    const fallbackDescriptions = {
        'basic': 'Static QR – Low security. Your QR code never changes, so you print it once and use it forever. No date, location, or signature checks. Best for low-traffic areas where fraud is not a concern.',
        'simple': 'Daily Rotating – Medium security. QR codes expire daily and require customers to be physically near your store to stamp. Prevents old QR reuse and screenshot sharing. Requires refreshing the QR code daily (refresh the page or print fresh). Recommended for most stores.',
        'secure': 'Location-Verified – High security. All the protection of Daily Rotating, plus cryptographic signing that prevents QR tampering and forgery. The app cryptographically verifies every scan against your store\'s private key. Requires refreshing the QR code daily (refresh the page or print fresh). Perfect for busy, high-value stores where fraud prevention is critical.'
    };

    document.querySelectorAll('.segmented-option').forEach(opt => {
        opt.addEventListener('click', function() {
            document.querySelectorAll('.segmented-option').forEach(o => o.classList.remove('active'));
            this.classList.add('active');
            const mode = this.dataset.mode;
            const key = 'sec_desc_' + mode;
            const translatedText = window.translations?.[key] || fallbackDescriptions[mode];
            document.getElementById('securityDesc').textContent = translatedText;
            generateQR();
        });
    });

    // Print Single
    document.getElementById('btnPrintCombined').addEventListener('click', () => {
        const c = document.querySelector('#combinedQr canvas');
        if (c) {
            const w = window.open('', '_blank');
            w.document.write(`<div style="text-align:center;padding:40px;font-family:-apple-system, sans-serif;">
                <h1 style="font-size:3.5rem; margin-bottom: 10px; font-weight: 800; letter-spacing: -1px;">${storeData.sn}</h1>
                <p style="font-size:1.5rem; color: #86868B; margin-bottom: 50px; font-weight: 500;">Scan to collect your loyalty stamp</p>
                <img src="${c.toDataURL()}" style="width:400px; height:400px; border-radius:20px;">
            </div>`);
            w.document.close();
            setTimeout(() => w.print(), 200);
        }
    });

    // Print Weekly
    document.getElementById('btnPrintWeekly').addEventListener('click', () => {
        const mode = document.querySelector('.segmented-option.active').dataset.mode;
        const w = window.open('', '_blank');
        let html = `<div style="text-align:center;font-family:-apple-system, sans-serif;">`;

        const hiddenDiv = document.createElement('div');
        const daysToPrint = mode === 'basic' ? 1 : 7;

        for (let i = 0; i < daysToPrint; i++) {
            let targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + i);
            let dateStr = targetDate.toISOString().split('T')[0];
            let displayDate = targetDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

            const payload = { sid: storeData.sid, sn: storeData.sn, pk: storeData.pk, ct: storeData.ct, m: mode, tz: storeData.tz || 'UTC' };
            if (mode === 'simple' || mode === 'secure') { payload.d = dateStr; }
            if (mode === 'secure') {
                const sk = nacl.util.decodeBase64(localStorage.getItem('storePrivateKey'));
                payload.sig = nacl.util.encodeBase64(nacl.sign.detached(nacl.util.decodeUTF8(storeData.sid + payload.d), sk));
            }

            hiddenDiv.innerHTML = '';
            new QRCode(hiddenDiv, {
                text: `https://vouchrdigital.pocketenginestudio.com/get.html?payload=${encodeURIComponent(JSON.stringify(payload))}`,
                width: 400,
                height: 400,
                colorDark: "#1D1D1F",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });

            let canvas = hiddenDiv.querySelector('canvas');

            html += `
            <div style="page-break-after: always; padding: 40px;">
                <h1 style="font-size:3.5rem; margin-bottom: 5px; font-weight: 800; letter-spacing: -1px;">${storeData.sn}</h1>
                <h2 style="font-size:2rem; color: #007AFF; margin-bottom: 10px; font-weight: 700;">${mode === 'basic' ? 'Standard Pass' : displayDate}</h2>
                <p style="font-size:1.5rem; color: #86868B; margin-bottom: 50px; font-weight: 500;">Scan to collect your loyalty stamp</p>
                <img src="${canvas.toDataURL()}" style="width:400px; height:400px; border-radius:20px;">
            </div>`;
        }
        html += `</div>`;
        w.document.write(html);
        w.document.close();
        setTimeout(() => w.print(), 500);
    });

    // Backup
    document.getElementById('btnBackup').addEventListener('click', function() {
        const privateKey = localStorage.getItem('storePrivateKey');
        const storeDataRaw = localStorage.getItem('storeData');
        if (!storeDataRaw) {
            document.getElementById('backupStatus').textContent = translations['status_backup_fail'] || 'No data to backup.';
            document.getElementById('backupStatus').style.color = '#FF3B30';
        return;
        }
        const backupData = { storeData: JSON.parse(storeDataRaw), privateKey: privateKey, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vouchr_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        document.getElementById('backupStatus').textContent = translations['status_backup_success'] || 'Backup downloaded successfully!';
        document.getElementById('backupStatus').style.color = '#34C759';
    });

    // Restore
    document.getElementById('btnRestore').addEventListener('click', () => document.getElementById('restoreInput').click());

    document.getElementById('restoreInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const backupData = JSON.parse(event.target.result);
                if (!backupData.storeData || !backupData.privateKey) throw new Error('Invalid backup file.');
                localStorage.setItem('storeData', JSON.stringify(backupData.storeData));
                localStorage.setItem('storePrivateKey', backupData.privateKey);
                document.getElementById('backupStatus').textContent = translations['status_restore_success'] || 'Restore successful! Reloading...';
                document.getElementById('backupStatus').style.color = '#34C759';
                setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
                document.getElementById('backupStatus').textContent = translations['status_restore_fail'] || 'Restore failed.';
                document.getElementById('backupStatus').style.color = '#FF3B30';
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    // Reset / Start New Store
    document.getElementById('btnResetStore').addEventListener('click', function() {
        if (confirm(translations['msg_reset_confirm'] || 'Are you sure? This will permanently delete your current store configuration from this browser.')) {
            localStorage.removeItem('storeData');
            localStorage.removeItem('storePrivateKey');
            location.reload();
        }
    });

    // ── 5. Install Banner ──
    (function() {
        const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const bannerDismissed = localStorage.getItem('vouchr-install-dismissed') === 'true';

        if (!isStandalone && isSafari && !bannerDismissed) {
            setTimeout(() => { document.getElementById('installBanner').classList.add('visible'); }, 1500);
        }

        window.dismissInstallBanner = function() {
            document.getElementById('installBanner').classList.remove('visible');
            localStorage.setItem('vouchr-install-dismissed', 'true');
        };

        document.getElementById('installAppBtn').addEventListener('click', function() {
            alert(translations['install_alert_message'] ||
                '📱 How to install Vouchr on your Home Screen:\n\n' +
                '1. Tap the Share icon (square with arrow) at the bottom of Safari\n' +
                '2. Scroll down and tap "Add to Home Screen"\n' +
                '3. Tap "Add" in the top right corner\n\n' +
                'This will keep your store data safe and make Vouchr feel like a native app!'
            );
            dismissInstallBanner();
        });
    })();

    // ── 6. Final: if data was loaded, we already showed(3) above.
    //    If no data, ensure step dots are correct for step 1.
    if (!localStorage.getItem('storeData')) {
        // Ensure step 1 is active visually
        document.querySelectorAll('.step-dot').forEach(dot => {
            dot.classList.toggle('active', parseInt(dot.dataset.step) === 1);
        });
        document.getElementById('line1').classList.remove('active');
        document.getElementById('line2').classList.remove('active');
    }
}
