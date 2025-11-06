import { Logger } from '../../core/logger.js';

export class MapView {
    constructor(dataManager, elements) {
        this.dataManager = dataManager;
        this.elements = elements;
        this.map = null;
        this.imageWidth = 2695;
        this.imageHeight = 1840;
        this.baseMapUrl = new URL('../../assets/map_img/four face world 5.0.png', import.meta.url).href;
        this.fullscreenOverlay = null;
        this.markersVisible = true; // 控制路径点可见性
    }

    /**
     * 打开全屏地图
     */
    async openFullscreen() {
        Logger.log('[MapView] 打开全屏地图');
        
        // 延迟加载 FullscreenOverlay
        if (!this.fullscreenOverlay) {
            const { FullscreenOverlay } = await import('../components/FullscreenOverlay.js');
            this.fullscreenOverlay = new FullscreenOverlay({
                className: 'fullscreen-map-view',
                onClose: () => this._onFullscreenClose()
            });
        }

        const content = this._createFullscreenContent();
        this.fullscreenOverlay.open(content);

        // 延迟初始化地图
        setTimeout(() => {
            this._initializeFullscreenMap();
        }, 100);
    }

    /**
     * 关闭全屏地图
     */
    closeFullscreen() {
        if (this.fullscreenOverlay) {
            this.fullscreenOverlay.close();
        }
    }

    /**
     * 全屏关闭回调
     */
    _onFullscreenClose() {
        Logger.log('[MapView] 关闭全屏地图');
        if (this.fullscreenMap) {
            try {
                this.fullscreenMap.remove();
            } catch (e) {
                Logger.warn('[MapView] 移除全屏地图失败:', e);
            }
            this.fullscreenMap = null;
        }
    }

    /**
     * 创建全屏地图内容
     */
    _createFullscreenContent() {
        const container = document.createElement('div');
        container.className = 'fullscreen-map-container';
        container.innerHTML = `
            <div id="fullscreen-map-wrapper" style="width: 100%; height: 100%; position: relative;">
                <div id="fullscreen-coord-overlay" style="
                    position: absolute;
                    top: 20px;
                    right: 80px;
                    padding: 8px 16px;
                    border-radius: 8px;
                    border: 1px solid rgba(168,192,255,0.5);
                    background: rgba(15,23,42,0.95);
                    color: #e0d6c8;
                    font-size: 14px;
                    font-weight: 600;
                    z-index: 1000;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                    backdrop-filter: blur(10px);
                    user-select: none;
                    pointer-events: none;
                ">坐标: -, -</div>
                <button id="toggle-markers-btn" style="
                    position: absolute;
                    top: 80px;
                    right: 20px;
                    padding: 10px 16px;
                    border-radius: 8px;
                    border: 1px solid rgba(168,192,255,0.5);
                    background: rgba(15,23,42,0.95);
                    color: var(--accent-blue);
                    font-size: 14px;
                    font-weight: 600;
                    z-index: 1000;
                    cursor: pointer;
                    backdrop-filter: blur(10px);
                    transition: all 0.3s ease;
                ">
                    <i class="fa-solid fa-eye"></i> 隐藏路径点
                </button>
            </div>
        `;
        return container;
    }

    /**
     * 初始化全屏地图
     */
    async _initializeFullscreenMap() {
        const wrapper = window.parent.document.getElementById('fullscreen-map-wrapper');
        if (!wrapper) {
            Logger.error('[MapView] 全屏地图容器未找到');
            return;
        }

        await this.ensureLeafletLoaded();
        
        // 创建全屏地图实例
        const L = window.L;
        
        // 如果已有全屏地图，先移除
        if (this.fullscreenMap) {
            try {
                this.fullscreenMap.remove();
            } catch (e) {
                Logger.warn('[MapView] 移除旧的全屏地图失败:', e);
            }
        }

        // 初始化全屏地图
        this.fullscreenMap = L.map(wrapper, {
            crs: L.CRS.Simple,
            minZoom: -1,
            maxZoom: 4
        });

        const bounds = [[0, 0], [this.imageHeight, this.imageWidth]];
        L.imageOverlay(this.baseMapUrl, bounds).addTo(this.fullscreenMap);
        this.fullscreenMap.fitBounds(bounds);

        // 添加坐标显示
        this._setupFullscreenCoordinateDisplay();

        // 添加城市标记
        this._addFullscreenCityMarkers();

        // 添加玩家位置
        this._addFullscreenPlayerMarker();

        // 添加位标
        this._addFullscreenWaypoints();
        
        // 绑定隐藏按钮
        const toggleBtn = window.parent.document.getElementById('toggle-markers-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this._toggleMarkers(toggleBtn));
        }

        Logger.success('[MapView] 全屏地图初始化完成');
    }

    /**
     * 切换路径点可见性
     */
    _toggleMarkers(button) {
        this.markersVisible = !this.markersVisible;
        
        const targetMap = this.fullscreenMap || this.map;
        if (targetMap) {
            targetMap.eachLayer((layer) => {
                if (layer instanceof L.Marker && !layer.options.isPlayer) {
                    if (this.markersVisible) {
                        layer.setOpacity(1);
                    } else {
                        layer.setOpacity(0);
                    }
                }
            });
        }

        button.innerHTML = this.markersVisible 
            ? '<i class="fa-solid fa-eye"></i> 隐藏路径点'
            : '<i class="fa-solid fa-eye-slash"></i> 显示路径点';
    }

    async render() {
        if (!this.elements.mapContent) {
            Logger.warn('Map content element not found');
            return;
        }

        try {
            // 如果地图已经存在且正常，不重复创建
            if (this.map && this.map._container) {
                Logger.log('Map already exists and is valid, skipping re-creation');
                // 更新玩家位置和位标（数据可能已更新）
                this.updateDynamicMarkers();
                return;
            }

            // 清理旧地图（如果存在但无效）
            if (this.map) {
                try {
                    this.map.remove();
                } catch (e) {
                    Logger.warn('Failed to remove old map:', e);
                }
                this.map = null;
            }

            // 创建地图容器
            this.elements.mapContent.innerHTML = `
                <div id="leaflet-map-container" style="width: 100%; height: 100%; position: relative;">
                    <div id="coord-overlay" style="
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        padding: 6px 12px;
                        border-radius: 6px;
                        border: 1px solid rgba(168,192,255,0.5);
                        background: rgba(15,23,42,0.9);
                        color: #e0d6c8;
                        font-size: 13px;
                        font-weight: 600;
                        z-index: 1000;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        user-select: none;
                        pointer-events: none;
                    ">坐标: -, -</div>
                </div>
            `;

            // 等待 Leaflet 加载
            await this.ensureLeafletLoaded();

            // 初始化地图
            this.initializeMap();

            Logger.success('Map view rendered successfully');
        } catch (error) {
            Logger.error('Failed to render map view:', error);
            this.elements.mapContent.innerHTML = `
                <div class="error-message" style="padding: 20px; text-align: center;">
                    <p style="color: #ef4444; margin-bottom: 10px;">地图加载失败</p>
                    <p style="color: #888; font-size: 0.9em;">${error.message}</p>
                    <button onclick="window.gsStatusBarApp.uiController.renderMap()" 
                            style="margin-top: 15px; padding: 8px 16px; border: 1px solid #444; 
                                   border-radius: 4px; background: #333; color: #fff; cursor: pointer;">
                        重试
                    </button>
                </div>
            `;
        }
    }

