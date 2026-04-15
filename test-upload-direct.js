const fs = require("fs")
const path = require("path")
const http = require("http")

// Create a test GeoJSON file
const geojsonData = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "Test Point Feature",
        description: "A test point",
      },
      geometry: {
        type: "Point",
        coordinates: [36.8172, -1.2921],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Test LineString",
        description: "A test line",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [36.8172, -1.2921],
          [36.82, -1.295],
        ],
      },
    },
  ],
}

const geojsonString = JSON.stringify(geojsonData)
const projectId = "cmnycudmb000000uhmc6n4ue6" // Rupungazi Project

// Build multipart form data
const boundary = "----FormBoundary" + Date.now()
let body = ""

// Add projectId field
body += `--${boundary}\r\n`
body += `Content-Disposition: form-data; name="projectId"\r\n\r\n`
body += `${projectId}\r\n`

// Add details field
body += `--${boundary}\r\n`
body += `Content-Disposition: form-data; name="details"\r\n\r\n`
body += `Test upload via Node.js\r\n`

// Add file
body += `--${boundary}\r\n`
body += `Content-Disposition: form-data; name="file"; filename="test.geojson"\r\n`
body += `Content-Type: application/json\r\n\r\n`
body += geojsonString + "\r\n"

// End boundary
body += `--${boundary}--\r\n`

const options = {
  hostname: "localhost",
  port: 3001,
  path: "/features/upload",
  method: "POST",
  headers: {
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
    "Content-Length": Buffer.byteLength(body),
  },
}

console.log("Sending upload request...")
const req = http.request(options, (res) => {
  let data = ""

  res.on("data", (chunk) => {
    data += chunk
  })

  res.on("end", () => {
    console.log("\nResponse Status:", res.statusCode)
    console.log("Response Headers:", res.headers)
    console.log("Response Body:", data)

    try {
      const parsed = JSON.parse(data)
      console.log("\nParsed Response:", JSON.stringify(parsed, null, 2))
    } catch (e) {
      console.log("Could not parse response as JSON")
    }
  })
})

req.on("error", (error) => {
  console.error("Request error:", error)
})

req.write(body)
req.end()
