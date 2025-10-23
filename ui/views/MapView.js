import { Logger } from '../../core/logger.js';

export class MapView {
    constructor(dataManager, elements) {
        this.dataManager = dataManager;
        this.elements = elements;
        this.map = null;
        this.imageWidth = 2695;
        this.imageHeight = 1840;
        this.baseMapUrl = 'https://files.catbox.moe/afahhd.png';
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

        // 地点插图
        const placeImages = {
            '碎冰北海': 'https://files.catbox.moe/3xuoni.png',
            '西部边境': 'https://files.catbox.moe/94kllp.png',
            '灼热边疆': 'https://files.catbox.moe/l3nguw.png',
            '边缘三角洲': 'https://files.catbox.moe/3t8ww3.png',
            '沉没巨林': 'https://files.catbox.moe/tx1k8t.png',
            '沉没沼泽': 'https://files.catbox.moe/narfy5.png',
            '低语山脉': 'https://files.catbox.moe/ahrroc.png',
            '静谧湖区': 'https://files.catbox.moe/arxzel.png',
            '巨木之森': 'https://files.catbox.moe/30wtsl.png',
            '破碎海岸': 'https://files.catbox.moe/bec52o.png',
            '伤痕平原': 'https://files.catbox.moe/gfzgz1.png',
            '炙热平原': 'https://files.catbox.moe/ocvl6g.png',
            '北方林地': 'https://files.catbox.moe/ihgri0.png',
            '缠绕沼泽': 'https://files.catbox.moe/4702di.png',
            '丰饶大平原': 'https://files.catbox.moe/6z9a04.png',
            '黄金沙海': 'https://files.catbox.moe/fxui8u.png',
            '巨人霜原': 'https://files.catbox.moe/wea3u7.png',
            '龙喉火山带': 'https://files.catbox.moe/zyhy2x.png',
            '世界之脊隘口': 'https://files.catbox.moe/qe8p48.png',
        };

        // 地点指针
        const pointerIcon = (url) => L.icon({
            iconUrl: url,
            iconSize: [56, 56],
            iconAnchor: [28, 28],
            popupAnchor: [0, -28],
        });

        const placePointers = {
            '北方林地': pointerIcon('https://files.catbox.moe/hxkgca.png'),
            '边缘三角洲': pointerIcon('https://files.catbox.moe/tsimst.png'),
            '缠绕沼泽': pointerIcon('https://files.catbox.moe/kv5tsm.png'),
            '沉没巨林': pointerIcon('https://files.catbox.moe/tsqf12.png'),
            '沉没沼泽': pointerIcon('https://files.catbox.moe/zbh718.png'),
            '低语山脉': pointerIcon('https://files.catbox.moe/yp6dh4.png'),
            '丰饶大平原': pointerIcon('https://files.catbox.moe/k76rln.png'),
            '黄金沙海': pointerIcon('https://files.catbox.moe/dvxfm8.png'),
            '静谧湖区': pointerIcon('https://files.catbox.moe/dnnxzh.png'),
            '巨木之森': pointerIcon('https://files.catbox.moe/6zpz35.png'),
            '巨人霜原': pointerIcon('https://files.catbox.moe/p803k4.png'),
            '龙喉火山带': pointerIcon('https://files.catbox.moe/9bvy2w.png'),
            '破碎海岸': pointerIcon('https://files.catbox.moe/0a3vuk.png'),
            '伤痕平原': pointerIcon('https://files.catbox.moe/e864fe.png'),
            '世界之脊隘口': pointerIcon('https://files.catbox.moe/s5p8y9.png'),
            '碎冰北海': pointerIcon('https://files.catbox.moe/05bpgk.png'),
            '西部边境': pointerIcon('https://files.catbox.moe/g0jva2.png'),
            '炙热平原': pointerIcon('https://files.catbox.moe/ktpzzx.png'),
            '灼热边疆': pointerIcon('https://files.catbox.moe/srvwns.png'),
        };

        // 完整的地点数据
        const enrichedPlaces = [
            {
                name: '碎冰北海', x: 1317, y: 315,
                desc: `碎冰北海是北方之地的尽头，一片终年漂浮着巨大浮冰的寒冷海洋。其海岸线犬牙交错，布满了险峻的峡湾和黑色的火山岩海滩，环境恶劣。生活在此地的北方人被称为"海狼"，他们是技艺最高超的水手和最凶猛的海盗。`
            },
            {
                name: '西部边境', x: 1150, y: 687,
                desc: `西部边境是中央王国以西的广阔未知区域，一片机遇与致命危险并存的严酷土地。越向西行，就越是远离人烟，也越是凶险。`
            },
            {
                name: '灼热边疆', x: 1694, y: 785,
                desc: `灼热边疆是文明王国与无垠沙海之间的交界地，一片由干涸河床、龟裂红土与黑色戈壁构成的荒凉地带。`
            },
            {
                name: '边缘三角洲', x: 1445, y: 1220,
                desc: `边缘三角洲是大陆南部一个气候恶劣、局势混乱的交界地带。它位于破碎海岸、沉没沼泽与炙热平原三者之间。`
            },
            {
                name: '沉没巨林', x: 790, y: 835,
                desc: `沉没巨林是已知世界的西方尽头，一片被无尽沼泽所侵蚀的原始巨木森林。巨大的树冠遮天蔽日，林下终年阴暗潮湿。`
            },
            {
                name: '沉没沼泽', x: 1255, y: 1153,
                desc: `从破碎海岸向内陆延伸，便是广阔的沉没沼泽。这是一片亚热带风格的湿地，河网密布，盘根错节的古老树木遮天蔽日。`
            },
            {
                name: '低语山脉', x: 906, y: 650,
                desc: `在伤痕平原以西，险峻的低语山脉高耸入云。风穿过山体上无数被侵蚀出的孔洞，发出如同鬼魅低语般的诡异呼啸。`
            },
            {
                name: '静谧湖区', x: 1167, y: 990,
                desc: `静谧湖区是南方文明的摇篮与核心，一片环绕着大陆南部巨湖"澄镜湖"的富饶地带。`
            },
            {
                name: '巨木之森', x: 1506, y: 999,
                desc: `巨木之森是位于水乡东南部的一片广袤原始森林，林内参天古木遮天蔽日，光线昏暗，充满了神秘与未知。`
            },
            {
                name: '破碎海岸', x: 1400, y: 1329,
                desc: `破碎海岸是大陆南部一条饱受"无尽之喉"风暴侵袭的漫长海岸线。`
            },
            {
                name: '伤痕平原', x: 984, y: 679,
                desc: `伤痕平原是位于中央王国边境的广阔前线，一片被无尽冲突撕裂的丘陵地带。`
            },
            {
                name: '炙热平原', x: 1156, y: 1354,
                desc: `炙热平原位于沉没沼泽的更深处，远离了海岸潮湿的空气，气候变得炎热而干燥。`
            },
            {
                name: '北方林地', x: 1220, y: 561,
                desc: `北方林地是王国北部广阔的温带森林与山地，地势复杂，民风坚韧而独立。`
            },
            {
                name: '缠绕沼泽', x: 1133, y: 1058,
                desc: `缠绕沼泽是位于水乡西南的文明边缘地带，一片广阔、泥泞且充满瘴气的湿地。`
            },
            {
                name: '丰饶大平原', x: 1280, y: 725,
                desc: `环绕着王畿之心的丰饶大平原是王国名副其实的粮仓与畜栏。`
            },
            {
                name: '黄金沙海', x: 1883, y: 803,
                desc: `黄金沙海是东方沙漠的核心，一片由连绵不绝的巨大沙丘组成的无垠海洋。`
            },
            {
                name: '巨人霜原', x: 1334, y: 394,
                desc: `穿过世界之脊隘口，便进入了广阔的巨人霜原。这是一片被永久冻土覆盖的苔原地带。`
            },
            {
                name: '龙喉火山带', x: 2061, y: 717,
                desc: `龙喉火山带位于沙漠的最东端，是一片由活火山、黑曜石山脉和熔岩流构成的地狱景象。`
            },
            {
                name: '世界之脊隘口', x: 1370, y: 514,
                desc: `世界之脊隘口是隔绝大陆南北的巨大山脉中唯一可通行的区域，其本身就是一个至关重要的战略要地。`
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
            const imgHtml = city.pic ? `<br><img src="${city.pic}" style="width: 150px; height: auto; margin-top: 5px; cursor: pointer; border-radius: 6px;" onclick="window.open('${city.pic}', '_blank')" />` : '';
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
            const imgHtml = img ? `<br><img src="${img}" style="width: 150px; height: auto; margin-top: 5px; cursor: pointer; border-radius: 6px;" onclick="window.open('${img}', '_blank')" />` : '';

            if (icon) {
                L.marker([lat, lng], { icon })
                    .addTo(this.map)
                    .bindPopup(`
                        <div class="map-popup">
                            <div class="map-popup-header">${place.name}</div>
                            <div class="map-popup-body">${place.desc}${imgHtml}</div>
                        </div>
                    `);
            }
        });
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
            if (!wp || !Array.isArray(wp.坐标) || wp.坐标.length < 2) return;

            const coords = [this.flipY(wp.坐标[1]), wp.坐标[0]];
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
        });

        Logger.log(`Added ${waypointEntries.length} waypoints to map`);
    }

    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }
}
