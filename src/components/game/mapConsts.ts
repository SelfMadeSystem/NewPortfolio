import gameMap from '../../assets/game/map.svg?raw';

const width = gameMap.match(/<svg[^>]*\swidth="([^"]+)"/)?.[1];
const height = gameMap.match(/<svg[^>]*\sheight="([^"]+)"/)?.[1];
const viewBox = gameMap.match(/<svg[^>]*\sviewBox="([^"]+)"/)?.[1];

export const MAP_WIDTH = width ? parseFloat(width) : 6400;
export const MAP_HEIGHT = height ? parseFloat(height) : 3200;
export const MAP_VIEWBOX = viewBox ? viewBox : `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`;
export const MAP_SVG_CONTENT = gameMap;
