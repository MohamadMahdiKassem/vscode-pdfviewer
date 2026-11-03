"use strict";

(function () {
  function loadConfig() {
    const elem = document.getElementById('pdf-preview-config')
    if (elem) {
      return JSON.parse(elem.getAttribute('data-config'))
    }
    throw new Error('Could not load configuration.')
  }
  function cursorTools(name) {
    if (name === 'hand') {
      return 1
    }
    return 0
  }
  function scrollMode(name) {
    switch (name) {
      case 'vertical':
        return 0
      case 'horizontal':
        return 1
      case 'wrapped':
        return 2
      default:
        return -1
    }
  }
  function spreadMode(name) {
    switch (name) {
      case 'none':
        return 0
      case 'odd':
        return 1
      case 'even':
        return 2
      default:
        return -1
    }
  }
  // Remembers the toggle while the tab is open; VS Code reloads the webview when the tab is hidden
  const vscodeApi = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null
  function setFieldNamesVisible(visible) {
    document.body.classList.toggle('showFieldNames', visible)
    const button = document.getElementById('toggleFieldNames')
    button.classList.toggle('toggled', visible)
    button.setAttribute('aria-pressed', String(visible))
    if (vscodeApi) {
      vscodeApi.setState({ ...vscodeApi.getState(), showFieldNames: visible })
    }
  }
  // Labels each form field with its key (the AcroForm field name)
  async function addFieldNameLabels({ source }) {
    const layer = source.div.querySelector('.annotationLayer')
    if (!layer) {
      return
    }
    const annotations = await source.pdfPage.getAnnotations()
    for (const annotation of annotations) {
      if (!annotation.fieldName) {
        continue
      }
      const section = layer.querySelector(`[data-annotation-id="${CSS.escape(annotation.id)}"]`)
      if (!section || section.querySelector('.fieldNameLabel')) {
        continue
      }
      const label = document.createElement('span')
      label.className = 'fieldNameLabel'
      label.textContent = annotation.fieldName
      section.appendChild(label)
    }
    applyFieldNameFilter()
  }
  // Key search: hides labels whose key doesn't contain the text; Enter and Shift+Enter jump between matches
  let fieldWidgets = []
  let searchText = ''
  let matches = []
  let matchIndex = -1
  function applyFieldNameFilter() {
    const currentId = matchIndex >= 0 ? matches[matchIndex].id : null
    for (const label of document.querySelectorAll('.fieldNameLabel')) {
      label.classList.toggle('filteredOut', !label.textContent.toLowerCase().includes(searchText))
      label.classList.toggle('currentMatch', label.parentElement.dataset.annotationId === currentId)
    }
    let count = ''
    if (searchText && matches.length === 0) {
      count = 'No matches'
    } else if (matchIndex >= 0) {
      count = `${matchIndex + 1} of ${matches.length}`
    } else if (searchText) {
      count = `${matches.length} matches`
    }
    document.getElementById('fieldNameSearchCount').textContent = count
  }
  function searchFieldNames(text) {
    searchText = text.trim().toLowerCase()
    matches = searchText ? fieldWidgets.filter((widget) => widget.name.toLowerCase().includes(searchText)) : []
    matchIndex = -1
    if (searchText) {
      setFieldNamesVisible(true)
    }
    applyFieldNameFilter()
  }
  function goToMatch(step) {
    if (matches.length === 0) {
      return
    }
    matchIndex = (matchIndex + step + matches.length) % matches.length
    const { page, rect } = matches[matchIndex]
    PDFViewerApplication.pdfViewer.scrollPageIntoView({
      pageNumber: page + 1,
      // Lands a little above and left of the field, keeping the current zoom
      destArray: [null, { name: 'XYZ' }, Math.max(0, rect[0] - 40), rect[3] + 40, null],
      allowNegativeOffset: true
    })
    applyFieldNameFilter()
  }
  function setSearchBarOpen(open) {
    document.getElementById('fieldNameSearchBar').classList.toggle('hidden', !open)
    const button = document.getElementById('searchFieldNames')
    button.classList.toggle('toggled', open)
    button.setAttribute('aria-expanded', String(open))
    const input = document.getElementById('fieldNameSearchInput')
    if (open) {
      input.focus()
      input.select()
    } else {
      input.value = ''
      searchFieldNames('')
    }
  }
  // Every widget that has a key, in reading order (page, then top to bottom, then left to right)
  function listFieldWidgets(fields) {
    return Object.entries(fields || {})
      .flatMap(([name, widgets]) => widgets
        .filter((widget) => widget.rect && widget.page >= 0)
        .map((widget) => ({ name, id: widget.id, page: widget.page, rect: widget.rect })))
      .sort((a, b) => a.page - b.page || b.rect[3] - a.rect[3] || a.rect[0] - b.rect[0])
  }
  window.addEventListener('load', async function () {
    const config = loadConfig()
    PDFViewerApplicationOptions.set('cMapUrl', config.cMapUrl)
    PDFViewerApplicationOptions.set('standardFontDataUrl', config.standardFontDataUrl)
    const loadOpts = {
      url:config.path,
      useWorkerFetch: false,
      cMapUrl: config.cMapUrl,
      cMapPacked: true,
      standardFontDataUrl: config.standardFontDataUrl
    }
    PDFViewerApplication.initializedPromise.then(() => {
      const defaults = config.defaults
      const optsOnLoad = () => {
        PDFViewerApplication.pdfCursorTools.switchTool(cursorTools(defaults.cursor))
        PDFViewerApplication.pdfViewer.currentScaleValue = defaults.scale
        PDFViewerApplication.pdfViewer.scrollMode = scrollMode(defaults.scrollMode)
        PDFViewerApplication.pdfViewer.spreadMode = spreadMode(defaults.spreadMode)
        if (defaults.sidebar) {
          PDFViewerApplication.pdfSidebar.open()
        } else {
          PDFViewerApplication.pdfSidebar.close()
        }
        PDFViewerApplication.eventBus.off('documentloaded', optsOnLoad)
      }
      PDFViewerApplication.eventBus.on('documentloaded', optsOnLoad)

      const savedState = vscodeApi && vscodeApi.getState()
      setFieldNamesVisible(savedState && typeof savedState.showFieldNames === 'boolean'
        ? savedState.showFieldNames
        : config.showFieldNames)
      document.getElementById('toggleFieldNames').addEventListener('click', () => {
        setFieldNamesVisible(!document.body.classList.contains('showFieldNames'))
      })
      document.getElementById('searchFieldNames').addEventListener('click', () => {
        setSearchBarOpen(document.getElementById('fieldNameSearchBar').classList.contains('hidden'))
      })
      const searchInput = document.getElementById('fieldNameSearchInput')
      searchInput.addEventListener('input', () => searchFieldNames(searchInput.value))
      searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          goToMatch(event.shiftKey ? -1 : 1)
        } else if (event.key === 'Escape') {
          setSearchBarOpen(false)
        }
      })
      // The buttons only appear for PDFs that have form fields
      PDFViewerApplication.eventBus.on('documentloaded', async () => {
        const fields = await PDFViewerApplication.pdfDocument.getFieldObjects()
        document.getElementById('toggleFieldNames').hidden = !fields
        document.getElementById('searchFieldNames').hidden = !fields
        fieldWidgets = listFieldWidgets(fields)
        searchFieldNames(searchInput.value)
      })
      PDFViewerApplication.eventBus.on('annotationlayerrendered', addFieldNameLabels)

      // load() cannot be called before pdf.js is initialized
      // open() makes sure pdf.js is initialized before load()
      PDFViewerApplication.open(config.path).then(async function () {
        const doc = await pdfjsLib.getDocument(loadOpts).promise
        doc._pdfInfo.fingerprints = [config.path]
        PDFViewerApplication.load(doc)
      })
    })

    window.addEventListener('message', async function () {
      // Prevents flickering of page when PDF is reloaded
      const oldResetView = PDFViewerApplication.pdfViewer._resetView
      PDFViewerApplication.pdfViewer._resetView = function () {
        this._firstPageCapability = (0, pdfjsLib.createPromiseCapability)()
        this._onePageRenderedCapability = (0, pdfjsLib.createPromiseCapability)()
        this._pagesCapability = (0, pdfjsLib.createPromiseCapability)()

        this.viewer.textContent = ""
      }

      // Changing the fingerprint fools pdf.js into keeping scroll position
      const doc = await pdfjsLib.getDocument(loadOpts).promise
      doc._pdfInfo.fingerprints = [config.path]
      PDFViewerApplication.load(doc)

      PDFViewerApplication.pdfViewer._resetView = oldResetView
    });
  }, { once: true });

  window.onerror = function () {
    const msg = document.createElement('body')
    msg.innerText = 'An error occurred while loading the file. Please open it again.'
    document.body = msg
  }
}());
