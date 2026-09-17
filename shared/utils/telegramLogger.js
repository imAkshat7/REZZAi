export const sendTelegramLog = async (message, level = "INFO") => {
	const botToken = process.env.TELEGRAM_BOT_TOKEN
	const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_USER_ID

	if (!botToken || !chatId) {
		return
	}

	const icons = {
		INFO: "ℹ️",
		WARN: "⚠️",
		ERROR: "❌",
		SUCCESS: "✅"
	}

	const icon = icons[level] || "📢"
	const text = `${icon} <b>[REZZAi ${level}]</b>\n\n${message}`

	try {
		const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				chat_id: chatId,
				text,
				parse_mode: "HTML"
			})
		})

		if (!response.ok) {
			const errBody = await response.text()
			console.error(`Telegram log API failed (${response.status}):`, errBody)
		}
	} catch (err) {
		console.error("Failed to send Telegram log:", err.message)
	}
}

export default sendTelegramLog
