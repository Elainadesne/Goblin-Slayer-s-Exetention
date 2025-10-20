/**
 * RadarChart - SVG雷达图生成工具类
 * 用于生成六边形能力雷达图的可视化
 */
class RadarChart {
    /**
     * 创建雷达图实例
     * @param {Object} options - 配置选项
     * @param {number} options.size - 图表大小（默认 300）
     * @param {number} options.levels - 网格层数（默认 5）
     * @param {number} options.maxValue - 最大值（默认 20）
     * @param {string} options.fillColor - 填充颜色
     * @param {string} options.strokeColor - 边框颜色
     * @param {number} options.fillOpacity - 填充透明度（默认 0.3）
     * @param {number} options.labelOffset - 标签偏移距离（默认 20）
     */
    constructor(options = {}) {
        this.size = options.size || 300;
        this.levels = options.levels || 5;
        this.maxValue = options.maxValue || 20;
        this.fillColor = options.fillColor || 'var(--accent-blue)';
        this.strokeColor = options.strokeColor || 'var(--accent-blue)';
        this.fillOpacity = options.fillOpacity || 0.3;
        this.labelOffset = options.labelOffset || 20;
        
        // 计算中心点和半径
        this.centerX = this.size / 2;
        this.centerY = this.size / 2;
        this.radius = (this.size / 2) - 60; // 留出标签空间
    }

    /**
     * 生成雷达图 SVG HTML
     * @param {Object} data - 能力值数据
     * @param {number} data.力量
     * @param {number} data.敏捷
     * @param {number} data.感知
     * @param {number} data.知识
     * @param {number} data.魅力
     * @param {number} data.魔力 - 魔力或信仰力
     * @returns {string} SVG HTML 字符串
     */
    render(data) {
        // 定义六个维度（顺序很重要）
        const dimensions = ['力量', '敏捷', '感知', '知识', '魅力', '魔力'];
        
        // 归一化数据
        const values = dimensions.map(dim => {
            const value = data[dim] || 0;
            return Math.min(value / this.maxValue, 1); // 归一化到 0-1
        });
        
        // 生成 aria-label 描述
        const ariaLabel = `角色能力雷达图：${dimensions.map((d, i) => `${d} ${data[d] || 0}`).join('，')}`;
        
        // 生成 SVG
        return `
            <svg class="radar-chart" 
                 width="${this.size}" 
                 height="${this.size}"
                 viewBox="0 0 ${this.size} ${this.size}"
                 role="img"
                 aria-label="${ariaLabel}">
                
                <!-- 背景网格 -->
                ${this._renderGrid(dimensions.length)}
                
                <!-- 数据区域 -->
                ${this._renderDataArea(values, dimensions.length)}
                
                <!-- 轴线 -->
                ${this._renderAxes(dimensions.length)}
                
                <!-- 标签和数值 -->
                ${this._renderLabels(dimensions, data)}
            </svg>
        `;
    }

    /**
     * 渲染背景网格
     * @param {number} sides - 多边形边数
     * @returns {string} 网格 SVG HTML
     */
    _renderGrid(sides) {
        let html = '';
        
        // 绘制多层网格
        for (let level = 1; level <= this.levels; level++) {
            const r = (this.radius / this.levels) * level;
            const points = this._getPolygonPoints(sides, r);
            
            html += `
                <polygon 
                    class="radar-grid-line"
                    points="${points}"
                    fill="none"
                    stroke="var(--container-border)"
                    stroke-width="1"
                    opacity="0.3"
                />
            `;
        }
        
        return html;
    }

