/**
 * HA-BPMN-Manager: BPMN Grandmaster Certificate Generator
 *
 * Generates an official, printable vector certificate of completion
 * with customizable corporate identity, signatures, seals, and themes.
 *
 * @package HA_BPMN_Manager
 */

import { getHonorGrade, getCertificateStrings } from './quest-i18n.js';
import { escapeHtml, sanitizeHexColor, sanitizeMediaUrl } from '../escape-html.js';
export { getHonorGrade };

/**
 * Renders an ultra-crisp, modern luxury seal / medallion with 100% contrast,
 * text curved along circular arcs, vector insignia, minted rims, and hanging ribbon tails.
 */
function renderModernSeal({ x, y, isDual, sealImg, activeGradId, activeBorderColor, honor, certStrings }) {
  const prefix = isDual ? 'dual' : 'single';
  const rOuter = isDual ? 44 : 46;
  const rInner = isDual ? 27 : 28;
  const rTextTop = rOuter - 6.5;
  const rTextBot = rOuter - 6.5;

  let centerIcon = '';
  if (honor.tier === 5) {
    // Precision faceted vector diamond
    centerIcon = `
      <g transform="translate(0, -6) scale(0.85)">
        <polygon points="0,-14 9,-7 6,4 -6,4 -9,-7" fill="url(#${activeGradId})" stroke="${activeBorderColor}" stroke-width="0.8" />
        <polygon points="0,-14 4,-7 0,4 -4,-7" fill="#ffffff" fill-opacity="0.45" />
        <polygon points="0,-14 -9,-7 -4,-7" fill="#ffffff" fill-opacity="0.25" />
        <polygon points="0,-14 9,-7 4,-7" fill="#000000" fill-opacity="0.18" />
      </g>
    `;
  } else if (honor.tier >= 3) {
    // Imperial crown with jewels
    centerIcon = `
      <g transform="translate(0, -7) scale(0.8)">
        <path d="M -12,4 L -15,-6 L -7,-2 L 0,-10 L 7,-2 L 15,-6 L 12,4 Z" fill="url(#${activeGradId})" stroke="${activeBorderColor}" stroke-width="0.8" />
        <circle cx="-15" cy="-6" r="1.5" fill="#ffffff" />
        <circle cx="0" cy="-10" r="1.8" fill="#ffffff" />
        <circle cx="15" cy="-6" r="1.5" fill="#ffffff" />
        <rect x="-11" y="4" width="22" height="3" rx="1" fill="${activeBorderColor}" />
      </g>
    `;
  } else {
    // BPMN Gateway diamond with checkmark
    centerIcon = `
      <g transform="translate(0, -7) scale(0.85)">
        <polygon points="0,-12 12,0 0,12 -12,0" fill="url(#${activeGradId})" stroke="${activeBorderColor}" stroke-width="0.8" />
        <path d="M -4,-1 L -1,3 L 5,-4" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </g>
    `;
  }

  const safeSealImg = sanitizeMediaUrl(sealImg);
  if (safeSealImg) {
    return `
      <g transform="translate(${x}, ${y})">
        <!-- Ribbon Tails -->
        <g filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))">
          <path d="M -16,22 L -24,60 L -13,52 L -2,60 L -6,22 Z" fill="url(#${activeGradId})" stroke="${activeBorderColor}" stroke-width="0.8" />
          <path d="M 6,22 L 2,60 L 13,52 L 24,60 L 16,22 Z" fill="url(#${activeGradId})" stroke="${activeBorderColor}" stroke-width="0.8" />
          <path d="M -6,22 L -2,32 L 6,22 Z" fill="#000000" fill-opacity="0.25" />
        </g>
        <circle cx="0" cy="0" r="${rOuter}" fill="#ffffff" stroke="${activeBorderColor}" stroke-width="2.5" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.2))" />
        <image href="${escapeHtml(safeSealImg)}" x="-${rOuter - 4}" y="-${rOuter - 4}" width="${(rOuter - 4) * 2}" height="${(rOuter - 4) * 2}" clip-path="url(#certSealClip)" preserveAspectRatio="xMidYMid meet" />
      </g>
    `;
  }

  return `
    <g transform="translate(${x}, ${y})">
      <!-- Defs for text paths -->
      <defs>
        <path id="${prefix}SealTopArc" d="M -${rTextTop},0 A ${rTextTop},${rTextTop} 0 1,1 ${rTextTop},0" />
        <path id="${prefix}SealBottomArc" d="M -${rTextBot},0 A ${rTextBot},${rTextBot} 0 0,0 ${rTextBot},0" />
      </defs>

      <!-- Ribbon Tails -->
      <g filter="drop-shadow(0 2px 4px rgba(0,0,0,0.18))">
        <path d="M -16,22 L -24,60 L -13,52 L -2,60 L -6,22 Z" fill="url(#${activeGradId})" stroke="${activeBorderColor}" stroke-width="0.8" />
        <path d="M 6,22 L 2,60 L 13,52 L 24,60 L 16,22 Z" fill="url(#${activeGradId})" stroke="${activeBorderColor}" stroke-width="0.8" />
        <path d="M -6,22 L -2,32 L 6,22 Z" fill="#000000" fill-opacity="0.28" />
      </g>

      <!-- Outer Minted Medallion Rim -->
      <circle cx="0" cy="0" r="${rOuter}" fill="url(#${activeGradId})" stroke="${activeBorderColor}" stroke-width="1.2" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.22))" />
      <circle cx="0" cy="0" r="${rOuter - 1.5}" fill="none" stroke="#ffffff" stroke-opacity="0.4" stroke-width="1" />

      <!-- Circular Top Text (Arc) -->
      <text font-family="'Segoe UI', 'Montserrat', sans-serif" font-size="5.8" font-weight="700" letter-spacing="1.2" fill="#ffffff" text-anchor="middle">
        <textPath href="#${prefix}SealTopArc" startOffset="50%">★ ISO 19510 • BPMN 2.0 ★</textPath>
      </text>

      <!-- Circular Bottom Text (Arc) -->
      <text font-family="'Segoe UI', 'Montserrat', sans-serif" font-size="5.6" font-weight="700" letter-spacing="1.1" fill="#ffffff" text-anchor="middle">
        <textPath href="#${prefix}SealBottomArc" startOffset="50%">${escapeHtml(honor.latin)}</textPath>
      </text>

      <!-- Inner Crisp White Medallion Disc -->
      <circle cx="0" cy="0" r="${rInner}" fill="#ffffff" stroke="url(#${activeGradId})" stroke-width="1.8" />
      <circle cx="0" cy="0" r="${rInner - 2}" fill="none" stroke="${activeBorderColor}" stroke-opacity="0.25" stroke-width="0.6" stroke-dasharray="2,1.5" />

      <!-- Center Icon -->
      ${centerIcon}

      <!-- Center Typography: High contrast dark text on crisp white -->
      <text x="0" y="8" text-anchor="middle" font-size="8" font-family="'Segoe UI', sans-serif" font-weight="800" fill="#0f172a" letter-spacing="1">BPMN 2.0</text>
      <text x="0" y="16" text-anchor="middle" font-size="4.8" font-family="'Segoe UI', sans-serif" font-weight="700" fill="#64748b" letter-spacing="0.8">${escapeHtml(certStrings ? certStrings.officialSeal : 'OFFICIAL SEAL')}</text>
    </g>
  `;
}

