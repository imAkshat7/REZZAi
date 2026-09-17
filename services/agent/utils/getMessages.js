import "dotenv/config"

export const getMessages = async (conversationId, userId) => {
	if (!conversationId || !userId) {
		throw new Error("conversationId and userId are required")
	}

	const response = await fetch(
		`${process.env.CHAT_SERVICE}/conversations/${conversationId}/messages`,
		{
			method: "GET",
			headers: {
				"x-user-id": userId
			}
		}
	)

	if (!response.ok) {
		const error = await response.text()
		throw new Error(`Could not get messages: ${response.status} ${error}`)
	}

	return response.json()
}