    /**
     * 渲染数据区域
     * @param {number[]} values - 归一化后的数值数组（0-1）
     * @param {number} sides - 多边形边数
     * @returns {string} 数据区域 SVG HTML
     */
    _renderDataArea(values, sides) {
        const points = values.map((value, i) => {
            const angle = (Math.PI * 2 / sides) * i - Math.PI / 2; // 从顶部开始
            const r = this.radius * value;
            const x = this.centerX + r * Math.cos(angle);
            const y = this.centerY + r * Math.sin(angle);
            return `${x},${y}`;
        }).join(' ');
        
        // 生成数据点的 HTML
        const dataPoints = values.map((value, i) => {
            const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
            const r = this.radius * value;
            const x = this.centerX + r * Math.cos(angle);
            const y = this.centerY + r * Math.sin(angle);
            
            return `
                <circle 
                    class="radar-data-point"
                    cx="${x}" 
                    cy="${y}" 
                    r="4"
                    fill="${this.strokeColor}"
                    stroke="white"
                    stroke-width="2"
                />
            `;
        }).join('');
        
        return `
            <!-- 填充区域 -->
            <polygon 
                class="radar-data-fill"
                points="${points}"
                fill="${this.fillColor}"
                fill-opacity="${this.fillOpacity}"
                stroke="${this.strokeColor}"
                stroke-width="2"
            />
            
            <!-- 数据点 -->
            ${dataPoints}
        `;
    }

    /**
     * 渲染轴线
     * @param {number} sides - 多边形边数
     * @returns {string} 轴线 SVG HTML
     */
    _renderAxes(sides) {
        let html = '';
        
        for (let i = 0; i < sides; i++) {
            const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
            const x = this.centerX + this.radius * Math.cos(angle);
            const y = this.centerY + this.radius * Math.sin(angle);
            
            html += `
                <line 
                    class="radar-axis"
                    x1="${this.centerX}" 
                    y1="${this.centerY}" 
                    x2="${x}" 
                    y2="${y}"
                    stroke="var(--container-border)"
                    stroke-width="1"
                    opacity="0.5"
                />
            `;
        }
        
        return html;
    }

    /**
     * 渲染标签和数值
     * @param {string[]} dimensions - 维度名称数组
     * @param {Object} data - 原始数据对象
     * @returns {string} 标签 SVG HTML
     */
    _renderLabels(dimensions, data) {
        const sides = dimensions.length;
        
        return dimensions.map((label, i) => {
            const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
            const labelRadius = this.radius + this.labelOffset;
            const x = this.centerX + labelRadius * Math.cos(angle);
            const y = this.centerY + labelRadius * Math.sin(angle);
            
            // 根据位置调整文本锚点
            let textAnchor = 'middle';
            if (x < this.centerX - 5) textAnchor = 'end';
            if (x > this.centerX + 5) textAnchor = 'start';
            
            const value = data[label] || 0;
            
            return `
                <g class="radar-label-group">
                    <!-- 标签文本 -->
                    <text 
                        class="radar-label"
                        x="${x}" 
                        y="${y - 5}"
                        text-anchor="${textAnchor}"
                        fill="var(--primary-text-color)"
                        font-size="14"
                        font-weight="600"
                    >${label}</text>
                    
                    <!-- 数值文本 -->
                    <text 
                        class="radar-value"
                        x="${x}" 
                        y="${y + 10}"
                        text-anchor="${textAnchor}"
                        fill="var(--accent-blue)"
                        font-size="16"
                        font-weight="700"
                    >${value}</text>
                </g>
            `;
        }).join('');
    }

    /**
     * 获取正多边形的点坐标
     * @param {number} sides - 多边形边数
     * @param {number} radius - 半径
     * @returns {string} 点坐标字符串（格式：x1,y1 x2,y2 ...）
     */
    _getPolygonPoints(sides, radius) {
        const points = [];
        for (let i = 0; i < sides; i++) {
            const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
            const x = this.centerX + radius * Math.cos(angle);
            const y = this.centerY + radius * Math.sin(angle);
            points.push(`${x},${y}`);
        }
        return points.join(' ');
    }

    /**
     * 计算合适的最大值（动态刻度）
     * @param {Object} data - 能力值数据对象
     * @returns {number} 计算出的最大值
     */
    static calculateMaxValue(data) {
        const values = Object.values(data).filter(v => typeof v === 'number' && !isNaN(v) && v >= 0);
        if (values.length === 0) return 20;
        
        const max = Math.max(...values);
        
        // 向上取整到合适的刻度
        if (max <= 10) return 10;
        if (max <= 20) return 20;
        if (max <= 30) return 30;
        if (max <= 50) return 50;
        return Math.ceil(max / 10) * 10;
    }
}

export { RadarChart };
