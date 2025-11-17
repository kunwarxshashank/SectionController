// Script to simulate real-time train position updates for testing

const trainIds = ["T-401", "T-205", "T-302"]
const basePositions = {
  "T-401": [28.625, 77.24],
  "T-205": [28.645, 77.265],
  "T-302": [28.605, 77.255],
}

async function simulateTrainUpdate(trainId) {
  const basePos = basePositions[trainId]
  if (!basePos) return

  const newPosition = {
    lat: basePos[0] + (Math.random() - 0.5) * 0.002,
    lon: basePos[1] + (Math.random() - 0.5) * 0.002,
    speed: 40 + Math.random() * 40,
    heading: Math.random() * 360,
  }

  try {
    const response = await fetch(`http://localhost:3000/api/trains/${trainId}/position`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // In a real scenario, you'd need to include auth headers
      },
      body: JSON.stringify(newPosition),
    })

    if (response.ok) {
      console.log(`Updated position for ${trainId}:`, newPosition)
    } else {
      console.error(`Failed to update ${trainId}:`, await response.text())
    }
  } catch (error) {
    console.error(`Error updating ${trainId}:`, error)
  }
}

async function startSimulation() {
  console.log("Starting train position simulation...")

  setInterval(() => {
    trainIds.forEach((trainId) => {
      simulateTrainUpdate(trainId)
    })
  }, 5000) // Update every 5 seconds
}

if (typeof window === "undefined") {
  // Running in Node.js
  startSimulation()
}
