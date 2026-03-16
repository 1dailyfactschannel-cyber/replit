import fetch from "node-fetch";

async function testAPI() {
  try {
    // Test the API endpoint for a task
    const taskId = "857cea82-129d-4064-a138-9c2d9b3aff7c";
    
    console.log("Testing API endpoint...");
    const response = await fetch(`http://localhost:3005/api/tasks/${taskId}/user-time-summary`);
    
    if (!response.ok) {
      console.error("API Error:", response.status, response.statusText);
      const errorText = await response.text();
      console.error("Error body:", errorText);
      return;
    }
    
    const data = await response.json();
    console.log("API Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

testAPI();
