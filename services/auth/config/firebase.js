import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { cert, initializeApp } from "firebase-admin/app"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const getServiceAccount = () => {
	if (process.env.FIREBASE_SERVICE_ACCOUNT) {
		try {
			const envVal = process.env.FIREBASE_SERVICE_ACCOUNT.trim()
			const jsonString = envVal.startsWith("{")
				? envVal
				: Buffer.from(envVal, "base64").toString("utf-8")
			return JSON.parse(jsonString)
		} catch (err) {
			console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", err.message)
		}
	}

	const possiblePaths = [
		path.join(process.cwd(), "serviceAccountKey.json"),
		path.join(__dirname, "../serviceAccountKey.json"),
		path.join(process.cwd(), "services/auth/serviceAccountKey.json")
	]

	for (const filePath of possiblePaths) {
		if (fs.existsSync(filePath)) {
			try {
				const content = fs.readFileSync(filePath, "utf-8")
				return JSON.parse(content)
			} catch (err) {
				console.error(`Failed to read serviceAccountKey.json at ${filePath}:`, err.message)
			}
		}
	}

	console.warn("⚠️ Firebase service account credentials not found!")
	return {}
}

const serviceAccount = getServiceAccount()

export const app = initializeApp({
	credential: cert(serviceAccount)
})