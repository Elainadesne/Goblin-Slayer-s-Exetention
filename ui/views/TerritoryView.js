import { Logger } from '../../core/logger.js';
import { ViewUtils } from './ViewUtils.js';

export class TerritoryView {
    constructor(dataManager, elements) {
        this.dataManager = dataManager;
        this.elements = elements;
    }

    render() {
        try {
            const playerLocation = this.dataManager.SafeGetValue('主角.所在地', ['野外']);
            const currentTownName = Array.isArray(playerLocation) ? (playerLocation[0] ?? '野外') : (playerLocation ?? '野外');

            if (currentTownName === '野外') {
                if (this.elements.territoryContent) this.elements.territoryContent.innerHTML = '<p><b>您当前在野外，没有任何可管理的领地或产业。</b></p>';
                return;
            }

            const townData = this.dataManager.SafeGetValue(`城镇.${currentTownName}`, {});
            if (!townData || Object.keys(townData).length === 0) {
                if (this.elements.territoryContent) this.elements.territoryContent.innerHTML = `<p>关于 <b>${currentTownName}</b> 的信息不存在。</p>`;
                return;
            }

            const playerIndustries = this.dataManager.SafeGetValue('玩家产业', {});
            const townIndustries = townData.产业 || {};
            const consolidated = this.consolidateIndustries(currentTownName, townIndustries, playerIndustries);
            
            let html = this.formatTownCard(currentTownName, townData);
            if (consolidated.size === 0) {
                html += `<p>在 <b>${currentTownName}</b> 未发现任何产业。</p>`;
            } else {
                for (const [name, ind] of consolidated.entries()) {
                    html += this.formatIndustryCard(name, ind.data, ind.isPlayerOwned, currentTownName, name);
                }
            }
            
            if (this.elements.territoryContent) this.elements.territoryContent.innerHTML = html;

        } catch (error) {
            Logger.error('Failed to render territory view:', error);
        }
    }

    consolidateIndustries(currentTownName, townIndustries, playerIndustries) {
        const fv = raw => (Array.isArray(raw) ? (raw[0] ?? '') : typeof raw === 'string' ? raw : '');
        const belongsHere = ind => {
            const strongTown = fv(ind?.所属城镇);
            if (strongTown) return strongTown === currentTownName;
            const desc = fv(ind?.整体描述);
            return typeof desc === 'string' && desc.includes(currentTownName);
        };

        const consolidated = new Map();
        for (const [name, data] of Object.entries(townIndustries)) {
            if (name === '$meta') continue;
            consolidated.set(name, { data, isPlayerOwned: false });
        }
        for (const [name, data] of Object.entries(playerIndustries)) {
            if (name === '$meta') continue;
            if (belongsHere(data) || consolidated.has(name)) {
                consolidated.set(name, { data, isPlayerOwned: true });
            }
        }
        return consolidated;
    }

    formatTownCard(name, data) {
        const fv = raw => (Array.isArray(raw) ? (raw[0] ?? '') : typeof raw === 'string' ? raw : '');
        const effectText = fv(data?.城镇效益) || '无特殊效益';
        const descText = fv(data?.整体描述) || '...';
        const ownerVal = fv(data?.所有者);
        const ownerBadge =
            ownerVal && /主角|玩家派系|玩家/.test(String(ownerVal)) ? '<span class="town-badge">领地</span>' : '';
        return `
              <div class="town-card">
                  <h4>${name} ${ownerBadge}</h4>
                  <div class="property">
                      <span class="property-name">当前效益:</span>
                      <span class="value-main" style="color: var(--trust-color);">${effectText}</span>
                  </div>
                  <hr class="thin-divider" style="margin: 8px 0;">
                  <div class="property">
                      <span class="property-name">整体描述:</span>
                      <div class="quote-text">${descText}</div>
                  </div>
              </div>
            `;
    }

    formatIndustryCard(displayName, data, isPlayerOwned = false, townName = null, rawNameForMatch = null) {
        const fv = raw => (Array.isArray(raw) ? (raw[0] ?? '') : typeof raw === 'string' ? raw : '');
        if (displayName === '$meta') {
            return '';
        }
        const cardClass = isPlayerOwned ? 'industry-card player-owned' : 'industry-card';
        const ownerIcon = isPlayerOwned ? '⭐ ' : '';
        const typeText = fv(data?.类型);
        const typeBadge = typeText ? ` <span class="town-badge">${typeText}</span>` : '';
        const scaleText = fv(data?.规模) || '未描述';
        const benefitText = fv(data?.效益) || '未描述';
        const parsedFacility = this.parseValueDesc(data?.功能设施);
        const facilityValueText = parsedFacility.value || '无';
        const facilityDescText = parsedFacility.desc;
        const checklistText = fv(data?.今日清单) || '无特殊事务';
        const descText = fv(data?.整体描述) || '...';

        const matchName = this._sanitizeForNameMatch(rawNameForMatch || displayName);

        return `
              <div class="${cardClass}">
                <div class="industry-grid">
                  <div class="industry-title">
                    <h4>${ownerIcon}${displayName}${typeBadge}</h4>
                    ${this._buildIndustryMediaHTML(matchName, typeText, townName)}
                  </div>
                  <div class="industry-body">
                    <div class="property">
                      <span class="property-name">规模:</span> ${scaleText}
                    </div>
                    <div class="property">
                      <span class="property-name">效益:</span> ${benefitText}
                    </div>
                    <hr class="thin-divider" style="margin: 8px 0;">
                    <div class="property">
                      <span class="property-name">功能设施:</span>
                      <div class="quote-text"><b>总述:</b> ${facilityValueText}</div>
                      ${facilityDescText ? '<div class="quote-text"><b>详述:</b> ' + facilityDescText + '</div>' : ''}
                    </div>
                    <div class="property">
                      <span class="property-name">今日清单:</span>
                      <div class="quote-text">${checklistText}</div>
                    </div>
                    <div class="property">
                      <span class="property-name">整体描述:</span>
                      <div class="quote-text">${descText}</div>
                    </div>
                  </div>
                </div>
              </div>
            `;
    }

