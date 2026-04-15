import FormData from "form-data"
import fs from "fs"
import axios from "axios"

const projectId = "cmnycudmb000000uhmc6n4ue6"
const filePath = "test-feature.geojson"

const form = new FormData()
form.append("file", fs.createReadStream(filePath))
form.append("projectId", projectId)
form.append("details", "Test upload from Node.js script")

axios
  .post("http://localhost:3001/features/upload", form, {
    headers: form.getHeaders(),
  })
  .then((response) => {
    console.log("Success:", JSON.stringify(response.data, null, 2))
  })
  .catch((error) => {
    console.error("Error:", error.response?.data || error.message)
  })