    async ensureLeafletLoaded() {
        // 检查 Leaflet 是否已加载
        if (window.L) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            // 加载 Leaflet CSS
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            window.parent.document.head.appendChild(cssLink);

            // 加载 Leaflet JS
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => {
                Logger.log('Leaflet loaded successfully');
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load Leaflet library'));
            };
            window.parent.document.head.appendChild(script);
        });
    }

    initializeMap() {
        const L = window.L;
        const container = window.parent.document.getElementById('leaflet-map-container');

        if (!container) {
            Logger.error('Map container not found');
            return;
        }

        // 初始化地图
        this.map = L.map(container, {
            crs: L.CRS.Simple,
            minZoom: -1,
            maxZoom: 4
        });

        const bounds = [[0, 0], [this.imageHeight, this.imageWidth]];
        L.imageOverlay(this.baseMapUrl, bounds).addTo(this.map);
        this.map.fitBounds(bounds);

        // 添加坐标显示
        this.setupCoordinateDisplay();

        // 添加城市标记
        this.addCityMarkers();

        // 添加玩家位置
        this.addPlayerMarker();

        // 添加位标
        this.addWaypoints();
    }

    flipY(y) {
        return this.imageHeight - y;
    }

    setupCoordinateDisplay() {
        const L = window.L;
        const overlay = window.parent.document.getElementById('coord-overlay');

        if (!overlay) return;

        this.map.on('mousemove', (e) => {
            const x = Math.round(e.latlng.lng);
            const y = Math.round(this.imageHeight - e.latlng.lat);
            overlay.textContent = `坐标: ${x}, ${y}`;
        });

        // 临时标记变量
        let tempMarker = null;

        this.map.on('click', (e) => {
            const x = Math.round(e.latlng.lng);
            const y = Math.round(this.imageHeight - e.latlng.lat);
            const lat = this.imageHeight - y;
            const lng = x;

            // 移除之前的临时标记
            if (tempMarker) {
                this.map.removeLayer(tempMarker);
            }

            // 创建新的临时标记
            tempMarker = L.marker([lat, lng]).addTo(this.map);
            const popupHtml = `
                <div style="padding: 8px;">
                    <strong>坐标</strong><br>
                    x=${x}, y=${y}<br>
                    <button onclick="navigator.clipboard.writeText('${x},${y}')" 
                            style="margin-top:6px;padding:4px 8px;border:1px solid #444;border-radius:4px;background:#eee;cursor:pointer;">
                        复制坐标
                    </button>
                </div>
            `;
            tempMarker.bindPopup(popupHtml).openPopup();

            // 10秒后自动移除
            setTimeout(() => {
                if (tempMarker) {
                    this.map.removeLayer(tempMarker);
                    tempMarker = null;
                }
            }, 10000);
        });
    }

    addCityMarkers() {
        const L = window.L;

        // 地点插图 - 使用本地资源
        const placeImages = {
            '碎冰北海': new URL('../../assets/location illustration_img/碎冰北海.png', import.meta.url).href,
            '西部边境': new URL('../../assets/location illustration_img/西部边境.png', import.meta.url).href,
            '灼热边疆': new URL('../../assets/location illustration_img/灼热边疆.png', import.meta.url).href,
            '边缘三角洲': new URL('../../assets/location illustration_img/边缘三角洲.png', import.meta.url).href,
            '沉没巨林': new URL('../../assets/location illustration_img/沉没巨林.png', import.meta.url).href,
            '沉没沼泽': new URL('../../assets/location illustration_img/沉没沼泽.png', import.meta.url).href,
            '低语山脉': new URL('../../assets/location illustration_img/低语山脉.png', import.meta.url).href,
            '静谧湖区': new URL('../../assets/location illustration_img/静谧湖区.png', import.meta.url).href,
            '巨木之森': new URL('../../assets/location illustration_img/巨木之森.png', import.meta.url).href,
            '破碎海岸': new URL('../../assets/location illustration_img/破碎海岸.png', import.meta.url).href,
            '伤痕平原': new URL('../../assets/location illustration_img/伤痕平原.png', import.meta.url).href,
            '炙热平原': new URL('../../assets/location illustration_img/炙热平原.png', import.meta.url).href,
            '北方林地': new URL('../../assets/location illustration_img/北方林地.png', import.meta.url).href,
            '缠绕沼泽': new URL('../../assets/location illustration_img/缠绕沼泽.png', import.meta.url).href,
            '丰饶大平原': new URL('../../assets/location illustration_img/丰饶大平原.png', import.meta.url).href,
            '黄金沙海': new URL('../../assets/location illustration_img/黄金沙海.png', import.meta.url).href,
            '巨人霜原': new URL('../../assets/location illustration_img/巨人霜原.png', import.meta.url).href,
            '龙喉火山带': new URL('../../assets/location illustration_img/龙喉火山带.png', import.meta.url).href,
            '世界之脊隘口': new URL('../../assets/location illustration_img/世界之脊隘口.png', import.meta.url).href,
        };

        // 地点指针 - 使用本地资源
        const pointerIcon = (url) => L.icon({
            iconUrl: url,
            iconSize: [56, 56],
            iconAnchor: [28, 28],
            popupAnchor: [0, -28],
        });

        const placePointers = {
            '北方林地': pointerIcon(new URL('../../assets/location pointer_img/北方林地地点指针.png', import.meta.url).href),
            '边缘三角洲': pointerIcon(new URL('../../assets/location pointer_img/边缘三角洲地点指针.png', import.meta.url).href),
            '缠绕沼泽': pointerIcon(new URL('../../assets/location pointer_img/缠绕沼泽地图指针.png', import.meta.url).href),
            '沉没巨林': pointerIcon(new URL('../../assets/location pointer_img/沉没巨林地图指针.png', import.meta.url).href),
            '沉没沼泽': pointerIcon(new URL('../../assets/location pointer_img/沉没沼泽地点指针.png', import.meta.url).href),
            '低语山脉': pointerIcon(new URL('../../assets/location pointer_img/低语山脉地图指针.png', import.meta.url).href),
            '丰饶大平原': pointerIcon(new URL('../../assets/location pointer_img/丰饶大平原地图指针.png', import.meta.url).href),
            '黄金沙海': pointerIcon(new URL('../../assets/location pointer_img/黄金沙海地图指针.png', import.meta.url).href),
            '静谧湖区': pointerIcon(new URL('../../assets/location pointer_img/静谧湖区地图指针.png', import.meta.url).href),
            '巨木之森': pointerIcon(new URL('../../assets/location pointer_img/巨木之森地点指针.png', import.meta.url).href),
            '巨人霜原': pointerIcon(new URL('../../assets/location pointer_img/巨人霜原地图指针.png', import.meta.url).href),
            '龙喉火山带': pointerIcon(new URL('../../assets/location pointer_img/龙喉火山带地图指针.png', import.meta.url).href),
            '破碎海岸': pointerIcon(new URL('../../assets/location pointer_img/破碎海岸地点指针.png', import.meta.url).href),
            '伤痕平原': pointerIcon(new URL('../../assets/location pointer_img/伤痕平原地点指针.png', import.meta.url).href),
            '世界之脊隘口': pointerIcon(new URL('../../assets/location pointer_img/世界之脊隘口地图指针.png', import.meta.url).href),
            '碎冰北海': pointerIcon(new URL('../../assets/location pointer_img/碎冰北海地图指针.png', import.meta.url).href),
            '西部边境': pointerIcon(new URL('../../assets/location pointer_img/西部边境地图指针.png', import.meta.url).href),
            '炙热平原': pointerIcon(new URL('../../assets/location pointer_img/炙热平原地点指针.png', import.meta.url).href),
            '灼热边疆': pointerIcon(new URL('../../assets/location pointer_img/灼热边疆地图指针.png', import.meta.url).href),
        };

        // 完整的地点数据
        const enrichedPlaces = [
            {
                name: '碎冰北海', x: 1317, y: 315,
                desc: `碎冰北海是北方之地的尽头，一片终年漂浮着巨大浮冰的寒冷海洋。其海岸线犬牙交错，布满了险峻的峡湾和黑色的火山岩海滩，环境恶劣。生活在此地的北方人被称为"海狼"，他们是技艺最高超的水手和最凶猛的海盗，文化完全围绕着海洋、船只与劫掠展开。他们的经济是掠夺与渔业的结合体，一方面驾驶龙头长船沿海南下，突袭富裕的港口；另一方面则捕猎海豹、海象乃至名为"利维坦之裔"的巨型鲸鱼，用获得的鲸油和皮毛与内陆部落交换木材等物资。白鲸港和风暴峡湾是他们主要的据点。除了随时可能掀翻船只的极地风暴，北海中最危险的存在是传说中的巨大海怪（Kraken）和神出鬼没的亡灵船，使得每一次航行都成为一场生死豪赌。`
            },
            {
                name: '西部边境', x: 1150, y: 687,
                desc: `西部边境是中央王国以西的广阔未知区域，一片机遇与致命危险并存的严酷土地。它并非一个统一的国度，而是由一系列地理环境与文明程度截然不同的地带构成，越向西行，就越是远离人烟，也越是凶险。
这片边境的起点是伤痕平原，一片与王国接壤、被战斗撕裂的丘陵地带。这里是开拓者、流放者和亡命徒的聚集地，他们在此建立简陋的村庄，挣扎求生，同时抵御着从冬眠中苏醒的魔物和迁徙的巨兽群。
越过平原，便是高耸入云的低语山脉。这里是与世隔绝的领域，山中盘踞着排外的山地氏族与凶悍的鸟人部落，他们对所有试图前来开采"风浮石"等珍稀矿产的外来者都抱持着极大的敌意。险峻的地形、变幻莫测的浓雾以及能侵入心智的"低语"声，使得这里成为寻宝者的坟墓。
而在已知世界的尽头，是沉没巨林。一片被无尽沼泽侵蚀的原始森林，终年不见天日，只有发光的菌类提供着幽冷的光源。这里已无人类文明的踪迹，是虫人帝国的前哨、古老恐怖生物的领地。对于最顶级的冒险者而言，这里是获取强效毒素和失落知识的终极险地，但任何试图在此建立据点的行为都以惨败告终。
总而言之，西部边境是一条从挣扎求生的前线，到与世隔绝的险峰，再到文明禁区的渐进之路。连接着这一切的，是依赖武装商队维持的"开拓者之路"、亡命徒踩出的"愚者之升"，以及仅存于传说中的"幽光航道"。每深入一步，都意味着离文明世界更远，离死亡更近。`
            },
            {
                name: '灼热边疆', x: 1694, y: 785,
                desc: `灼热边疆是文明王国与无垠沙海之间的交界地，一片由干涸河床、龟裂红土与黑色戈壁构成的荒凉地带。这里几乎不产出任何有价值的物资，其存在的最大意义是作为所有进出沙漠商队的最后补给站。此地汇聚了来自王国的破产者、逃犯和梦想家，形成了一种混杂着绝望与希望的"淘金者"文化。整个区域的经济由数个武装商栈控制，其中以残酷高效闻名的"金蝎商会"是最大的势力。除了常年的沙尘暴，春季从沙漠深处吹来的炙热"炎魔风"以及在此地繁殖的巨型沙行虫，是所有试图穿越此地之人必须面对的致命威胁。`
            },
            {
                name: '边缘三角洲', x: 1445, y: 1220,
                desc: `边缘三角洲是大陆南部一个气候恶劣、局势混乱的交界地带。它位于破碎海岸、沉没沼泽与炙热平原三者之间，地理上由泥沙、河道和破败的村庄构成，呈现出一片混乱的三角洲景象。
在这里的历史上，边缘三角洲曾是各方势力激烈交战的战场，至今仍能看到战争留下的遗迹。由于其独特的地理位置和复杂的历史背景，该地区成为了亡灵、食尸生物以及其他危险魔物滋生的温床。
在政治和人文方面，南方城邦联合中一些声名狼藉的城市（例如威伦）就坐落于此。此外，一条名为"驼背沼地小径"的道路贯穿此地，连接着沉没沼泽与南方城邦联合。尽管这条小径是探险者深入沼泽的最佳路线，但路况极差，沿途遍布着危险的沼泽、泥潭、贫穷的村庄和不友善的居民，因此越来越不受欢迎。食腐生物在白天出没，而夜晚则有亡灵活动的传闻，使得这条道路的危险性进一步增加。`
            },
            {
                name: '沉没巨林', x: 790, y: 835,
                desc: `沉没巨林是已知世界的西方尽头，一片被无尽沼泽所侵蚀的原始巨木森林。巨大的树冠遮天蔽日，林下终年阴暗潮湿，唯一的照明来自于附着在树干与水面上的幽幽冷光菌。这里没有人类文明的踪迹，是虫人帝国的前哨、蜥蜴人部落的猎场，以及拥有原始智慧的巨型植物的领地。此地是炼金与制毒的天堂，巨型昆虫的毒腺、万年古树的树皮以及发光的真菌都是价值连城的材料。这里没有经济，只有丛林法则，所有产出都依赖于顶级冒险者小队冒死带回。全年弥漫的致命瘴气和携带"沼泽腐热病"的巨蚊只是基础威胁；雨季的洪水会彻底改变地形，而旱季水位下降虽会暴露出失落的遗迹，却也会唤醒沉睡在淤泥中更为古老的恐怖之物。`
            },
            {
                name: '沉没沼泽', x: 1255, y: 1153,
                desc: `从破碎海岸向内陆延伸，便是广阔的沉没沼泽。这是一片亚热带风格的湿地，河网密布，盘根错节的古老树木遮天蔽日，有些树木甚至高达十数米。[1] 沼泽地带的空气湿热，是无数奇特动植物的家园，同时也是古老的蜥蜴人部落世代居住与实际统治的领地。一条名为"浊龙水道"的天然水道蜿蜒穿行于沼泽之中，连接着两大水系，是运输大宗货物的唯一途径，但复杂的航道和水下潜伏的危险魔物使得这条水道充满了风险。对于居住于此的蜥蜴人而言，繁荣的冒险者王国兰德索尔是他们最大的高端佣兵雇主市场，许多强大的蜥蜴人战士会前往那里寻求财富与荣耀。`
            },
            {
                name: '低语山脉', x: 906, y: 650,
                desc: `在伤痕平原以西，险峻的低语山脉高耸入云。风穿过山体上无数被侵蚀出的孔洞，发出如同鬼魅低语般的诡异呼啸，这便是其名字的由来。山脉内部遍布着巨大的洞窟体系和废弃的古代矿道。这里是被文明遗忘的孤岛，人类以排外而凶悍的血缘氏族形式生存，更深处则是鸟人部落的领地。山脉中蕴藏着丰富的矿物，尤其是能抵抗重力的稀有水晶——"风浮石"，吸引着无数寻宝猎人踏上名为"愚者之升"的险峻小径前来探寻。然而，山脉的危险远不止于此：冬季的暴雪会封锁一切通路，春秋的浓雾则将其变为致命的迷宫，而那诡异的"低语"声在特定月相下，据说能直接侵入心智，使人陷入疯狂。`
            },
            {
                name: '静谧湖区', x: 1167, y: 990,
                desc: `静谧湖区是南方文明的摇篮与核心，一片环绕着大陆南部巨湖"澄镜湖"的富饶地带。这里河网纵横，气候湿润宜人，以宏伟的"水之都"为中心，形成了宗教与商业共存的独特文化。至高神大神殿在此地拥有至高无上的影响力，主导着生命与慈悲的价值观。经济由庞大的"碧波商会"主导，他们利用宽阔的"碧水道"几乎垄断了所有进出南方的水路贸易。然而，这片繁荣之地的安宁也并非永恒，春季融雪可能引发洪水，而夏季雨季则可能带来名为"赤霉病"的水生瘟疫，威胁着这片土地的生命之源。`
            },
            {
                name: '巨木之森', x: 1506, y: 999,
                desc: `巨木之森是位于水乡东南部的一片广袤原始森林，林内参天古木遮天蔽日，光线昏暗，充满了神秘与未知。这里是崇尚自然的森人世代栖居的领地，他们与森林共生，守护着林中珍贵的魔法植物与千年古木。此地的经济是一种高度专业化的交换体系，森人通过边缘城镇"叶荫镇"作为窗口，用他们精工制作的弓箭与草药，交换外界的金属与盐。对于人类而言，这片森林既是宝库也是禁区，除了秋季干燥时节随时可能爆发的森林火灾，那些栖息在森林深处、守护着自己领地的古老魔法生物，是对所有贪婪的闯入者最严厉的警告。`
            },
            {
                name: '破碎海岸', x: 1400, y: 1329,
                desc: `破碎海岸是大陆南部一条饱受"无尽之喉"风暴侵袭的漫长海岸线。这里的地貌以被海浪长期侵蚀而形成的陡峭悬崖和遍布各处的危险暗礁区为特征。由于险恶的自然环境，这里也成为了无数船只的坟墓，沉船残骸随处可见。整个地区气候潮湿且多风，天空常年被阴云笼罩，呈现出一片阴郁的景象。盘踞在此地的海盗邦联更是加剧了此地的危险，他们依托复杂隐蔽的海岸地形，对过往船只，尤其是悬挂着兰德索尔或其合作商会旗帜的船队，构成了致命的威胁。`
            },
            {
                name: '伤痕平原', x: 984, y: 679,
                desc: `伤痕平原是位于中央王国边境的广阔前线，一片被无尽冲突撕裂的丘陵地带。远古巨兽的残骸与神代战争留下的战坑散布其间，见证着此地的动荡历史。这里的文化由王国的失意者、罪犯、破产农户和理想主义者共同构成，他们坚韧而多疑，在共同的困境中形成了紧密的社群。经济在生存线上挣扎，以星罗棋布的开拓村为基础，唯一的地区性商业力量是"狮鹫之翼运输队"，他们维持着连接文明世界的"开拓者之路"的运转。这片土地的季节性威胁尤为严峻：春季，冬眠魔物的苏醒会引发频繁的领地冲突；夏季，茂盛的草丛成为掠食者的完美伏击点；而秋季，大型魔物群的迁徙则会无情地踏平沿途的一切。`
            },
            {
                name: '炙热平原', x: 1156, y: 1354,
                desc: `炙热平原位于沉没沼泽的更深处，远离了海岸潮湿的空气，气候变得炎热而干燥。这里的地形以开阔的稀树草原和红色的岩漠为主，展现出与海岸和沼泽截然不同的荒凉景象。广袤的平原是大型野兽和游牧民族驰骋的领域，充满了原始的野性与危险。一条沿着干涸河床与绿洲延伸的"红沙古道"连接着南方的水乡地带与平原丰富的矿产资源，是重要的商贸路线。然而，商队必须雇佣强大的护卫，以抵御平原上随时可能出现的掠食者和游牧劫匪。此外，一条被冒险者们走出来的非官方道路"索尔之道"，将平原与兰德索尔连接起来，成为商品流通和冒险者探索的生命线。`
            },
            {
                name: '北方林地', x: 1220, y: 561,
                desc: `北方林地是王国北部广阔的温带森林与山地，地势复杂，民风坚韧而独立。此地经济以原材料采集为主，茂密的原始森林提供了王国所需的大部分木材，山中蕴藏的矿藏则由铁砧堡等据点负责开采。这里的民众崇尚自然与祖先之灵，形成了独特的"林中圣母"崇拜。生活在此地意味着要直面自然的严酷，冬季漫长而酷寒的暴风雪会封锁所有道路，而森林深处强大的魔物在食物短缺时，便会将目光投向人类的村庄。`
            },
            {
                name: '缠绕沼泽', x: 1133, y: 1058,
                desc: `缠绕沼泽是位于水乡西南的文明边缘地带，一片广阔、泥泞且充满瘴气的湿地。无数浑浊的水道在此交织成天然的迷宫，生存是这里唯一的法则。少数被称为"泽人"的人类后裔在水上的高脚木屋中生活，他们坚韧而排外；沼泽深处则是崇拜原始龙之祖先的蜥蜴人部落的领地。这里的资源独特但获取极为危险，巨型两栖生物的皮革与毒囊是亡命之徒追逐的珍品。全年弥漫的瘴气和瘟疫是此地永恒的威胁，而雨季的洪水不仅会彻底扰乱水道，更会唤醒水中潜伏的、变得异常活跃的掠食者。`
            },
            {
                name: '丰饶大平原', x: 1280, y: 725,
                desc: `环绕着王畿之心的丰饶大平原是王国名副其实的粮仓与畜栏。在这片一望无际的土地上，农业是唯一的核心。地方贵族与乡绅掌控着经济命脉，组织着谷物的生产与牲畜的牧养，并通过"丰饶古道"将这些基础物资输送到王国各地。这里的民风淳朴而务实，信仰与农业生产紧密结合，人们敬拜地母神与掌管风雨收成的自然之灵。尽管看似和平，但这片土地的命运却时刻受到自然的左右，春季的蝗灾、夏秋的干旱以及洪水，都可能在旦夕之间摧毁一年的收成。`
            },
            {
                name: '黄金沙海', x: 1883, y: 803,
                desc: `黄金沙海是东方沙漠的核心，一片由连绵不绝的巨大沙丘组成的无垠海洋。在这里，绿洲是所有生命的唯一依靠，"水"和"盐"是比黄金更珍贵的硬通货。社会以坚韧务实的商队文化为核心，围绕着大型绿洲城邦（如月牙绿洲城）或永不停歇的巨型移动商队展开。几个强大的寡头"辛迪加"控制着最重要的绿洲与贸易路线，如同沙漠中的国王，他们甚至开辟了传说中的"香料古道"与外界通商。然而，这片沙海潜藏着无尽的杀机：夏季白天的极端高温足以烤熟一切，而流动的沙丘之下，则隐藏着能吞噬整个商队的巨型蚁狮巢穴与恐怖流沙。`
            },
            {
                name: '巨人霜原', x: 1334, y: 394,
                desc: `穿过世界之脊隘口，便进入了广阔的巨人霜原。这是一片被永久冻土覆盖的苔原地带，地表上散布着巨大的冰川和古代巨兽的骸骨，构成了一幅壮阔而荒凉的景观。这里是北方蛮人部落的核心活动区域，他们以氏族为单位，过着追随猛犸象等巨兽迁徙的半游牧狩猎生活。这些部落崇尚武力与荣耀，信奉战女神与祖先之魂，其历史与文化依靠名为"颂者"的吟游诗人以英雄史诗的形式口口相传。此地的经济完全基于生存与交换，部落间会用顶级毛皮、兽骨等战利品，前往龙喉要塞换取金属武器和盐等必需品。这片土地的生存环境极为严酷，夏季短暂且泥泞，冬季漫长而致命，食物短缺时常引发部落间的残酷战争，而潜伏在霜原上的雪人与巨人则是所有旅行者最危险的噩梦。`
            },
            {
                name: '龙喉火山带', x: 2061, y: 717,
                desc: `龙喉火山带位于沙漠的最东端，是一片由活火山、黑曜石山脉和熔岩流构成的地狱景象，空气中弥漫着刺鼻的硫磺味。这里不存在文明与社会，只有最赤裸的"生存法则"。能在此地活动的，唯有最亡命的矿工团体和最顶尖的冒险者，他们的目标是开采此地盛产的、能与魔法产生共鸣的稀有"龙血晶"。这里的经济完全是高风险的投机行为，由少数拥有强大后台的"矿业联盟"通过名为"黑铁小径"的秘密路线所控制。这片区域的危险是终极的：随时可能喷发的火山、栖息于此的成年红龙，以及遍布各处的火元素与熔岩魔像，构成了对所有闯入者的致命挑战。`
            },
            {
                name: '世界之脊隘口', x: 1370, y: 514,
                desc: `世界之脊隘口是隔绝大陆南北的巨大山脉中唯一可通行的区域，其本身就是一个至关重要的战略要地。这是一条常年被冰雪覆盖的险峻通道，两侧是万丈深渊与陡峭的冰壁，刺骨的强风终年不止。此地由一个独立且排外的矿人氏族——"守门人"世代看守，他们不效忠于任何王国，仅遵循与古龙订下的誓约来维护隘口的秩序。隘口的主要经济来源于向过往商队征收高昂的通行税，以及少量交易一种名为"冰铁"的稀有矿石。这种蕴含寒气的坚硬矿石是打造顶级武器的绝佳材料。"守门人"在隘口的核心位置建立了名为"龙喉要塞"的堡垒，作为其管辖中心。然而，通行此地不仅要面对矿人的规则，还需时刻警惕雪崩、冬季致命的"白鬼风暴"以及栖息于此的冰元素生物等永久性威胁。`
            },
        ];

        // 添加城市标记（简单标记）
        const simpleCities = [
            { name: "边境小镇", coords: [this.flipY(764), 1110], pic: "https://i.meee.com.tw/nZOsYkI.jpg", desc: "王国西方边境重要据点，依靠冒险者公会维持安全与繁荣。" },
            { name: "牧场", coords: [this.flipY(781), 1072], pic: "https://s21.ax1x.com/2025/10/15/pVqAAYt.png", desc: "家庭式牧场，母屋、牛棚与广阔牧草地。" },
            { name: "水之都", coords: [this.flipY(903), 1269], pic: "https://s21.ax1x.com/2025/10/15/pVqAiTA.png", desc: "建于古代堡垒遗迹上，白垩石城、水道运河与贡多拉城市画卷。" },
            { name: "王都", coords: [this.flipY(718), 1397], desc: "大陆中心的政治文化与商贸枢纽，城郭坚固，人文荟萃。" },
        ];

        simpleCities.forEach(city => {
            const imgHtml = city.pic ? `<br><img src="${city.pic}" style="width: 150px; height: auto; margin-top: 5px; cursor: pointer; border-radius: 6px;" onclick="window.showImage('${city.pic}')" />` : '';
            L.marker(city.coords)
                .addTo(this.map)
                .bindPopup(`
                    <div class="map-popup">
                        <div class="map-popup-header">${city.name}</div>
                        <div class="map-popup-body">${city.desc}${imgHtml}</div>
                    </div>
                `);
        });

        // 添加地点标记（带指针图标）
        enrichedPlaces.forEach(place => {
            const lat = this.flipY(place.y);
            const lng = place.x;
            const icon = placePointers[place.name];
            const img = placeImages[place.name];
            const imgHtml = img ? `<br><img src="${img}" style="width: 150px; height: auto; margin-top: 5px; cursor: pointer; border-radius: 6px;" onclick="window.showImage('${img}')" />` : '';

            if (icon) {
                L.marker([lat, lng], { icon })
                    .addTo(this.map)
                    .bindPopup(`
                        <div class="map-popup">
                            <div class="map-popup-body">${place.desc}${imgHtml}</div>
                        </div>
                    `);
            }
        });

        // 添加图片预览功能
        this.addImagePreviewFunctionality();
    }

    addImagePreviewFunctionality() {
        // 如果全局函数不存在，添加图片预览功能
        if (!window.showImage) {
            window.showImage = function (url) {
                // 移除现有的预览框
                const existingModal = document.getElementById('image-preview-modal');
                if (existingModal) {
                    existingModal.remove();
                }

                // 创建新的预览框
                const modal = document.createElement('div');
                modal.id = 'image-preview-modal';
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    cursor: pointer;
                `;

                const img = document.createElement('img');
                img.src = url;
                img.style.cssText = `
                    max-width: 90%;
                    max-height: 90%;
                    border-radius: 8px;
                    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
                `;

                modal.appendChild(img);
                modal.addEventListener('click', () => modal.remove());

                document.body.appendChild(modal);
            };
        }
    }

    addPlayerMarker() {
        const L = window.L;

        // 从 MVU 数据获取玩家位置
        const playerCoords = this.dataManager.SafeGetValue('主角.坐标', null);

        if (!playerCoords || !Array.isArray(playerCoords) || playerCoords.length < 2) {
            Logger.log('Player coordinates not found in MVU data, skipping player marker');
            // 不返回错误，继续渲染地图的其他部分
            return;
        }

        try {
            const playerIcon = L.icon({
                iconUrl: 'https://i.meee.com.tw/Zg45QC6.png',
                iconSize: [48, 48],
                iconAnchor: [24, 24],
            });

            const playerPos = [this.flipY(playerCoords[1]), playerCoords[0]];

            // 在创建标记前，再次验证坐标的有效性
            if (isNaN(playerPos[0]) || isNaN(playerPos[1])) {
                Logger.warn(`无效的玩家坐标，无法创建标记: ${playerPos}`);
                return;
            }

            // 保存玩家标记的引用，方便后续更新
            if (this.playerMarker) {
                this.map.removeLayer(this.playerMarker);
            }

            this.playerMarker = L.marker(playerPos, { icon: playerIcon, zIndexOffset: 1000 })
                .addTo(this.map)
                .bindPopup(`
                    <div style="padding: 8px;">
                        <strong>当前位置</strong><br>
                        你现在在这里！<br>
                        <span style="color: #888; font-size: 0.9em;">坐标: ${playerCoords[0]}, ${playerCoords[1]}</span>
                    </div>
                `);

            Logger.log(`Player marker added at: ${playerCoords[0]}, ${playerCoords[1]}`);
        } catch (error) {
            Logger.error('Failed to add player marker:', error);
            // 不抛出错误，继续渲染地图
        }
    }

    /**
     * 更新动态标记（玩家位置和位标）
     * 用于数据更新时刷新标记而不重新创建整个地图
     */
    updateDynamicMarkers() {
        if (!this.map) return;

        Logger.log('Updating dynamic markers...');

        // 移除旧的玩家标记
        if (this.playerMarker) {
            this.map.removeLayer(this.playerMarker);
            this.playerMarker = null;
        }

        // 移除旧的位标
        if (this.waypointMarkers && this.waypointMarkers.length > 0) {
            this.waypointMarkers.forEach(marker => {
                this.map.removeLayer(marker);
            });
            this.waypointMarkers = [];
        }

        // 重新添加玩家标记和位标
        this.addPlayerMarker();
        this.addWaypoints();

        Logger.log('Dynamic markers updated');
    }

    addWaypoints() {
        const L = window.L;

        // 位标图标
        const waypointIcons = {
            "战斗讨伐": L.icon({ iconUrl: 'https://s21.ax1x.com/2025/10/15/pVqAkFI.png', iconSize: [32, 32] }),
            "护卫运输": L.icon({ iconUrl: 'https://s21.ax1x.com/2025/10/15/pVqAPwd.png', iconSize: [32, 32] }),
            "探索采集": L.icon({ iconUrl: 'https://s21.ax1x.com/2025/10/15/pVqACeH.png', iconSize: [32, 32] }),
            "杂物": L.icon({ iconUrl: 'https://s21.ax1x.com/2025/10/15/pVqASyD.png', iconSize: [32, 32] }),
            "调查": L.icon({ iconUrl: 'https://s21.ax1x.com/2025/10/15/pVqApOe.png', iconSize: [32, 32] }),
            "default": L.icon({ iconUrl: 'https://s21.ax1x.com/2025/10/15/pVqASyD.png', iconSize: [32, 32] })
        };

        // 从 MVU 数据获取位标
        const waypoints = this.dataManager.SafeGetValue('地图位标', {});

        if (!waypoints || typeof waypoints !== 'object') {
            Logger.log('No waypoints found in MVU data');
            return;
        }

        // 过滤元数据键
        const waypointEntries = Object.entries(waypoints).filter(([key]) => !key.startsWith('$'));

        waypointEntries.forEach(([key, wp]) => {
            if (!wp) return;

            // 解析坐标（支持多种格式）
            let coordArray = this._parseCoordinates(wp.坐标 || wp.位置);

            if (!coordArray || coordArray.length < 2) {
                Logger.warn(`[MapView] 路径点 "${key}" 坐标格式无效: ${JSON.stringify(wp.坐标 || wp.位置)}`);
                return;
            }

            try {
                const coords = [this.flipY(coordArray[1]), coordArray[0]];
                const icon = waypointIcons[wp.类型] || waypointIcons["default"];
                const name = wp.名称 || '未命名位标';
                const type = wp.类型 || '未知';
                const desc = wp.概况 || '暂无说明';

                L.marker(coords, { icon })
                    .addTo(this.map)
                    .bindPopup(`
                        <div style="padding: 8px; min-width: 180px;">
                            <strong style="font-size: 1.1em;">${name}</strong><br>
                            <span style="color: #888; font-size: 0.9em;">类型: ${type}</span><br>
                            <span style="color: #666; margin-top: 4px; display: block;">${desc}</span>
                        </div>
                    `);
            } catch (error) {
                Logger.error(`[MapView] 添加路径点 "${key}" 失败:`, error);
            }
        });

        Logger.log(`Added ${waypointEntries.length} waypoints to map`);
    }

    /**
     * 解析坐标（支持多种格式）
     * @param {*} coord 坐标数据
     * @returns {Array|null} [lat, lng] 或 null
     */
    _parseCoordinates(coord) {
        if (!coord) return null;

        // 如果已经是有效的数组
        if (Array.isArray(coord)) {
            // 确保所有元素都是数字
            const numbers = coord.slice(0, 2).map(v => {
                if (typeof v === 'number') return v;
                if (typeof v === 'string') {
                    const parsed = parseFloat(v);
                    return isNaN(parsed) ? null : parsed;
                }
                return null;
            }).filter(v => v !== null);

            return numbers.length >= 2 ? numbers : null;
        }

        // 如果是字符串，尝试解析
        if (typeof coord === 'string') {
            try {
                // 移除括号和多余空格
                let cleaned = coord.replace(/[()]/g, '').trim();

                // 分割坐标（支持逗号或空格分隔）
                let parts = cleaned.split(/[,\s]+/).map(s => s.trim()).filter(s => s);

                // 转换为数字
                let numbers = parts.map(p => parseFloat(p)).filter(n => !isNaN(n));

                // 只取前两个有效数字
                return numbers.length >= 2 ? [numbers[0], numbers[1]] : null;
            } catch (e) {
                Logger.error('[MapView] 坐标解析失败:', e);
                return null;
            }
        }

        return null;
    }

    /**
     * 设置全屏地图的坐标显示
     */
    _setupFullscreenCoordinateDisplay() {
        const L = window.L;
        const overlay = window.parent.document.getElementById('fullscreen-coord-overlay');

        if (!overlay) return;

        this.fullscreenMap.on('mousemove', (e) => {
            const x = Math.round(e.latlng.lng);
            const y = Math.round(this.imageHeight - e.latlng.lat);
            overlay.textContent = `坐标: ${x}, ${y}`;
        });

        // 临时标记变量
        let tempMarker = null;

        this.fullscreenMap.on('click', (e) => {
            const x = Math.round(e.latlng.lng);
            const y = Math.round(this.imageHeight - e.latlng.lat);
            const lat = this.imageHeight - y;
            const lng = x;

            // 移除之前的临时标记
            if (tempMarker) {
                this.fullscreenMap.removeLayer(tempMarker);
            }

            // 创建新的临时标记
            tempMarker = L.marker([lat, lng]).addTo(this.fullscreenMap);
            const popupHtml = `
                <div style="padding: 8px;">
                    <strong>坐标</strong><br>
                    x=${x}, y=${y}<br>
                    <button onclick="navigator.clipboard.writeText('${x},${y}')" 
                            style="margin-top:6px;padding:4px 8px;border:1px solid #444;border-radius:4px;background:#eee;cursor:pointer;">
                        复制坐标
                    </button>
                </div>
            `;
            tempMarker.bindPopup(popupHtml).openPopup();

            // 10秒后自动移除
            setTimeout(() => {
                if (tempMarker) {
                    this.fullscreenMap.removeLayer(tempMarker);
                    tempMarker = null;
                }
            }, 10000);
        });
    }

    /**
     * 添加全屏地图的城市标记
     */
    _addFullscreenCityMarkers() {
        const L = window.L;

        // 地点插图
        const placeImages = {
            '碎冰北海': new URL('../../assets/location illustration_img/碎冰北海.png', import.meta.url).href,
            '西部边境': new URL('../../assets/location illustration_img/西部边境.png', import.meta.url).href,
            '灼热边疆': new URL('../../assets/location illustration_img/灼热边疆.png', import.meta.url).href,
            '边缘三角洲': new URL('../../assets/location illustration_img/边缘三角洲.png', import.meta.url).href,
            '沉没巨林': new URL('../../assets/location illustration_img/沉没巨林.png', import.meta.url).href,
            '沉没沼泽': new URL('../../assets/location illustration_img/沉没沼泽.png', import.meta.url).href,
            '低语山脉': new URL('../../assets/location illustration_img/低语山脉.png', import.meta.url).href,
            '静谧湖区': new URL('../../assets/location illustration_img/静谧湖区.png', import.meta.url).href,
            '巨木之森': new URL('../../assets/location illustration_img/巨木之森.png', import.meta.url).href,
            '破碎海岸': new URL('../../assets/location illustration_img/破碎海岸.png', import.meta.url).href,
            '伤痕平原': new URL('../../assets/location illustration_img/伤痕平原.png', import.meta.url).href,
            '炙热平原': new URL('../../assets/location illustration_img/炙热平原.png', import.meta.url).href,
            '北方林地': new URL('../../assets/location illustration_img/北方林地.png', import.meta.url).href,
            '缠绕沼泽': new URL('../../assets/location illustration_img/缠绕沼泽.png', import.meta.url).href,
            '丰饶大平原': new URL('../../assets/location illustration_img/丰饶大平原.png', import.meta.url).href,
            '黄金沙海': new URL('../../assets/location illustration_img/黄金沙海.png', import.meta.url).href,
            '巨人霜原': new URL('../../assets/location illustration_img/巨人霜原.png', import.meta.url).href,
            '龙喉火山带': new URL('../../assets/location illustration_img/龙喉火山带.png', import.meta.url).href,
            '世界之脊隘口': new URL('../../assets/location illustration_img/世界之脊隘口.png', import.meta.url).href,
        };

        // 地点指针（全屏模式下使用较小的图标）
        const pointerIcon = (url) => L.icon({
            iconUrl: url,
            iconSize: [42, 42], // 比普通地图小一些
            iconAnchor: [21, 21],
            popupAnchor: [0, -21],
        });

        const placePointers = {
            '北方林地': pointerIcon(new URL('../../assets/location pointer_img/北方林地地点指针.png', import.meta.url).href),
            '边缘三角洲': pointerIcon(new URL('../../assets/location pointer_img/边缘三角洲地点指针.png', import.meta.url).href),
            '缠绕沼泽': pointerIcon(new URL('../../assets/location pointer_img/缠绕沼泽地图指针.png', import.meta.url).href),
            '沉没巨林': pointerIcon(new URL('../../assets/location pointer_img/沉没巨林地图指针.png', import.meta.url).href),
            '沉没沼泽': pointerIcon(new URL('../../assets/location pointer_img/沉没沼泽地点指针.png', import.meta.url).href),
            '低语山脉': pointerIcon(new URL('../../assets/location pointer_img/低语山脉地图指针.png', import.meta.url).href),
            '丰饶大平原': pointerIcon(new URL('../../assets/location pointer_img/丰饶大平原地图指针.png', import.meta.url).href),
            '黄金沙海': pointerIcon(new URL('../../assets/location pointer_img/黄金沙海地图指针.png', import.meta.url).href),
            '静谧湖区': pointerIcon(new URL('../../assets/location pointer_img/静谧湖区地图指针.png', import.meta.url).href),
            '巨木之森': pointerIcon(new URL('../../assets/location pointer_img/巨木之森地点指针.png', import.meta.url).href),
            '巨人霜原': pointerIcon(new URL('../../assets/location pointer_img/巨人霜原地图指针.png', import.meta.url).href),
            '龙喉火山带': pointerIcon(new URL('../../assets/location pointer_img/龙喉火山带地图指针.png', import.meta.url).href),
            '破碎海岸': pointerIcon(new URL('../../assets/location pointer_img/破碎海岸地点指针.png', import.meta.url).href),
            '伤痕平原': pointerIcon(new URL('../../assets/location pointer_img/伤痕平原地点指针.png', import.meta.url).href),
            '世界之脊隘口': pointerIcon(new URL('../../assets/location pointer_img/世界之脊隘口地图指针.png', import.meta.url).href),
            '碎冰北海': pointerIcon(new URL('../../assets/location pointer_img/碎冰北海地图指针.png', import.meta.url).href),
            '西部边境': pointerIcon(new URL('../../assets/location pointer_img/西部边境地图指针.png', import.meta.url).href),
            '炙热平原': pointerIcon(new URL('../../assets/location pointer_img/炙热平原地点指针.png', import.meta.url).href),
            '灼热边疆': pointerIcon(new URL('../../assets/location pointer_img/灼热边疆地图指针.png', import.meta.url).href),
        };

        // 完整的地点数据（与普通地图相同）
        const enrichedPlaces = [
            { name: '碎冰北海', x: 1317, y: 315, desc: `碎冰北海是北方之地的尽头，一片终年漂浮着巨大浮冰的寒冷海洋...` },
            { name: '西部边境', x: 1150, y: 687, desc: `西部边境是中央王国以西的广阔未知区域...` },
            { name: '灼热边疆', x: 1694, y: 785, desc: `灼热边疆是文明王国与无垠沙海之间的交界地...` },
            { name: '边缘三角洲', x: 1445, y: 1220, desc: `边缘三角洲是大陆南部一个气候恶劣、局势混乱的交界地带...` },
            { name: '沉没巨林', x: 790, y: 835, desc: `沉没巨林是已知世界的西方尽头...` },
            { name: '沉没沼泽', x: 1255, y: 1153, desc: `从破碎海岸向内陆延伸，便是广阔的沉没沼泽...` },
            { name: '低语山脉', x: 906, y: 650, desc: `在伤痕平原以西，险峻的低语山脉高耸入云...` },
            { name: '静谧湖区', x: 1167, y: 990, desc: `静谧湖区是南方文明的摇篮与核心...` },
            { name: '巨木之森', x: 1506, y: 999, desc: `巨木之森是位于水乡东南部的一片广袤原始森林...` },
            { name: '破碎海岸', x: 1400, y: 1329, desc: `破碎海岸是大陆南部一条饱受"无尽之喉"风暴侵袭的漫长海岸线...` },
            { name: '伤痕平原', x: 984, y: 679, desc: `伤痕平原是位于中央王国边境的广阔前线...` },
            { name: '炙热平原', x: 1156, y: 1354, desc: `炙热平原位于沉没沼泽的更深处...` },
            { name: '北方林地', x: 1220, y: 561, desc: `北方林地是王国北部广阔的温带森林与山地...` },
            { name: '缠绕沼泽', x: 1133, y: 1058, desc: `缠绕沼泽是位于水乡西南的文明边缘地带...` },
            { name: '丰饶大平原', x: 1280, y: 725, desc: `环绕着王畿之心的丰饶大平原是王国名副其实的粮仓与畜栏...` },
            { name: '黄金沙海', x: 1883, y: 803, desc: `黄金沙海是东方沙漠的核心...` },
            { name: '巨人霜原', x: 1334, y: 394, desc: `穿过世界之脊隘口，便进入了广阔的巨人霜原...` },
            { name: '龙喉火山带', x: 2061, y: 717, desc: `龙喉火山带位于沙漠的最东端...` },
            { name: '世界之脊隘口', x: 1370, y: 514, desc: `世界之脊隘口是隔绝大陆南北的巨大山脉中唯一可通行的区域...` },
        ];

        // 简单城市标记
        const simpleCities = [
            { name: "边境小镇", coords: [this.flipY(764), 1110], pic: "https://i.meee.com.tw/nZOsYkI.jpg", desc: "王国西方边境重要据点，依靠冒险者公会维持安全与繁荣。" },
            { name: "牧场", coords: [this.flipY(781), 1072], pic: "https://s21.ax1x.com/2025/10/15/pVqAAYt.png", desc: "家庭式牧场，母屋、牛棚与广阔牧草地。" },
            { name: "水之都", coords: [this.flipY(903), 1269], pic: "https://s21.ax1x.com/2025/10/15/pVqAiTA.png", desc: "建于古代堡垒遗迹上，白垩石城、水道运河与贡多拉城市画卷。" },
            { name: "王都", coords: [this.flipY(718), 1397], desc: "大陆中心的政治文化与商贸枢纽，城郭坚固，人文荟萃。" },
        ];

        simpleCities.forEach(city => {
            const imgHtml = city.pic ? `<br><img src="${city.pic}" style="width: 150px; height: auto; margin-top: 5px; cursor: pointer; border-radius: 6px;" onclick="window.showImage('${city.pic}')" />` : '';
            L.marker(city.coords)
                .addTo(this.fullscreenMap)
                .bindPopup(`
                    <div class="map-popup">
                        <div class="map-popup-header">${city.name}</div>
                        <div class="map-popup-body">${city.desc}${imgHtml}</div>
                    </div>
                `);
        });

        enrichedPlaces.forEach(place => {
            const lat = this.flipY(place.y);
            const lng = place.x;
            const icon = placePointers[place.name];
            const img = placeImages[place.name];
            const imgHtml = img ? `<br><img src="${img}" style="width: 150px; height: auto; margin-top: 5px; cursor: pointer; border-radius: 6px;" onclick="window.showImage('${img}')" />` : '';

            if (icon) {
                L.marker([lat, lng], { icon })
                    .addTo(this.fullscreenMap)
                    .bindPopup(`
                        <div class="map-popup">
                            <div class="map-popup-body">${place.desc}${imgHtml}</div>
                        </div>
                    `);
            }
        });
    }

    /**
     * 添加全屏地图的玩家标记
     */
    _addFullscreenPlayerMarker() {
        const L = window.L;
        const playerCoords = this.dataManager.SafeGetValue('主角.坐标', null);

        if (!playerCoords || !Array.isArray(playerCoords) || playerCoords.length < 2) {
            Logger.log('[MapView] 全屏地图：玩家坐标未找到');
            return;
        }

        try {
            const playerIcon = L.icon({
                iconUrl: 'https://i.meee.com.tw/Zg45QC6.png',
                iconSize: [48, 48],
                iconAnchor: [24, 24],
            });

            const playerPos = [this.flipY(playerCoords[1]), playerCoords[0]];

            if (isNaN(playerPos[0]) || isNaN(playerPos[1])) {
                Logger.warn(`[MapView] 无效的玩家坐标: ${playerPos}`);
                return;
            }

            L.marker(playerPos, { icon: playerIcon, zIndexOffset: 1000, isPlayer: true })
                .addTo(this.fullscreenMap)
                .bindPopup(`
                    <div style="padding: 8px;">
                        <strong>当前位置</strong><br>
                        你现在在这里！<br>
                        <span style="color: #888; font-size: 0.9em;">坐标: ${playerCoords[0]}, ${playerCoords[1]}</span>
                    </div>
                `);

            Logger.log(`[MapView] 全屏地图：玩家标记已添加 (${playerCoords[0]}, ${playerCoords[1]})`);
        } catch (error) {
            Logger.error('[MapView] 添加全屏玩家标记失败:', error);
        }
    }

    /**
     * 添加全屏地图的位标
     */
    _addFullscreenWaypoints() {
        const L = window.L;

        const waypointIcons = {
            "战斗讨伐": L.icon({ iconUrl: 'https://s21.ax1x.com/2025/10/15/pVqAkFI.png', iconSize: [28, 28] }),
            "护卫运输": L.icon({ iconUrl: 'https://s21.ax1x.com/2025/10/15/pVqAPwd.png', iconSize: [28, 28] }),
            "探索采集": L.icon({ iconUrl: 'https://s21.ax1x.com/2025/10/15/pVqACeH.png', iconSize: [28, 28] }),
            "杂物": L.icon({ iconUrl: 'https://s21.ax1x.com/2025/10/15/pVqASyD.png', iconSize: [28, 28] }),
            "调查": L.icon({ iconUrl: 'https://s21.ax1x.com/2025/10/15/pVqApOe.png', iconSize: [28, 28] }),
            "default": L.icon({ iconUrl: 'https://s21.ax1x.com/2025/10/15/pVqASyD.png', iconSize: [28, 28] })
        };

        const waypoints = this.dataManager.SafeGetValue('地图位标', {});

        if (!waypoints || typeof waypoints !== 'object') {
            Logger.log('[MapView] 全屏地图：未找到位标数据');
            return;
        }

        const waypointEntries = Object.entries(waypoints).filter(([key]) => !key.startsWith('_'));

        waypointEntries.forEach(([key, wp]) => {
            if (!wp) return;

            let coordArray = this._parseCoordinates(wp.坐标 || wp.位置);

            if (!coordArray || coordArray.length < 2) {
                Logger.warn(`[MapView] 全屏地图：路径点 "${key}" 坐标无效`);
                return;
            }

            try {
                const coords = [this.flipY(coordArray[1]), coordArray[0]];
                const icon = waypointIcons[wp.类型] || waypointIcons["default"];
                const name = wp.名称 || '未命名位标';
                const type = wp.类型 || '未知';
                const desc = wp.概况 || '暂无说明';

                L.marker(coords, { icon })
                    .addTo(this.fullscreenMap)
                    .bindPopup(`
                        <div style="padding: 8px; min-width: 180px;">
                            <strong style="font-size: 1.1em;">${name}</strong><br>
                            <span style="color: #888; font-size: 0.9em;">类型: ${type}</span><br>
                            <span style="color: #666; margin-top: 4px; display: block;">${desc}</span>
                        </div>
                    `);
            } catch (error) {
                Logger.error(`[MapView] 全屏地图：添加路径点 "${key}" 失败:`, error);
            }
        });

        Logger.log(`[MapView] 全屏地图：已添加 ${waypointEntries.length} 个位标`);
    }

    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        if (this.fullscreenMap) {
            this.fullscreenMap.remove();
            this.fullscreenMap = null;
        }
    }
}
