type ActionType =
  | 'event'
  | 'form'
  | 'campaign'

class Action {
  private constructor(
    private type: ActionType,
    private id: string
  ) {}

  public static parse(url: string): Action | null {
    try {
      const parsed = new URL(url)
      const segments = parsed.pathname.split('/')
      segments.shift()
      if (segments.length !== 2) return null
      let type: ActionType
      switch (segments[0]) {
        case 'events':
          type = 'event'
          break
        case 'forms':
          type = 'form'
          break
        default:
          return null
      }
      return new Action(type, segments[1])
    } catch {
      return null
    }
  }

  public containerId() {
    return `can-${this.type}-area-${this.id}`
  }

  public scriptUrl() {
    return `https://actionnetwork.org/widgets/v3/${this.type}/${this.id}?format=js&source=widget&style=full`
  }
}

export default class ActionNetwork extends HTMLElement {
  private _iframe: HTMLIFrameElement | null = null
  private _action: Action | null = null
  private _url: string | null = null

  public get action(): string | null {
    return this.getAttribute('action')
  }
  public set action(value: string | null) {
    if (typeof value !== 'string' || value !== null) return
    if (value === null) this.removeAttribute('action')
    else this.setAttribute('action', value)
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  protected attributeChangedCallback(name: string, _oldValue: any, newValue: any) {
    if (name === 'action' && typeof newValue === 'string') {
      this._action = Action.parse(newValue)
      if (this._action) window.requestAnimationFrame(() => this.setupIframe())
      else this.tearDownIframe()
    } else if (name === 'action') {
      this._action = null
      this.tearDownIframe()
    }
  }

  protected connectedCallback() {
    if (this.hasAttribute('action')) this._action = Action.parse(this.getAttribute('action')!)
    const style = document.createElement('style')
    style.textContent = hostStyle
    this.shadowRoot!.appendChild(style)
    this.setupIframe()
  }

  protected disconnectedCallback() {
    this.tearDownIframe()
  }

  private tearDownIframe() {
    if (this._iframe) {
      this.shadowRoot!.removeChild(this._iframe)
      this._iframe.removeEventListener('load', this.onIframeLoad)
      if (this._iframe.contentWindow) this._iframe.contentWindow.removeEventListener('message', this.onIframeMessage)
    }
    this._iframe = null
    if (this._url) URL.revokeObjectURL(this._url)
  }

  private setupIframe() {
    if (!this._action) return
    if (!this._iframe) {
      this._iframe = document.createElement('iframe')
      this.shadowRoot!.appendChild(this._iframe)
    }
    this._iframe.addEventListener('load', this.onIframeLoad)
    this._url = URL.createObjectURL(new Blob([makeIframeDoc(this._action)], { type: 'text/html' }))
    this._iframe.src = this._url
  }

  private onIframeLoad = () => {
    this._iframe!.contentWindow!.addEventListener('message', this.onIframeMessage)
  }

  private onIframeMessage = (e: MessageEvent) => {
    if (typeof e.data !== 'object' || Array.isArray(e.data) || e.data === null) return
    switch(e.data.type) {
      case 'resize': {
        this.resizeIframe()
        return
      }
      default: {
        return
      }
    }
  }

  private resizeIframe = () => {
    this._iframe!.style.height = this
      ._iframe!
      .contentDocument!
      .body
      .scrollHeight + 'px'
  }
}

const hostStyle = `
:host {
  display: block;
  overflow: auto;
  min-height: 0;
  height: auto;
}

iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: white;
}
`

const makeIframeDoc = (action: Action) => (
`<!DOCTYPE html>
<html>
<head>
  <link href="https://actionnetwork.org/css/style-embed-whitelabel-v3.css" rel="stylesheet" type="text/css" />
  <style>
    :root {
      --color-charcoal: rgb(51, 52, 46);
      --color-charcoal-60pct: rgba(51, 52, 46, 0.6);
      --color-charcoal-40pct: rgba(51, 52, 46, 0.4);
      --color-yellow: #ffde16;
    }
    * { box-sizing: inherit; }
    html {
      font-family: Source Sans Pro;
      box-sizing: border-box;
      color: var(--color-charcoal);
    }
    body {
      margin: 0;
    }
    h2 {
      text-transform: uppercase !important;
    }
    .can_button,
    #can_embed_form input[type=submit],
    #can_embed_form .button,
    #donate_auto_modal input[type=submit],
    #donate_auto_modal .button {
      padding: 12px 16px;
      background-color: var(--color-yellow);
      color: var(--color-charcoal);
      font-weight: 700; 
    }
    .can_button:hover,
    #can_embed_form input[type=submit]:hover,
    #can_embed_form .button:hover,
    #donate_auto_modal input[type=submit]:hover,
    #donate_auto_modal .button:hover {
      background-color: var(--color-yellow);
      color: var(--color-charcoal);
    }
  </style>
  <script src="${action.scriptUrl()}" async></script>
</head>
<body>
  <div class="sunrise-action-network-container" id="${action.containerId()}"></div>
  <script>
    window.addEventListener('resize', () => {
      requestAnimationFrame(() => {
        const form = document.getElementById('can_embed_form')
        form && form.classList.toggle('can_768', window.innerWidth >= 768)
      })
    })
    window.addEventListener('can_embed_loaded', () => {
      window.postMessage({ type: 'resize' }, '${window.location.origin}')
    })
    const observer = new MutationObserver(() => {
      window.postMessage({ type: 'resize' }, '${window.location.origin}')
    })
    observer.observe(document.body, { attributes: true, childList: true, subtree: true })
  </script>
</body>
</html>
`
)