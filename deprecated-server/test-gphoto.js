#!/usr/bin/env node

const { spawn, exec } = require("child_process");
const path = require("path");

console.log("🔧 Testing GPhoto2 Commands...\n");

// Test 1: Basic camera detection
console.log("1. Testing camera detection...");
exec("gphoto2 --auto-detect", { timeout: 5000 }, (error, stdout, stderr) => {
  if (error) {
    console.log("❌ Camera detection failed:", error.message);
  } else {
    console.log("✅ Camera detection successful");
    console.log("   Output:", stdout.split("\n")[0]);
  }

  // Test 2: Preview capture
  console.log("\n2. Testing preview capture...");
  const previewCommand = spawn(
    "gphoto2",
    [
      "--capture-preview",
      "--force-overwrite",
      "--filename=/tmp/test_preview.jpg",
    ],
    { timeout: 5000 }
  );

  let previewOutput = "";
  let previewError = "";

  previewCommand.stdout.on("data", (data) => {
    previewOutput += data.toString();
  });

  previewCommand.stderr.on("data", (data) => {
    const errorMsg = data.toString();
    previewError += errorMsg;

    // Filter normal messages
    if (errorMsg.includes("Capturing preview frame")) {
      console.log("   📸 Preview message (normal):", errorMsg.trim());
    } else if (errorMsg.includes("ERROR") || errorMsg.includes("Failed")) {
      console.log("   ❌ Preview error:", errorMsg.trim());
    }
  });

  previewCommand.on("close", (code) => {
    if (code === 0) {
      console.log("✅ Preview capture completed successfully");
    } else {
      console.log("❌ Preview capture failed with code:", code);
    }

    // Test 3: Movie capture to stdout
    console.log("\n3. Testing movie capture to stdout (5 seconds)...");
    const movieCommand = spawn(
      "gphoto2",
      ["--capture-movie", "--stdout", "--force-overwrite", "--filename=-"],
      { timeout: 5000 }
    );

    let movieOutput = "";
    let movieError = "";
    let frameCount = 0;

    movieCommand.stdout.on("data", (data) => {
      movieOutput += data;
      frameCount++;
      // Count JPEG markers to estimate frames
      const jpegMarkers = (movieOutput.match(/\xff\xd8/g) || []).length;
      if (jpegMarkers > 0 && jpegMarkers % 10 === 0) {
        console.log(`   🎥 Received ${jpegMarkers} frame markers...`);
      }
    });

    movieCommand.stderr.on("data", (data) => {
      const errorMsg = data.toString();
      movieError += errorMsg;

      // Filter normal messages
      if (errorMsg.includes("Capturing preview frames as movie")) {
        console.log("   🎬 Movie message (normal):", errorMsg.trim());
      } else if (errorMsg.includes("ERROR") || errorMsg.includes("Failed")) {
        console.log("   ❌ Movie error:", errorMsg.trim());
      }
    });

    movieCommand.on("error", (error) => {
      console.log("❌ Movie process error:", error.message);
    });

    // Stop after 5 seconds
    setTimeout(() => {
      console.log("   ⏹️  Stopping movie capture...");
      movieCommand.kill("SIGINT");

      setTimeout(() => {
        if (!movieCommand.killed) {
          movieCommand.kill("SIGKILL");
        }

        const jpegMarkers = (movieOutput.match(/\xff\xd8/g) || []).length;
        console.log(
          `✅ Movie capture test completed. Received ${jpegMarkers} frame markers`
        );

        console.log("\n🎯 Test Summary:");
        console.log("   - Camera detection: Tested");
        console.log("   - Preview capture: Tested");
        console.log("   - Movie streaming: Tested");
        console.log(
          "\n💡 If you see 'Capturing preview frames as movie' message, this is NORMAL behavior."
        );
        console.log(
          "   The error handling has been updated to ignore this normal message."
        );
      }, 1000);
    }, 5000);
  });
});
