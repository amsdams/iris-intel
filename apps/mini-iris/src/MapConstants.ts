export const COLORS = {
    E: '#00ff00',
    R: '#0000ff',
    M: '#ff0000',
    N: '#ffffff'
};

export const RARITY_COLORS: Record<string, string> = {
    'COMMON': '#49EBC3',
    'RARE': '#B68BFF',
    'VERY_RARE': '#F781FF'
};

export const ITEM_LEVEL_COLORS: Record<number, string> = {
    1: '#FECE5A', 2: '#FFA630', 3: '#FF7315', 4: '#E80000',
    5: '#FF0099', 6: '#EE26CD', 7: '#C124E0', 8: '#9627F4'
};

export const MAP_STYLES: Record<string, string[]> = {
    'Dark': [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
    ],
    'Light': [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'
    ],
    'Voyager': [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
    ],
    'OSM': [
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    ]
};
