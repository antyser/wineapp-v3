const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../frontend/.env") });

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || "http://localhost:54321";
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

console.log("Supabase URL:", supabaseUrl);
console.log(
  "Supabase Key:",
  supabaseKey ? "Exists (not showing for security)" : "Missing"
);

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Create a temporary test file to upload
const testFilePath = path.resolve(__dirname, "test-upload.txt");
fs.writeFileSync(
  testFilePath,
  `This is a test file created at ${new Date().toISOString()}`
);

// SQL to create RLS policies
const createPoliciesSQL = `
-- Enable Row Level Security
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows authenticated users to upload files to the 'storage' bucket
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'storage' AND
  (storage.foldername(name))[1] = 'wine-uploads'
);

-- Create a policy that allows anyone to read files from the 'storage' bucket (public bucket)
CREATE POLICY "Allow public to read files" 
ON storage.objects
FOR SELECT 
TO public
USING (
  bucket_id = 'storage' AND
  (storage.foldername(name))[1] = 'wine-uploads'
);

-- Create a policy that allows authenticated users to update their own files
CREATE POLICY "Allow authenticated users to update their own files" 
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'storage' AND
  (storage.foldername(name))[1] = 'wine-uploads' AND
  owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'storage' AND
  (storage.foldername(name))[1] = 'wine-uploads' AND
  owner = auth.uid()
);

-- Create a policy that allows authenticated users to delete their own files
CREATE POLICY "Allow authenticated users to delete their own files" 
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'storage' AND
  (storage.foldername(name))[1] = 'wine-uploads' AND
  owner = auth.uid()
);
`;

async function runTest() {
  try {
    console.log("Starting test...");
    let userId;

    // Step 1: Sign in with demo account
    console.log("\n1. Attempting to sign in with demo account...");
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: "demo@wineapp.com",
        password: "demo123456",
      });

    if (signInError) {
      // If the account doesn't exist, try to create it
      if (signInError.message.includes("Invalid login credentials")) {
        console.log("   Demo account does not exist, creating it...");
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email: "demo@wineapp.com",
            password: "demo123456",
          });

        if (signUpError) {
          throw new Error(
            `Failed to create demo account: ${signUpError.message}`
          );
        }

        console.log("   Demo account created successfully");
        console.log("   User:", signUpData?.user?.id);
        userId = signUpData?.user?.id;
        console.log(
          "   Session:",
          signUpData?.session ? "Created" : "Not created"
        );
      } else {
        throw new Error(`Authentication failed: ${signInError.message}`);
      }
    } else {
      console.log("   Successfully signed in");
      console.log("   User:", signInData?.user?.id);
      userId = signInData?.user?.id;
      console.log(
        "   Session:",
        signInData?.session ? "Created" : "Not created"
      );
    }

    // Step 2: List available buckets
    console.log("\n2. Checking available storage buckets...");
    const { data: buckets, error: bucketsError } =
      await supabase.storage.listBuckets();

    if (bucketsError) {
      throw new Error(`Failed to list buckets: ${bucketsError.message}`);
    }

    console.log(
      "   Available buckets:",
      buckets?.map((b) => b.name).join(", ") || "None found"
    );

    // Check if 'storage' bucket exists
    const storageBucket = buckets?.find((b) => b.name === "storage");
    if (!storageBucket) {
      console.log(
        '   The "storage" bucket does not exist. Assuming it was already created via SQL.'
      );
      console.log("   Continuing with the test...");
    } else {
      console.log('   "storage" bucket exists');
    }

    // Step 3: Create user-specific folder structure if it doesn't exist
    console.log(`\n3. Creating user folder structure (${userId})...`);
    try {
      const { data: folders, error: foldersError } = await supabase.storage
        .from("storage")
        .list();

      if (foldersError) {
        throw foldersError;
      }

      const userFolder = folders?.find((item) => item.name === userId);

      if (!userFolder) {
        console.log(
          `   User folder (${userId}) does not exist, creating it...`
        );

        // Create a placeholder file to establish the folder
        const { data: placeholderData, error: placeholderError } =
          await supabase.storage
            .from("storage")
            .upload(`${userId}/.placeholder`, new Uint8Array(0), {
              contentType: "text/plain",
            });

        if (placeholderError) {
          throw new Error(
            `Failed to create user folder: ${placeholderError.message}`
          );
        }

        console.log(`   Successfully created user folder (${userId})`);
      } else {
        console.log(`   User folder (${userId}) already exists`);
      }
    } catch (error) {
      console.log(`   Error checking/creating folder: ${error.message}`);
      // Continue anyway - the upload might still work
    }

    // Step 4: Upload test file
    console.log(`\n4. Uploading test file to storage/${userId}/test.txt...`);
    const testFileContent = fs.readFileSync(testFilePath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("storage")
      .upload(`${userId}/test.txt`, testFileContent, {
        contentType: "text/plain",
        upsert: true,
      });

    if (uploadError) {
      console.log("   Upload failed with error:", uploadError.message);

      if (uploadError.message.includes("row-level security")) {
        console.log("   This appears to be a Row-Level Security (RLS) issue.");
        console.log("   Attempting to fix by applying storage policies...");

        // For local development, we'd need to run SQL to set up policies
        // In a real app, you would execute this in the Supabase dashboard
        console.log("\n   SQL policies that need to be applied:");
        console.log("   " + createPoliciesSQL.replace(/\n/g, "\n   "));

        console.log(
          "\n   Please run these policies in the SQL Editor of your Supabase Dashboard."
        );
        console.log(
          "   Navigate to: http://localhost:54323/project/default/sql"
        );
      }

      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log("   File uploaded successfully!");
    console.log("   Upload path:", uploadData.path);

    // Step 5: Get public URL
    console.log("\n5. Getting public URL...");
    const { data: publicUrlData } = supabase.storage
      .from("storage")
      .getPublicUrl(`${userId}/test.txt`);

    console.log("   Public URL:", publicUrlData.publicUrl);
    console.log(
      "\nAll tests passed! Your Supabase storage is correctly configured."
    );

    console.log("\nNext steps:");
    console.log(
      "1. If this is the first time setting up, check for the RLS policies in the SQL output above."
    );
    console.log(
      "2. Make sure your app is using the updated environment variables."
    );
    console.log("3. Try the image upload feature in your app again.");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error(
      "Please check your Supabase configuration and storage policies."
    );
  } finally {
    // Clean up
    try {
      fs.unlinkSync(testFilePath);
    } catch (e) {
      // Ignore deletion errors
    }
  }
}

runTest();
