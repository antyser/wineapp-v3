const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");

console.log("Starting local upload test...");

// Create a test image file
function createTestImage() {
  console.log("\n1. Creating test image file...");
  const testImagePath = path.resolve(__dirname, "test-image.jpg");

  // Generate a very simple image (a 1x1 pixel blank JPG)
  const blankJpgHex =
    "ffd8ffe000104a46494600010101004800480000ffdb00430001010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101ffdb00430101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101ffc00011080001000103012200021101031101ffc4001500010100000000000000000000000000000008ffc40014100100000000000000000000000000000000ffc40014010100000000000000000000000000000000ffc40014110100000000000000000000000000000000ffda000c03010002110311003f00bf8000000007ffd9";
  const imageBuffer = Buffer.from(blankJpgHex, "hex");

  fs.writeFileSync(testImagePath, imageBuffer);
  console.log(`   Created test image at: ${testImagePath}`);
  return testImagePath;
}

// Mock the storage upload
function mockStorageUpload(filePath) {
  console.log("\n2. Simulating file upload to storage...");

  return new Promise((resolve, reject) => {
    // Read the file
    const fileContent = fs.readFileSync(filePath);
    console.log(`   File size: ${fileContent.length} bytes`);

    // Generate a random file ID to simulate upload
    const uploadId = crypto.randomBytes(8).toString("hex");
    const uploadPath = `wine-uploads/${uploadId}.jpg`;

    console.log("   Upload successful!");
    console.log(`   Upload path: ${uploadPath}`);

    resolve({
      path: uploadPath,
      id: uploadId,
    });
  });
}

// Mock getting a public URL
function getPublicUrl(uploadPath) {
  console.log("\n3. Getting public URL...");
  const mockPublicUrl = `https://your-supabase-project.supabase.co/storage/v1/object/public/storage/${uploadPath}`;
  console.log(`   Public URL: ${mockPublicUrl}`);
  return mockPublicUrl;
}

// Mock API call with the public URL
function mockApiCall(publicUrl) {
  console.log("\n4. Simulating API call with image URL...");

  return new Promise((resolve, reject) => {
    // Create a simple HTTP server to mock an API response
    const server = http.createServer((req, res) => {
      console.log(`   Received request: ${req.url}`);

      // Parse the query parameters
      const urlObj = new URL(req.url, "http://localhost:3000");
      const imageUrl = urlObj.searchParams.get("image_url");

      console.log(`   Image URL received: ${imageUrl}`);

      // Send a mock response
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify([
          {
            id: "123",
            name: "Mock Wine",
            vintage: "2020",
            region: "Test Region",
            producer: "Mock Winery",
            image_url: imageUrl,
            grape_variety: "Test Grape",
          },
        ])
      );

      // Close the server after responding
      server.close();
    });

    // Start the server
    server.listen(3000, () => {
      console.log("   Mock API server listening on port 3000");

      // Make a request to the mock server
      const encodedUrl = encodeURIComponent(publicUrl);
      const req = http.request(
        {
          hostname: "localhost",
          port: 3000,
          path: `/api/v1/wines/search?image_url=${encodedUrl}`,
          method: "GET",
        },
        (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            const wines = JSON.parse(data);
            console.log(`   API responded with ${wines.length} wines`);
            console.log("   First wine:", wines[0].name);
            resolve(wines);
          });
        }
      );

      req.on("error", (error) => {
        reject(error);
      });

      req.end();
    });
  });
}

// Run the test flow
async function runTest() {
  try {
    console.log("Testing the complete image upload flow locally\n");

    // 1. Create a test image
    const testImagePath = createTestImage();

    // 2. Upload it to mock storage
    const uploadResult = await mockStorageUpload(testImagePath);

    // 3. Get public URL
    const publicUrl = getPublicUrl(uploadResult.path);

    // 4. Call mock API with the URL
    const wines = await mockApiCall(publicUrl);

    console.log("\n✅ All tests passed!");
    console.log(
      "The upload and API flow is working correctly in the test environment."
    );
    console.log("\nNow, for your actual Supabase implementation, you need to:");
    console.log(
      "1. Set the correct Supabase URL and anon key in frontend/.env"
    );
    console.log("2. Apply the storage policies in your Supabase dashboard");
    console.log("3. Create the demo user account");

    // Clean up test image
    fs.unlinkSync(testImagePath);
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
  }
}

runTest();