    _buildIndustryMediaHTML(name, type, townName) {
        const images = this._getValidImageList(name, type, townName, 3);
        if (!images || images.length === 0) {
            return `<div class="industry-underline"></div>`;
        }
        const thumbs = images
            .map(img => {
                const url = img.url;
                const caption = img.caption || '';
                const alt = caption ? `${name} — ${caption}` : name;
                return `<a class="thumb" href="${url}" target="_blank" rel="noopener">
                          <img src="${url}" loading="lazy" alt="${alt}" referrerpolicy="no-referrer" onerror="this.closest('.thumb').classList.add('img-failed')"/>
                          ${caption ? `<div class="caption">${caption}</div>` : ''}
                        </a>`;
            })
            .join('');
        return `<div class="industry-underline"></div><div class="industry-media-slot">${thumbs}</div>`;
    }

    _getValidImageList(name, type, townName = null, maxCount = 3) {
        const db = this.dataManager.industryImageData;
        if (!db) return [];
        const matchName = this._sanitizeForNameMatch(name);
        const candidates = this._deriveCandidateTypes(matchName, type);

        const selectFromScope = scope => {
            if (!scope) return [];
            const byName = scope['按名称']?.[matchName]?.images || [];
            if (byName.length > 0) return byName;
            for (const t of candidates) {
                const arr = scope['按类型']?.[t]?.images || [];
                if (arr.length > 0) return arr;
            }
            return [];
        };

        let list = [];
        if (townName && db['按城镇']?.[townName]) {
            list = selectFromScope(db['按城镇'][townName]);
        }
        if (list.length === 0) {
            list = selectFromScope(db);
        }
        if (list.length === 0) {
            list = db['_fallback']?.images || [];
        }

        list = list.filter(img => typeof img?.url === 'string' && /^https?:\/\//i.test(img.url));
        list.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
        return list.slice(0, maxCount);
    }

    _deriveCandidateTypes(name, typeText) {
        const out = new Set();
        const push = t => {
            if (t && typeof t === 'string' && t.trim()) out.add(t.trim());
        };
        const splitTokens = txt =>
            String(txt || '')
            .split(/[\/\|,，、\s\-—()（）【】\[\]·]+/g)
            .map(t => t.trim())
            .filter(Boolean);
        if (typeText) {
            push(typeText);
            for (const t of splitTokens(typeText)) push(t);
        }
        for (const guess of this._guessTypesFromName(name)) push(guess);
        return Array.from(out);
    }

    _guessTypesFromName(name) {
        const ALIASES = {
            铁匠铺: ['铁匠铺', '铁匠', '锻造', '打铁'],
            采石场: ['采石场', '采石', '石场', '碎石'],
            酒馆: ['酒馆', '酒吧', '旅店', '酒肆'],
            公会: ['公会', '行会', '冒险者公会'],
            商店: ['商店', '商栈', '店铺', '铺子', '商号'],
            工坊: ['工坊', '工场', '作坊'],
        };
        const s = String(name || '');
        const res = new Set();
        for (const [canon, arr] of Object.entries(ALIASES)) {
            if (arr.some(alias => s.includes(alias))) res.add(canon);
        }
        return Array.from(res);
    }

    _sanitizeForNameMatch(name) {
        if (typeof name !== 'string') return '';
        return name.replace(/<[^>]*>/g, '').trim();
    }

    parseValueDesc(raw) {
        try {
            let value = '';
            let desc = '';
            if (Array.isArray(raw)) {
                const arr = raw.filter(x => x !== null && x !== undefined);
                if (
                    arr.length === 2 &&
                    typeof arr[1] === 'string' &&
                    (arr[1].trim().length >= 20 || /[。；，,.]/.test(arr[1]))
                ) {
                    value = String(arr[0] ?? '');
                    desc = arr[1];
                } else {
                    const flat = arr
                        .flatMap(x => (Array.isArray(x) ? x : [x]))
                        .map(x => String(x))
                        .filter(Boolean);
                    value = flat.join('、');
                    desc = '';
                }
            } else if (typeof raw === 'string') {
                const tokens = raw
                    .split(/[\/\|,，、]+/)
                    .map(t => t.trim())
                    .filter(Boolean);
                value = tokens.length > 1 ? tokens.join('、') : raw;
            } else {
                value = '';
                desc = '';
            }
            return { value, desc };
        } catch (e) {
            Logger.warn('parseValueDesc error', e);
            return { value: '', desc: '' };
        }
    }
}