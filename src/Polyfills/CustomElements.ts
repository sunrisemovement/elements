if (typeof window.customElements === 'undefined' && document.currentScript) {
  const script = document.createElement('script')
  script.src = 'https://unpkg.com/@webcomponents/custom-elements'
  document.currentScript.insertAdjacentElement('afterend', script)
}