import { fork } from "child_process"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log("Starting REZZAi Unified Monorepo Server...")

const AUTH_PORT = process.env.AUTH_PORT || "8001"
const CHAT_PORT = process.env.CHAT_PORT || "8002"
const AGENT_PORT = process.env.AGENT_PORT || "8003"
const GATEWAY_PORT = process.env.PORT || "8000"

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE || `http://127.0.0.1:${AUTH_PORT}`
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE || `http://127.0.0.1:${CHAT_PORT}`
const AGENT_SERVICE_URL = process.env.AGENT_SERVICE || `http://127.0.0.1:${AGENT_PORT}`

function startSubService(name, scriptPath, customEnv = {}) {
	const childEnv = { ...process.env, ...customEnv }
	console.log(`Starting ${name}...`)

	const child = fork(scriptPath, [], {
		env: childEnv,
		stdio: "inherit"
	})

	child.on("exit", (code) => {
		console.error(`${name} exited with code ${code}`)
	})

	return child
}

startSubService("Auth Service", path.join(__dirname, "services/auth/index.js"), {
	PORT: AUTH_PORT
})

startSubService("Chat Service", path.join(__dirname, "services/chat/index.js"), {
	PORT: CHAT_PORT
})

startSubService("Agent Service", path.join(__dirname, "services/agent/index.js"), {
	PORT: AGENT_PORT,
	CHAT_SERVICE: CHAT_SERVICE_URL
})

startSubService("Gateway Service", path.join(__dirname, "gateway/index.js"), {
	PORT: GATEWAY_PORT,
	AUTH_SERVICE: AUTH_SERVICE_URL,
	CHAT_SERVICE: CHAT_SERVICE_URL,
	AGENT_SERVICE: AGENT_SERVICE_URL
})
