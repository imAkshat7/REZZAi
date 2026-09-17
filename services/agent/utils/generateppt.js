import PptxGenJS from "pptxgenjs"

export const generatePpt = async (data) => {
	const pptx = new PptxGenJS()

	pptx.layout = "LAYOUT_WIDE"
	pptx.author = "REZZAi"
	pptx.title = data?.title || "REZZAi Presentation"
	pptx.subject = data?.subtitle || data?.title || "Executive Presentation"
	pptx.company = "REZZAi"
	pptx.revision = "1"

	// 1. Cover Slide (Dark Modern Theme)
	const coverSlide = pptx.addSlide()
	coverSlide.background = { color: "0F172A" }

	// Header Pill Badge
	coverSlide.addText("✦ REZZAi PRESENTATION", {
		x: 0.8,
		y: 0.8,
		w: 2.8,
		h: 0.4,
		rect: { fill: { color: "1E293B" }, rx: 5 },
		color: "DBFF4D",
		fontFace: "Arial",
		fontSize: 10,
		bold: true,
		align: "center"
	})

	// Cover Title
	coverSlide.addText(data?.title || "Presentation Title", {
		x: 0.8,
		y: 2.2,
		w: 11.7,
		h: 1.8,
		color: "FFFFFF",
		fontFace: "Arial",
		fontSize: 34,
		bold: true,
		align: "left"
	})

	// Subtitle
	if (data?.subtitle) {
		coverSlide.addText(data.subtitle, {
			x: 0.8,
			y: 4.2,
			w: 11.7,
			h: 0.8,
			color: "94A3B8",
			fontFace: "Arial",
			fontSize: 18,
			italic: true,
			align: "left"
		})
	}

	// Accent Line
	coverSlide.addShape(pptx.shapes.RECTANGLE, {
		x: 0.8,
		y: 5.3,
		w: 2.5,
		h: 0.06,
		fill: { color: "2563EB" }
	})

	// Cover Footer
	coverSlide.addText("REZZAi Executive Intelligence • Confidential", {
		x: 0.8,
		y: 6.7,
		w: 11.7,
		h: 0.3,
		color: "64748B",
		fontFace: "Arial",
		fontSize: 9,
		align: "left"
	})

	// 2. Content Slides
	const totalContentSlides = Array.isArray(data?.slides) ? data.slides.length : 0

	if (Array.isArray(data?.slides)) {
		data.slides.forEach((slideData, index) => {
			const slide = pptx.addSlide()
			slide.background = { color: "F8FAFC" }

			// Top Accent Bar
			slide.addShape(pptx.shapes.RECTANGLE, {
				x: 0,
				y: 0,
				w: 13.33,
				h: 0.1,
				fill: { color: "2563EB" }
			})

			// Slide Counter Badge
			slide.addText(`Slide ${index + 1} of ${totalContentSlides}`, {
				x: 10.5,
				y: 0.5,
				w: 2.0,
				h: 0.35,
				rect: { fill: { color: "E2E8F0" }, rx: 4 },
				color: "475569",
				fontFace: "Arial",
				fontSize: 9,
				bold: true,
				align: "center"
			})

			// Left Accent Bar
			slide.addShape(pptx.shapes.RECTANGLE, {
				x: 0.8,
				y: 0.55,
				w: 0.08,
				h: 0.45,
				fill: { color: "2563EB" }
			})

			// Slide Title
			slide.addText(slideData?.title || `Slide ${index + 1}`, {
				x: 1.0,
				y: 0.5,
				w: 9.2,
				h: 0.6,
				color: "0F172A",
				fontFace: "Arial",
				fontSize: 22,
				bold: true,
				align: "left"
			})

			// Slide Points (Formatted Bullets)
			if (Array.isArray(slideData?.points) && slideData.points.length > 0) {
				const bulletObjects = slideData.points.map((pointText) => ({
					text: pointText,
					options: {
						bullet: { type: "code", code: "2022" },
						color: "334155",
						fontFace: "Arial",
						fontSize: 14,
						spaceAfter: 12,
						lineSpacing: 22
					}
				}))

				slide.addText(bulletObjects, {
					x: 1.0,
					y: 1.4,
					w: 11.3,
					h: 5.2,
					valign: "top"
				})
			}

			// Footer
			slide.addText("REZZAi Presentation Intelligence", {
				x: 0.8,
				y: 6.9,
				w: 6.0,
				h: 0.3,
				color: "94A3B8",
				fontFace: "Arial",
				fontSize: 9,
				align: "left"
			})

			slide.addText(`REZZAi • ${data?.title || "Presentation"}`, {
				x: 7.0,
				y: 6.9,
				w: 5.5,
				h: 0.3,
				color: "94A3B8",
				fontFace: "Arial",
				fontSize: 9,
				align: "right"
			})
		})
	}

	const base64Data = await pptx.write({ outputType: "base64" })
	return base64Data
}
