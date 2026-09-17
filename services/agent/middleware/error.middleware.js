import { sendTelegramLog } from "../utils/telegramLogger.js"

const errorMiddleware = (err, req, res, next) => {
	console.error("Unhandled Error in Agent Service:", err)

	const statusCode = err.statusCode || err.status || 500
	const message = err.message || "Internal Server Error"

	const telegramMessage = `🚨 <b>[Unhandled Service Error]</b>\nPath: <code>${req.method} ${req.originalUrl || req.url}</code>\nStatus: ${statusCode}\nError: ${message}`
	sendTelegramLog(telegramMessage, "ERROR").catch((telegramErr) => {
		console.error("Error sending Telegram log from errorMiddleware:", telegramErr.message)
	})

	return res.status(statusCode).json({
		error: true,
		message,
		...(process.env.NODE_ENV === "development" && { stack: err.stack })
	})
}

export default errorMiddleware