export function showCertificateModal(options = {}) {
  const existingModal = document.getElementById('ha-bpmn-certificate-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const lang = options.lang || 'de';
  const isDe = lang === 'de';
  const certStrings = getCertificateStrings(lang);
  const xp = options.xp || 0;
  const userName = options.userName || certStrings.userNameDefault || (isDe ? 'Prozess-Architekt' : 'Process Architect');
  const completedChaptersCount = options.completedChaptersCount !== undefined ? options.completedChaptersCount : 6;
  const totalChaptersCount = options.totalChaptersCount || 6;
  const completedChallenges = options.completedChallenges || [];
  const totalChallengesCount = options.totalChallengesCount || 8;

  // Retrieve corporate/guild settings passed from WordPress backend
  const certConfig = options.certificate || options.certConfig || (window.bpmnSettings && window.bpmnSettings.certificate) || (window.haBpmnSettings && window.haBpmnSettings.certificate) || {};

  const honor = getHonorGrade(xp, lang);

  // Dynamic certificate colors and theme
  const theme = certConfig.colorTheme || certConfig.theme || 'honor_adaptive';
  let activeGradId = honor.sealGradId;
  let activeBorderColor = honor.sealBorder;

  if (theme === 'classic_gold') {
    activeGradId = 'goldGrad';
    activeBorderColor = '#b38728';
  } else if (theme === 'corporate_navy') {
    activeGradId = 'corporateNavyGrad';
    activeBorderColor = '#1d4ed8';
  } else if (theme === 'emerald_green' || theme === 'emerald') {
    activeGradId = 'emeraldGrad';
    activeBorderColor = '#059669';
  } else if (theme === 'ruby') {
    activeGradId = 'rubyGrad';
    activeBorderColor = '#ef4444';
  } else if (theme === 'custom' && (certConfig.customColor || certConfig.accentColor)) {
    activeGradId = 'customUserGrad';
    activeBorderColor = sanitizeHexColor(certConfig.customColor || certConfig.accentColor, '#bf953f');
  }

  // Header and title options
  const headerTitle = certConfig.headerTitle || certStrings.headerTitle || (isDe
    ? 'GILDE DER PROZESSMEISTER • QM & ISO-19510 GOVERNANCE'
    : 'GUILD OF PROCESS MASTERS • QM & ISO-19510 GOVERNANCE');

  const titleMode = certConfig.titleMode || 'dynamic';
  let certTitle = certConfig.certTitle || certStrings.certTitle || (isDe ? 'GROSSMEISTER-URKUNDE' : 'GRANDMASTER DIPLOMA');
  if (titleMode === 'custom' && certConfig.customTitle) {
    certTitle = certConfig.customTitle;
  } else if (titleMode === 'dynamic') {
    certTitle = honor.guildTitle.toUpperCase();
  }

  const certSubtitle = certConfig.customSubtitle || certStrings.certSubtitle || (isDe
    ? `Offizielles Zeugnis der Gilde • Verliehen mit dem Prädikat: ${honor.latin}`
    : `Official Guild Credential • Conferred with Distinction: ${honor.latin}`);

  const introText = certConfig.introText || certStrings.introText || (isDe
    ? 'Hiermit wird feierlich verliehen an:'
    : 'This diploma is proudly conferred upon:');

  // Descriptions: Custom dedication or dynamic summary
  let descLine1 = '';
  let descLine2 = '';
  if (certConfig.customDedication) {
    descLine1 = certConfig.customDedication;
  } else {
    descLine1 = honor.summaryDedication;
    descLine2 = isDe
      ? `Erfolgreich absolviert: ${completedChaptersCount} von ${totalChaptersCount} Haupt-Kapiteln` +
        (completedChallenges.length > 0 ? ` und ${completedChallenges.length} von ${totalChallengesCount} Linter-Rätseln gelöst (${xp} XP gesamt).` : '.')
      : `Successfully completed: ${completedChaptersCount} of ${totalChaptersCount} core chapters` +
        (completedChallenges.length > 0 ? ` and solved ${completedChallenges.length} of ${totalChallengesCount} linter puzzles (${xp} XP total).` : '.');
  }

  const showBadges = certConfig.showBadges !== undefined ? !!certConfig.showBadges : true;

  // Signatures configuration
  const sigMode = certConfig.signatureMode || 'single';
  const isDualSignature = sigMode === 'dual';

  const signer1Name = certConfig.signerName || '';
  const signer1Title = certConfig.signerTitle || certStrings.signer1Title || (isDe ? 'Der Gildenmeister' : 'The Guild Master');
  const sig1Img = sanitizeMediaUrl(certConfig.signatureImage || '');

  const signer2Name = certConfig.signerName2 || '';
  const signer2Title = certConfig.signerTitle2 || certStrings.signer2Title || (isDe ? 'BPMN-Trainer & Prüfer' : 'BPMN Trainer & Examiner');
  const sig2Img = sanitizeMediaUrl(certConfig.signatureImage2 || '');

  const authorityText = certConfig.authorityText || 'HA-BPMN Guild Governance';

  // Date and ID
  const localeMap = { de: 'de-DE', en: 'en-US', es: 'es-ES', fr: 'fr-FR', it: 'it-IT', pt: 'pt-BR', nl: 'nl-NL', pl: 'pl-PL', ru: 'ru-RU', zh: 'zh-CN', ja: 'ja-JP' };
  const locale = localeMap[lang] || localeMap[lang.split('_')[0]] || (isDe ? 'de-DE' : 'en-US');
  const today = new Date().toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const idPrefix = certConfig.idPrefix || 'HA-BPMN-';
  const certId = `${idPrefix}${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

  // Seal image & watermark
  const sealImg = sanitizeMediaUrl(certConfig.sealImage || '');
  const watermarkImg = sanitizeMediaUrl(certConfig.watermarkImage || '');

  const modal = document.createElement('div');
  modal.id = 'ha-bpmn-certificate-modal';
  modal.className = 'ha-bpmn-modal-backdrop';

  const modalHtml = `
    <div class="ha-bpmn-modal-dialog ha-bpmn-cert-dialog">
      <div class="ha-bpmn-modal-header ha-cert-header-actions">
        <div class="ha-cert-buttons-top">
          <button type="button" class="button button-primary ha-btn-print-cert">
            🖨️ ${escapeHtml(certStrings.btnPrint || (isDe ? 'Drucken / Als PDF' : 'Print / PDF'))}
          </button>
          <button type="button" class="button button-secondary ha-btn-download-cert-svg">
            📥 ${escapeHtml(certStrings.btnSvg || (isDe ? 'Vektor-SVG' : 'Vector SVG'))}
          </button>
          <button type="button" class="button button-secondary ha-btn-download-cert-png">
            🖼️ ${escapeHtml(certStrings.btnPng || (isDe ? 'PNG-Bild (300 DPI)' : 'PNG Image (300 DPI)'))}
          </button>
        </div>
        <button type="button" class="ha-bpmn-modal-close" aria-label="${escapeHtml(certStrings.btnClose || (isDe ? 'Schließen' : 'Close'))}">&times;</button>
      </div>
      <div class="ha-bpmn-modal-body ha-cert-body">
        <div class="ha-cert-canvas-wrap" id="ha-cert-print-area">
          <svg id="ha-cert-svg" viewBox="0 0 900 640" width="100%" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:#ffffff;font-family:Georgia,serif;box-shadow:0 10px 30px rgba(0,0,0,0.15);border-radius:12px;">
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#bf953f" />
                <stop offset="25%" stop-color="#fcf6ba" />
                <stop offset="50%" stop-color="#b38728" />
                <stop offset="75%" stop-color="#fbf5b7" />
                <stop offset="100%" stop-color="#aa771c" />
              </linearGradient>
              <linearGradient id="navyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#0f2027" />
                <stop offset="50%" stop-color="#203a43" />
                <stop offset="100%" stop-color="#2c5364" />
              </linearGradient>
              <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#94a3b8" />
                <stop offset="35%" stop-color="#f1f5f9" />
                <stop offset="70%" stop-color="#cbd5e1" />
                <stop offset="100%" stop-color="#64748b" />
              </linearGradient>
              <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#92400e" />
                <stop offset="40%" stop-color="#fef3c7" />
                <stop offset="75%" stop-color="#b45309" />
                <stop offset="100%" stop-color="#78350f" />
              </linearGradient>
              <linearGradient id="rubyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#991b1b" />
                <stop offset="35%" stop-color="#fee2e2" />
                <stop offset="70%" stop-color="#ef4444" />
                <stop offset="100%" stop-color="#7f1d1d" />
              </linearGradient>
              <linearGradient id="titanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#4c1d95" />
                <stop offset="30%" stop-color="#7c3aed" />
                <stop offset="65%" stop-color="#a855f7" />
                <stop offset="100%" stop-color="#3b0764" />
              </linearGradient>
              <linearGradient id="corporateNavyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#1e3a8a" />
                <stop offset="40%" stop-color="#3b82f6" />
                <stop offset="80%" stop-color="#1d4ed8" />
                <stop offset="100%" stop-color="#172554" />
              </linearGradient>
              <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#064e3b" />
                <stop offset="40%" stop-color="#10b981" />
                <stop offset="80%" stop-color="#059669" />
                <stop offset="100%" stop-color="#022c22" />
              </linearGradient>
              ${theme === 'custom' ? `
              <linearGradient id="customUserGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${activeBorderColor}" />
                <stop offset="50%" stop-color="#ffffff" stop-opacity="0.6" />
                <stop offset="100%" stop-color="${activeBorderColor}" />
              </linearGradient>` : ''}
              <clipPath id="certSealClip">
                <circle cx="0" cy="0" r="44" />
              </clipPath>
            </defs>

            <!-- Base Canvas -->
            <rect x="0" y="0" width="900" height="640" rx="12" fill="#faf9f6" />

            <!-- Modern Double-Line Luxury Certificate Frame -->
            <rect x="20" y="20" width="860" height="600" rx="10" fill="#ffffff" stroke="url(#${activeGradId})" stroke-width="1.8" />
            <rect x="28" y="28" width="844" height="584" rx="8" fill="none" stroke="#0f172a" stroke-opacity="0.08" stroke-width="1" />
            <rect x="34" y="34" width="832" height="572" rx="6" fill="none" stroke="url(#${activeGradId})" stroke-width="1.8" stroke-dasharray="10,6" />

            <!-- Geometric Art-Deco Corner Flourishes -->
            <!-- Top-Left -->
            <path d="M 34,60 L 34,34 L 60,34 M 40,50 L 40,40 L 50,40" fill="none" stroke="url(#${activeGradId})" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <polygon points="46,42 50,46 46,50 42,46" fill="url(#${activeGradId})" />
            <!-- Top-Right -->
            <path d="M 866,60 L 866,34 L 840,34 M 860,50 L 860,40 L 850,40" fill="none" stroke="url(#${activeGradId})" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <polygon points="854,42 858,46 854,50 850,46" fill="url(#${activeGradId})" />
            <!-- Bottom-Left -->
            <path d="M 34,580 L 34,606 L 60,606 M 40,590 L 40,600 L 50,600" fill="none" stroke="url(#${activeGradId})" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <polygon points="46,590 50,594 46,598 42,594" fill="url(#${activeGradId})" />
            <!-- Bottom-Right -->
            <path d="M 866,580 L 866,606 L 840,606 M 860,590 L 860,600 L 850,600" fill="none" stroke="url(#${activeGradId})" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <polygon points="854,590 858,594 854,598 850,594" fill="url(#${activeGradId})" />

            <!-- Optional Watermark -->
            ${watermarkImg ? `
              <image href="${escapeHtml(watermarkImg)}" x="250" y="120" width="400" height="400" opacity="0.05" preserveAspectRatio="xMidYMid meet" />
            ` : ''}

            <!-- Top Guild Insignia Crest -->
            <g transform="translate(450, 52)">
              <polygon points="0,-7 7,0 0,7 -7,0" fill="url(#${activeGradId})" />
              <circle cx="0" cy="0" r="2" fill="#ffffff" />
              <path d="M -9,3 Q -15,-4 -22,-2 M -11,0 Q -18,-7 -24,-7" fill="none" stroke="url(#${activeGradId})" stroke-width="1.2" stroke-linecap="round" />
              <path d="M 9,3 Q 15,-4 22,-2 M 11,0 Q 18,-7 24,-7" fill="none" stroke="url(#${activeGradId})" stroke-width="1.2" stroke-linecap="round" />
            </g>

            <!-- Header / Guild Title -->
            <text x="450" y="78" text-anchor="middle" font-size="11.5" letter-spacing="3" fill="#64748b" font-family="'Segoe UI',sans-serif" font-weight="700">
              ${escapeHtml(headerTitle)}
            </text>

            <!-- Certificate Title & Subtitle -->
            <text x="450" y="124" text-anchor="middle" font-size="28" font-family="'Cinzel', 'Playfair Display', Georgia, serif" font-weight="bold" fill="url(#navyGrad)">
              ${escapeHtml(certTitle)}
            </text>
            <text x="450" y="148" text-anchor="middle" font-size="11" font-family="'Segoe UI',sans-serif" font-style="italic" fill="#475569" letter-spacing="0.5">
              ${escapeHtml(certSubtitle)}
            </text>

            <!-- Modern Separator Ribbon with Central Diamond -->
            <path d="M 270 162 L 436 162 M 464 162 L 630 162" stroke="url(#${activeGradId})" stroke-width="1.6" stroke-linecap="round" />
            <polygon points="450,156 456,162 450,168 444,162" fill="url(#${activeGradId})" />
            <circle cx="450" cy="162" r="1.5" fill="#ffffff" />

            <!-- Recipient Lead-in & Name -->
            <text x="450" y="202" text-anchor="middle" font-size="13" fill="#64748b" font-family="'Segoe UI',sans-serif" letter-spacing="0.5">
              ${escapeHtml(introText)}
            </text>
            <text x="450" y="246" text-anchor="middle" font-size="32" font-family="'Cinzel', 'Playfair Display', Georgia, serif" font-weight="bold" fill="#0f172a">
              ${escapeHtml(userName)}
            </text>
            <path d="M 280 258 L 436 258 M 464 258 L 620 258" stroke="url(#${activeGradId})" stroke-width="1.2" stroke-linecap="round" />
            <polygon points="450,255 453,258 450,261 447,258" fill="url(#${activeGradId})" />

            <!-- Latin Honor Distinction Ribbon -->
            <g transform="translate(150, 276)">
              <rect x="0" y="0" width="600" height="34" rx="17" fill="${honor.bannerBg}" stroke="url(#${activeGradId})" stroke-width="1.6" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))" />
              <text x="300" y="22" text-anchor="middle" font-size="9.5" font-family="'Segoe UI',sans-serif" font-weight="bold" fill="${honor.bannerText}" letter-spacing="0.5">
                🎓 ${escapeHtml(certStrings.distinctionLabel || 'DISTINCTION')}: ${escapeHtml(honor.latin)} (${escapeHtml(honor.translation.toUpperCase())}) • ${xp} / 2.000 XP
              </text>
            </g>

            <!-- Performance Descriptions (wrapped via foreignObject) -->
            <foreignObject x="60" y="322" width="780" height="54">
              <div xmlns="http://www.w3.org/1999/xhtml" style="text-align: center; font-family: 'Segoe UI', sans-serif; line-height: 1.35;">
                <p style="margin: 0 0 4px 0; font-size: 11px; color: #334155;">${escapeHtml(descLine1)}</p>
                <p style="margin: 0; font-size: 10.5px; font-style: italic; color: #475569;">${escapeHtml(descLine2)}</p>
              </div>
            </foreignObject>

            <!-- Badges Row: Dynamic Metrics (Optional) -->
            ${showBadges ? `
              <g transform="translate(120, 395)">
                <!-- Badge 1: Main Chapters -->
                <rect x="0" y="0" width="200" height="42" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" />
                <text x="100" y="26" text-anchor="middle" font-size="12" font-family="'Segoe UI',sans-serif" font-weight="bold" fill="#203a43">
                  🏛️ ${completedChaptersCount}/${totalChaptersCount} ${escapeHtml(certStrings.chaptersSolvedLabel || (isDe ? 'Kapitel gelöst' : 'Chapters Solved'))}
                </text>

                <!-- Badge 2: XP Score with Honor Grade -->
                <rect x="225" y="0" width="210" height="42" rx="10" fill="${honor.bannerBg}" stroke="url(#${activeGradId})" stroke-width="1.4" />
                <text x="330" y="26" text-anchor="middle" font-size="12.5" font-family="'Segoe UI',sans-serif" font-weight="bold" fill="${honor.bannerText}">
                  ⭐ ${xp} XP • ${escapeHtml(honor.shortLabel)}
                </text>

                <!-- Badge 3: Linter Challenges -->
                <rect x="460" y="0" width="200" height="42" rx="10" fill="#f0fdf4" stroke="#86efac" stroke-width="1.2" />
                <text x="560" y="26" text-anchor="middle" font-size="12" font-family="'Segoe UI',sans-serif" font-weight="bold" fill="#065f46">
                  🧩 ${completedChallenges.length}/${totalChallengesCount} ${escapeHtml(certStrings.puzzlesSolvedLabel || (isDe ? 'Rätsel gelöst' : 'Puzzles Solved'))}
                </text>
              </g>
            ` : ''}

            <!-- Bottom Section: Seals & Signatures -->
            ${isDualSignature ? `
              <!-- DUAL SIGNATURE LAYOUT -->
              <!-- Official Modernized Seal (Left) -->
              ${renderModernSeal({ x: 115, y: 515, isDual: true, sealImg, activeGradId, activeBorderColor, honor, certStrings })}

              <!-- Signer 2 (Examiner / Trainer) -->
              <g transform="translate(300, 510)">
                ${sig2Img ? `
                  <image href="${escapeHtml(sig2Img)}" x="-60" y="-35" width="120" height="42" preserveAspectRatio="xMidYMid meet" />
                ` : `
                  <path d="M -50 -8 Q -20 12 0 -6 Q 20 -18 50 -6" fill="none" stroke="#203a43" stroke-width="2" stroke-linecap="round" />
                `}
                <line x1="-70" y1="10" x2="70" y2="10" stroke="#94a3b8" stroke-width="1" />
                ${signer2Name ? `
                  <text x="0" y="24" text-anchor="middle" font-size="11.5" font-family="'Segoe UI',sans-serif" font-weight="bold" fill="#1e293b">
                    ${escapeHtml(signer2Name)}
                  </text>
                  <text x="0" y="37" text-anchor="middle" font-size="10" font-family="'Segoe UI',sans-serif" fill="#64748b">
                    ${escapeHtml(signer2Title)}
                  </text>
                ` : `
                  <text x="0" y="26" text-anchor="middle" font-size="11.5" font-family="'Segoe UI',sans-serif" font-weight="bold" fill="#1e293b">
                    ${escapeHtml(signer2Title)}
                  </text>
                `}
              </g>

              <!-- Center: Date & Verification ID -->
              <g transform="translate(500, 520)">
                <line x1="-70" y1="0" x2="70" y2="0" stroke="#94a3b8" stroke-width="1" />
                <text x="0" y="16" text-anchor="middle" font-size="11" font-family="'Segoe UI',sans-serif" fill="#475569">
                  ${escapeHtml(certStrings.dateLabel || (isDe ? 'Datum:' : 'Date:'))} ${escapeHtml(today)}
                </text>
                <text x="0" y="32" text-anchor="middle" font-size="9" font-family="'Consolas',monospace" fill="#64748b">
                  ${escapeHtml(certId)}
                </text>
              </g>

              <!-- Signer 1 (Primary / Lead) -->
              <g transform="translate(710, 510)">
                ${sig1Img ? `
                  <image href="${escapeHtml(sig1Img)}" x="-60" y="-35" width="120" height="42" preserveAspectRatio="xMidYMid meet" />
                ` : `
                  <path d="M -60 -5 Q -30 -25 0 -10 Q 30 5 60 -15" fill="none" stroke="#203a43" stroke-width="2" stroke-linecap="round" />
                `}
                <line x1="-70" y1="10" x2="70" y2="10" stroke="#94a3b8" stroke-width="1" />
                ${signer1Name ? `
                  <text x="0" y="24" text-anchor="middle" font-size="11.5" font-family="'Segoe UI',sans-serif" font-weight="bold" fill="#1e293b">
                    ${escapeHtml(signer1Name)}
                  </text>
                  <text x="0" y="37" text-anchor="middle" font-size="10" font-family="'Segoe UI',sans-serif" fill="#64748b">
                    ${escapeHtml(signer1Title)} • ${escapeHtml(authorityText)}
                  </text>
                ` : `
                  <text x="0" y="26" text-anchor="middle" font-size="12" font-family="'Segoe UI',sans-serif" font-weight="bold" fill="#1e293b">
                    ${escapeHtml(signer1Title)}
                  </text>
                  <text x="0" y="38" text-anchor="middle" font-size="10" font-family="'Segoe UI',sans-serif" fill="#64748b">
                    ${escapeHtml(authorityText)}
                  </text>
                `}
              </g>
            ` : `
              <!-- SINGLE SIGNATURE LAYOUT -->
              <!-- Official Modernized Seal (Left) -->
              ${renderModernSeal({ x: 160, y: 515, isDual: false, sealImg, activeGradId, activeBorderColor, honor, certStrings })}

              <!-- Center: Date & Verification ID -->
              <g transform="translate(450, 520)">
                <line x1="-100" y1="0" x2="100" y2="0" stroke="#94a3b8" stroke-width="1" />
                <text x="0" y="16" text-anchor="middle" font-size="12" font-family="'Segoe UI',sans-serif" fill="#475569">
                  ${escapeHtml(certStrings.dateConferralLabel || (isDe ? 'Datum der Verleihung:' : 'Date of Conferral:'))} ${escapeHtml(today)}
                </text>
                <text x="0" y="34" text-anchor="middle" font-size="10" font-family="'Consolas',monospace" fill="#64748b">
                  ${escapeHtml(certId)}
                </text>
              </g>

              <!-- Signer 1 (Right) -->
              <g transform="translate(730, 510)">
                ${sig1Img ? `
                  <image href="${escapeHtml(sig1Img)}" x="-65" y="-35" width="130" height="42" preserveAspectRatio="xMidYMid meet" />
                ` : `
                  <path d="M -60 -5 Q -30 -25 0 -10 Q 30 5 60 -15" fill="none" stroke="#203a43" stroke-width="2" stroke-linecap="round" />
                `}
                <line x1="-80" y1="10" x2="80" y2="10" stroke="#94a3b8" stroke-width="1" />
                ${signer1Name ? `
                  <text x="0" y="24" text-anchor="middle" font-size="12" font-family="'Segoe UI',sans-serif" font-weight="bold" fill="#1e293b">
                    ${escapeHtml(signer1Name)}
                  </text>
                  <text x="0" y="38" text-anchor="middle" font-size="10" font-family="'Segoe UI',sans-serif" fill="#64748b">
                    ${escapeHtml(signer1Title)} • ${escapeHtml(authorityText)}
                  </text>
                ` : `
                  <text x="0" y="26" text-anchor="middle" font-size="11" font-family="'Segoe UI',sans-serif" font-weight="bold" fill="#1e293b">
                    ${escapeHtml(signer1Title)}
                  </text>
                  <text x="0" y="38" text-anchor="middle" font-size="9" font-family="'Segoe UI',sans-serif" fill="#64748b">
                    ${escapeHtml(authorityText)}
                  </text>
                `}
              </g>
            `}
          </svg>
        </div>
      </div>
    </div>
  `;

  modal.innerHTML = modalHtml;
  document.body.appendChild(modal);

  // Mirror to HA Achievement API if available (skip during admin live preview)
  const api = window.bpmnSettings && window.bpmnSettings.achievementApi;
  if (!options.isPreview && api && api.available && api.restUrl) {
    try {
      const svgEl = modal.querySelector('#ha-cert-svg');
      const svgData = svgEl ? new XMLSerializer().serializeToString(svgEl) : '';
      fetch(`${api.restUrl}credentials/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': api.nonce || ''
        },
        body: JSON.stringify({
          title: `BPMN Diplom: ${userName}`,
          honor_grade: honor.latin,
          total_xp: xp,
          svg: svgData,
          metadata: {
            completedChaptersCount,
            totalChaptersCount,
            theme
          }
        })
      })
      .then(r => r.json())
      .then(res => {
        if (res && res.success && res.verification_code) {
          console.log('[HA-BPMN] Certificate archived in HA Achievement API:', res.verification_code);
        }
      })
      .catch(err => console.debug('[HA-BPMN] Cloud certificate archive skipped:', err));
    } catch (e) {}
  }

  const closeModal = () => {
    modal.remove();
    document.removeEventListener('keydown', handleKey);
  };

  const handleKey = (e) => {
    if (e.key === 'Escape') closeModal();
  };

  document.addEventListener('keydown', handleKey);
  modal.querySelector('.ha-bpmn-modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // 1. Print button
  const printBtn = modal.querySelector('.ha-btn-print-cert');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // 2. Download SVG button
  const downloadSvgBtn = modal.querySelector('.ha-btn-download-cert-svg');
  if (downloadSvgBtn) {
    downloadSvgBtn.addEventListener('click', () => {
      const svgEl = modal.querySelector('#ha-cert-svg');
      if (!svgEl) return;
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BPMN_Grandmaster_Certificate_${userName.replace(/\s+/g, '_')}.svg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  // 3. Download High-Res PNG (300 DPI) button
  const downloadPngBtn = modal.querySelector('.ha-btn-download-cert-png');
  if (downloadPngBtn) {
    downloadPngBtn.addEventListener('click', () => {
      const svgEl = modal.querySelector('#ha-cert-svg');
      if (!svgEl) return;

      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 2700;
        canvas.height = 1920;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(blobUrl);

        canvas.toBlob((blob) => {
          if (!blob) return;
          const downloadUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `BPMN_Grandmaster_Certificate_${userName.replace(/\s+/g, '_')}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(downloadUrl);
        }, 'image/png');
      };
      img.src = blobUrl;
    });
  }
}
