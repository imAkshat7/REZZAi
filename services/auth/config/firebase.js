import serviceAccount from "../serviceAccountKey.json" with {type:"json"}
import { cert, initializeApp } from "firebase-admin/app"
export const app = initializeApp({
  credential: cert(serviceAccount)
});