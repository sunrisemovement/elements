declare global {
  interface CSSStyleSheet {
    replace(input: string): Promise<void>
  }
  interface ShadowRoot {
    adoptedStyleSheets?: Array<CSSStyleSheet>
  }
}

class Range implements Iterable<number> {
  constructor(
    private min: number,
    private max: number,
  ) {}

  *[Symbol.iterator]() {
    for (var i = this.min; i <= this.max; i++) {
      yield i
    }
  }
}

type Position = { x: number, y: number }

const radians = (degrees: number): number =>  degrees * (Math.PI/180)

const numTiles = (zoom: number): number => 2 ** zoom

const sec = (x: number): number => 1 / Math.cos(x)

const latLonToRelativePos = (lat: number, lon: number): Position => {
  const x = (lon + 180) / 360
  const y = (1 - Math.log(Math.tan(radians(lat)) + sec(radians(lat))) / Math.PI) / 2
  return { x, y }
}

const latLonToPos = (lat: number,lon: number, zoom: number): Position =>  {
  const n = numTiles(zoom)
  const { x, y } = latLonToRelativePos(lat, lon)
  return { x: n*x, y: n*y }
}

const tilePos = (lat: number, lon: number, zoom: number): Position => {
  const { x, y } = latLonToPos(lat, lon, zoom)
  return { x: Math.trunc(x), y: Math.trunc(y) }
}

const tileWidth = 256

const tileHeight = 256

const tileUrl = (x: number, y: number, z: number): string => {
  return `https://maps.wikimedia.org/osm-intl/${z}/${x}/${y}.png`
}

const create = async (lat: number, lon: number, zoom: number) => {
  const tilesX = 4
  const tilesY = 4
  const xRow = [...new Range(-Math.floor(tilesX / 2), Math.ceil(tilesX / 2))]
  const yRow = [...new Range(-Math.floor(tilesY / 2), Math.ceil(tilesY / 2))]
  const { x: xOffset, y: yOffset } = tilePos(lat, lon, zoom)
  const { x: xAbsolute, y: yAbsolute } = latLonToPos(lat, lon, zoom)
  const latCenterDiff = Math.trunc((xAbsolute - xOffset) * tileWidth)
  const lonCenterDiff = Math.trunc((yAbsolute - yOffset) * tileHeight)
  const tiles = []
  for (var y of yRow) {
    const row = []
    for (var x of xRow) {
      row.push({ x: xOffset + x, y: yOffset + y })
    }
    tiles.push(row)
  }
  const imageWidth = tilesX * tileWidth
  const imageHeight = tilesY * tileHeight
  const canvas = document.createElement('canvas')
  canvas.width = imageWidth
  canvas.height = imageHeight
  const context = canvas.getContext('2d') as CanvasRenderingContext2D
  context.fillStyle = '#fff'
  context.fillRect(0, 0, imageWidth, imageHeight)
  const promises: Array<Promise<any>> = []
  let rowOffset = 0
  for (let row of tiles) {
    let colOffset = 0
    for (let tile of row) {
      promises.push((async (tile, colOffset, rowOffset) => {
        const i = new Image()
        i.src = tileUrl(tile.x, tile.y, zoom)
        await i.decode()
        context.drawImage(i, colOffset * tileWidth - latCenterDiff, rowOffset * tileHeight - lonCenterDiff)
      })(tile, colOffset, rowOffset))
      colOffset++
    }
    rowOffset++
  }
  await Promise.all(promises)
  return canvas
}

const styles = `
  :host {
    display: block;
    height: 100%;
    width: 100%;
    min-width: 0;
    min-height: 0;
    position: relative;
    overflow: hidden;
  }

  canvas {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
  }

  .icon {
    width: 40px;
    height: 40px;
    fill: var(--icon-color);
    text-shadow: 0 1px 6px rgba(0,0,0,0.4);
    pointer-events: none !important;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translateX(-50%) translateY(-50%) translateY(-16px);
    filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.4));
  }
`

const icon: SVGElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
icon.classList.add('icon')
icon.setAttribute('viewBox', '0 0 24 24')
const path: SVGPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path')
path.setAttribute('d', 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z')
icon.appendChild(path)

export default class StaticMap extends HTMLElement {
  private renderRoot: ShadowRoot

  private constructor() {
    super()
    this.renderRoot = this.attachShadow({ mode: 'open' })
  }

  public get latitude(): number {
    return parseFloat(this.getAttribute('latitude') || '0') ||  0
  }
  public set latitude(input: number) {
    this.setAttribute('latitude', input.toString())
  }

  public get longitude(): number {
    return parseFloat(this.getAttribute('longitude') || '0') || 0
  }
  public set longitude(input: number) {
    this.setAttribute('longitude', input.toString())
  }

  public get zoom(): number {
    return parseInt(this.getAttribute('zoom') || '0') || 0
  }
  public set zoom(input: number) {
    this.setAttribute('zoom', Math.trunc(input).toString())
  }

  public get iconColor(): string {
    return this.getAttribute('icon-color') || 'black'
  }
  public set iconColor(input: string) {
    this.setAttribute('icon-color', input)
    this.applyIconColor()
  }
  private applyIconColor() {
    const icon = this.renderRoot.querySelector('.icon') as SVGElement
    icon.style.setProperty('--icon-color', this.iconColor)
  }

  async connectedCallback() {
    const canvas = await create(this.latitude, this.longitude, this.zoom)

    if (this.renderRoot.adoptedStyleSheets) {
      const sheet = new CSSStyleSheet()
      await sheet.replace(styles)
      this.renderRoot.adoptedStyleSheets = [ sheet ]
    } else {
      const styleNode = document.createElement('style')
      styleNode.textContent = styles
      this.renderRoot.appendChild(styleNode)
    }

    this.renderRoot.appendChild(canvas)
    this.renderRoot.appendChild(icon.cloneNode(true))
    this.applyIconColor()
  }
}