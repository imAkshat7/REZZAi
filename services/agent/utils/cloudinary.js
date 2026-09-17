import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET
})

export const uploadPdfToCloudinary = (pdfBuffer, filename = "document.pdf") => {
	return new Promise((resolve) => {
		if (
			!process.env.CLOUDINARY_CLOUD_NAME ||
			!process.env.CLOUDINARY_API_KEY ||
			!process.env.CLOUDINARY_API_SECRET
		) {
			console.log("Cloudinary credentials not set in .env. Using instant Data URI.")
			return resolve(null)
		}

		// 2.5-second safety timeout so Cloudinary network stalls never block the user
		let isResolved = false
		const timer = setTimeout(() => {
			if (!isResolved) {
				isResolved = true
				console.warn("Cloudinary PDF upload timed out (>2.5s). Falling back to instant Data URI.")
				resolve(null)
			}
		}, 2500)

		try {
			const cleanName = filename.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40)
			const uploadStream = cloudinary.uploader.upload_stream(
				{
					resource_type: "raw",
					folder: "rezzai_pdfs",
					public_id: `${Date.now()}_${cleanName}.pdf`
				},
				(error, result) => {
					clearTimeout(timer)
					if (!isResolved) {
						isResolved = true
						if (error) {
							console.error("Cloudinary PDF upload error:", error)
							return resolve(null)
						}
						resolve(result?.secure_url || null)
					}
				}
			)

			uploadStream.end(pdfBuffer)
		} catch (err) {
			clearTimeout(timer)
			if (!isResolved) {
				isResolved = true
				console.error("Cloudinary upload stream exception:", err)
				resolve(null)
			}
		}
	})
}
