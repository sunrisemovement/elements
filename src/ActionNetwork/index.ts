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
        case 'event_campaigns':
          type = 'campaign'
          break
        default:
          return null
      }
      return new Action(type, segments[1])
    } catch {
      return null
    }
  }

  public containerId(): string {
    return `can-${this.linkType()}-area-${this.id}`
  }

  public scriptUrl(layout: Layout): string {
    const url = new URL(`https://actionnetwork.org/widgets/v3/${this.linkType()}/${this.id}`)
    url.searchParams.append('format', 'js')
    url.searchParams.append('source', 'widget')
    if (layout === 'full') url.searchParams.append('style', 'full')
    return url.href
  }

  public containerClass(): string {
    return this.type
  }

  private linkType(): string {
    switch (this.type) {
      case 'event':
        return 'event'
      case 'form':
        return 'form'
      case 'campaign':
        return 'event_campaign'
    }
  }
}

export type Layout =
  | 'standard'
  | 'full'

export type Theme =
  | 'light'
  | 'dark'

export default class ActionNetwork extends HTMLElement {
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

  public get layout(): Layout {
    const attribute = this.getAttribute('layout')
    if (attribute === 'full' || attribute === 'standard') return attribute
    else return 'standard'
  }
  public set layout(value: Layout) {
    if (value !== 'standard' && value !== 'full') this.setAttribute('layout', 'standard')
    else this.setAttribute('layout', value)
  }

  public get theme(): Theme {
    const attribute = this.getAttribute('theme')
    if (attribute === 'dark' || attribute === 'light') return attribute
    else return 'light'
  }
  public set theme(value: Theme) {
    if (value !== 'dark' && value !== 'light') this.setAttribute('theme', 'light')
    else this.setAttribute('theme', value)
  }

  protected attributeChangedCallback(name: string, _oldValue: any, newValue: any) {
    if (name === 'action' && typeof newValue === 'string') {
      this._action = Action.parse(newValue)
    } else if (name === 'action') {
      this._action = null
    }
  }

  protected connectedCallback() {
    if (this.hasAttribute('action')) this._action = Action.parse(this.getAttribute('action')!)
    if (!this._action) return

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.type = 'text/css'
    link.href = 'https://actionnetwork.org/css/style-embed-whitelabel-v3.css'
    this.appendChild(link)

    const style = document.createElement('style')
    style.textContent = createStyle(this._action.containerId())
    this.appendChild(style)

    const script = document.createElement('script')
    script.async = true
    script.src = this._action.scriptUrl(this.layout)
    this.appendChild(script)

    const div = document.createElement('div')
    div.id = this._action.containerId()
    div.className = this._action.containerClass() + ' ' + this.theme
    this.appendChild(div)

    this.style.display = 'block'
  }

  protected disconnectedCallback() {
    this.innerHTML = ''
  }
}

const createStyle = (id: string) => `
#${id} {
  --color-charcoal: rgb(51, 52, 46);
  --color-charcoal-60pct: rgba(51, 52, 46, 0.6);
  --color-charcoal-40pct: rgba(51, 52, 46, 0.4);
  --color-yellow: #ffde16;
  --color-yellow-lightened: #fff095;

  display: block;
  overflow: auto;
  min-height: 0;
  height: auto;
  font-family: Source Sans Pro;
  box-sizing: border-box;
  padding: 16px;
}

#${id} * {
  box-sizing: border-box;
  font-family: Source Sans Pro;
}

/* Theme */

#${id}.light {
  background-color: #ffffff;
  color: var(--color-charcoal);
}

#${id}.dark {
  background-color: #121212;
  color: rgba(255,255,255,0.87);
}

#${id}.dark #can_embed_form #action_welcome_message #action_welcome_message_inner {
  background-color: #121212;
  border-color: #696969;
}

#${id}.dark #can_embed_form #can_main_col #action_info #action_info_inner {
  background-color: #333333;
  border-color: #696969;
}

#${id}.dark h2 {
  color: rgba(255,255,255,0.87) !important;
}

/* Defaults */

#${id} h2 {
  text-transform: uppercase !important;
  text-align: center;
  text-shadow: none;
}

#${id} #can_embed_form h4,
#${id} #can_embed_form_inner h4 {
  color: inherit;
  font-family: inherit;
}

#${id} a {
  color: inherit;
}
#${id} a:hover {
  text-decoration: underline;
}

#${id} #can_embed_form .can_select {
  color: #434343;
}

#${id} #can_embed_form input.floatlabel-input {
  padding-top: 6px;
  height: 52px;
}

#${id} #can_embed_form label.floatlabel-label-active {
  top: 0;
}

#${id} .can_button,
#${id} #can_embed_form input[type=submit],
#${id} #can_embed_form .button,
#${id} #can_embed_form #can_zip_search input[type=submit],
#${id} #donate_auto_modal input[type=submit],
#${id} #donate_auto_modal .button {
  padding: 12px 16px;
  font-weight: 700;
  background-color: var(--color-yellow);
  color: var(--color-charcoal);
  height: 52px;
}
#${id} #can_embed_form input[type="submit"]:hover,
#${id} #can_embed_form .button:hover,
#${id} #donate_auto_modal input[type="submit"]:hover,
#${id} #donate_auto_modal .button:hover,
#${id} #can_embed_form input[type="submit"]:active,
#${id} #can_embed_form .button:active,
#${id} #donate_auto_modal input[type="submit"]:active,
#${id} #donate_auto_modal .button:active {
  background-color: var(--color-yellow-lightened) !important;
  color: var(--color-charcoal) !important;
}

#${id} #can_embed_form #search_location_list ul li .button {
  padding: 8px 12px;
}

/* Events */

#${id}.event #can_embed_form.can_float #form_col1,
#${id}.campaign #can_embed_form.can_float #new_rsvp #form_col1 {
  width: 100%;
  float: none;
  display: grid;
  grid-auto-flow: dense;
  grid-template-columns: 1fr minmax(0, 1fr);
  grid-template-rows: auto;
  grid-column-gap: 16px;
}
#${id}.event #can_embed_form.can_float #form_col2,
#${id}.campaign #can_embed_form.can_float #new_rsvp #form_col2 {
  width: calc(50% - 8px);
  float: none;
  margin: 0 auto;
}
#${id}.event #can_embed_form .form_builder_output,
#${id}.campaign #can_embed_form #new_rsvp .form_builder_output {
  display: none;
}
#${id}.event #can_embed_form .international_link-wrap[style],
#${id}.campaign #can_embed_form #new_rsvp .international_link-wrap[style] {
  display: none !important;
}
#${id}.event #can_embed_form #action_welcome_message,
#${id}.campaign #can_embed_form #new_rsvp #action_welcome_message {
  grid-column: 1 / -1;
}

/* Event Campaigns */

#${id}.campaign #can_embed_form.can_768 #form_col1 {
  width: 64%;
}

#${id}.campaign #can_embed_form.can_768 #form_col3 {
  width: 32%;
}

#${id}.campaign #can_embed_form #form_col4,
#${id}.campaign #can_embed_form #form_col2 {
  display: none;
}

#${id}.campaign #can_embed_form #form_col1 {
  width: 100%;
}
`