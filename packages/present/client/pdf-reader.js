import { getDocument, GlobalWorkerOptions } from "./pdf.min.mjs"

GlobalWorkerOptions.workerSrc = new URL("./pdf.worker.min.mjs", import.meta.url).href

async function startReader(root) {
  const stage = root.querySelector(".pdf-stage")
  const canvas = root.querySelector("canvas")
  const pageInput = root.querySelector("[data-pdf-page]")
  const count = root.querySelector("[data-pdf-count]")
  const status = root.querySelector("[data-pdf-status]")
  const scaleLabel = root.querySelector("[data-pdf-scale]")
  const text = root.querySelector("[data-pdf-text]")
  const controls = Object.fromEntries([...root.querySelectorAll("[data-pdf-action]")].map((button) => [button.dataset.pdfAction, button]))
  let pdf
  let pageNumber = 1
  let mode = "fit-page"
  let scale = 1
  let appliedScale = 1
  let generation = 0
  let task
  let queue = Promise.resolve()

  function updateControls() {
    pageInput.value = pageNumber
    controls.previous.disabled = !pdf || pageNumber === 1
    controls.next.disabled = !pdf || pageNumber === pdf.numPages
    controls["fit-page"].setAttribute("aria-pressed", String(mode === "fit-page"))
    controls["fit-width"].setAttribute("aria-pressed", String(mode === "fit-width"))
  }

  function render() {
    const request = ++generation
    task?.cancel()
    updateControls()
    queue = queue.then(async () => {
      if (request !== generation) return
      root.setAttribute("aria-busy", "true")
      status.textContent = `Loading page ${pageNumber}…`
      try {
        const page = await pdf.getPage(pageNumber)
        if (request !== generation) return
        const base = page.getViewport({ scale: 1 })
        const widthScale = Math.max(1, stage.clientWidth - 34) / base.width
        const heightScale = Math.max(1, stage.clientHeight - 34) / base.height
        appliedScale = mode === "fit-page" ? Math.min(widthScale, heightScale) : mode === "fit-width" ? widthScale : scale
        const viewport = page.getViewport({ scale: appliedScale })
        const pixels = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = Math.ceil(viewport.width * pixels)
        canvas.height = Math.ceil(viewport.height * pixels)
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`
        canvas.hidden = false
        task = page.render({ canvas, viewport, transform: pixels === 1 ? null : [pixels, 0, 0, pixels, 0, 0] })
        await task.promise
        if (request !== generation) return
        const content = await page.getTextContent()
        if (request !== generation) return
        text.textContent = content.items.filter((item) => typeof item.str === "string").map((item) => item.str).join(" ")
        canvas.setAttribute("aria-label", `PDF page ${pageNumber} of ${pdf.numPages}`)
        scaleLabel.textContent = `${Math.round(appliedScale * 100)}%`
        status.textContent = `Page ${pageNumber} of ${pdf.numPages}`
        root.dataset.renderedPage = pageNumber
      } catch (error) {
        if (request === generation && error.name !== "RenderingCancelledException") {
          status.textContent = "This page could not be displayed. Try another page or download the PDF."
          canvas.hidden = true
          text.textContent = ""
          delete root.dataset.renderedPage
          console.error("PDF page rendering failed", error)
        }
      } finally {
        if (request === generation) root.setAttribute("aria-busy", "false")
      }
    })
  }

  function goToPage(value) {
    if (!pdf) return
    const number = Number(value)
    if (!String(value).trim() || !Number.isInteger(number)) { pageInput.value = pageNumber; return }
    const next = Math.max(1, Math.min(pdf.numPages, number))
    if (next === pageNumber) { pageInput.value = pageNumber; return }
    pageNumber = next
    stage.scrollTo(0, 0)
    render()
  }

  root.querySelector(".pdf-toolbar").addEventListener("click", (event) => {
    const action = event.target.closest("[data-pdf-action]")?.dataset.pdfAction
    if (!pdf || !action) return
    if (action === "previous" || action === "next") return goToPage(pageNumber + (action === "next" ? 1 : -1))
    if (action === "zoom-in" || action === "zoom-out") {
      scale = Math.max(0.25, Math.min(4, appliedScale * (action === "zoom-in" ? 1.25 : 0.8)))
      mode = "custom"
    } else mode = action
    render()
  })
  pageInput.addEventListener("change", () => goToPage(pageInput.value))
  pageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); goToPage(pageInput.value) }
  })
  root.addEventListener("keydown", (event) => {
    if (event.target.matches("input")) return
    if (["ArrowRight", "PageDown", "ArrowLeft", "PageUp"].includes(event.key)) {
      event.preventDefault()
      goToPage(pageNumber + (["ArrowRight", "PageDown"].includes(event.key) ? 1 : -1))
    }
  })
  let size = ""
  new ResizeObserver(() => {
    const next = `${stage.clientWidth}:${stage.clientHeight}`
    if (next === size) return
    size = next
    if (pdf && mode !== "custom") render()
  }).observe(stage)

  try {
    pdf = await getDocument({
      url: new URL(root.dataset.pdfSrc, document.baseURI).href,
      cMapUrl: new URL("./cmaps/", import.meta.url).href,
      cMapPacked: true,
      standardFontDataUrl: new URL("./standard_fonts/", import.meta.url).href,
      wasmUrl: new URL("./wasm/", import.meta.url).href,
      iccUrl: new URL("./iccs/", import.meta.url).href,
    }).promise
    pageInput.max = pdf.numPages
    count.textContent = pdf.numPages
    pageInput.disabled = false
    for (const button of Object.values(controls)) button.disabled = false
    render()
  } catch (error) {
    root.setAttribute("aria-busy", "false")
    status.textContent = "This PDF could not be loaded. You can still download it."
    console.error("PDF loading failed", error)
  }
}

for (const reader of document.querySelectorAll("[data-pdf-src]")) startReader(reader)
