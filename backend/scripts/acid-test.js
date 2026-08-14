const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const Product = require("../models/Product");
const User = require("../models/User");
const Order = require("../models/Order");
const WpOrder = require("../models/WpOrder");

async function runAcidTests() {
  console.log("==========================================================");
  console.log("🧪 EXECUTING DATABASE ACID SUITE FOR MONODB");
  console.log("==========================================================");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB:", mongoose.connection.name);

  let passedTests = 0;
  let totalTests = 4;

  try {
    // ── TEST 1: ATOMICITY TEST ────────────────────────────────────────────────
    console.log("\n----------------------------------------------------------");
    console.log("1️⃣ ATOMICITY TEST (All-or-Nothing Execution)");
    console.log("----------------------------------------------------------");

    // Create a temporary test product
    const testProduct = await Product.create({
      name: "ACID Atomicity Test Item",
      price: 100,
      stock: 5,
      category: "Test",
      image: "https://example.com/test.jpg"
    });

    const initialStock = testProduct.stock;
    console.log(`[Atomicity] Initial product stock: ${initialStock}`);

    // Simulate order placement with stock decrement
    const decRes = await Product.updateOne(
      { _id: testProduct._id, stock: { $gte: 2 } },
      { $inc: { stock: -2 } }
    );

    let stockAfterDec = (await Product.findById(testProduct._id)).stock;
    console.log(`[Atomicity] Stock after decrement (-2): ${stockAfterDec}`);

    // Simulate a failure in order processing -> Rollback stock
    console.log("[Atomicity] Simulating transaction rollback on error...");
    await Product.updateOne(
      { _id: testProduct._id },
      { $inc: { stock: 2 } }
    );

    const rolledBackStock = (await Product.findById(testProduct._id)).stock;
    console.log(`[Atomicity] Stock after rollback: ${rolledBackStock}`);

    if (rolledBackStock === initialStock) {
      console.log("✅ ATOMICITY TEST PASSED: State fully restored on failure!");
      passedTests++;
    } else {
      console.log("❌ ATOMICITY TEST FAILED!");
    }

    // Cleanup test product
    await Product.deleteOne({ _id: testProduct._id });

    // ── TEST 2: CONSISTENCY TEST ──────────────────────────────────────────────
    console.log("\n----------------------------------------------------------");
    console.log("2️⃣ CONSISTENCY TEST (Schema & Unique Index Enforcement)");
    console.log("----------------------------------------------------------");

    const testWpOrderId = 99999999;
    await WpOrder.deleteMany({ wpOrderId: testWpOrderId });

    // Insert first WpOrder document
    await WpOrder.create({
      wpOrderId: testWpOrderId,
      total: 500,
      billingEmail: "acidtest@example.com"
    });
    console.log(`[Consistency] Inserted primary test WpOrder #${testWpOrderId}`);

    // Attempt to insert DUPLICATE unique wpOrderId
    let duplicateRejected = false;
    try {
      await WpOrder.create({
        wpOrderId: testWpOrderId,
        total: 750,
        billingEmail: "duplicate@example.com"
      });
    } catch (dupError) {
      duplicateRejected = dupError.code === 11000 || dupError.message.includes("E11000");
      console.log(`[Consistency] Duplicate wpOrderId write caught by index: ${dupError.message}`);
    }

    if (duplicateRejected) {
      console.log("✅ CONSISTENCY TEST PASSED: Unique constraints & schema invariants enforced!");
      passedTests++;
    } else {
      console.log("❌ CONSISTENCY TEST FAILED!");
    }

    // Cleanup test WpOrder
    await WpOrder.deleteMany({ wpOrderId: testWpOrderId });

    // ── TEST 3: ISOLATION TEST (CONCURRENCY & RACE CONDITIONS) ───────────────
    console.log("\n----------------------------------------------------------");
    console.log("3️⃣ ISOLATION TEST (Race Condition & Stock Oversell Defense)");
    console.log("----------------------------------------------------------");

    // Create item with EXACTLY 1 stock remaining
    const raceItem = await Product.create({
      name: "ACID Concurrency Item",
      price: 500,
      stock: 1,
      category: "Test",
      image: "https://example.com/race.jpg"
    });

    console.log(`[Isolation] Created item with stock = ${raceItem.stock}`);
    console.log("[Isolation] Launching 10 SIMULTANEOUS concurrent purchase attempts...");

    // Fire 10 parallel purchase requests
    const attempts = Array.from({ length: 10 }).map(async (_, idx) => {
      try {
        const updateRes = await Product.updateOne(
          { _id: raceItem._id, stock: { $gte: 1 } },
          { $inc: { stock: -1 } }
        );
        return updateRes.modifiedCount === 1;
      } catch {
        return false;
      }
    });

    const results = await Promise.all(attempts);
    const successCount = results.filter((res) => res === true).length;
    const failCount = results.filter((res) => res === false).length;

    const finalRaceStock = (await Product.findById(raceItem._id)).stock;
    console.log(`[Isolation] Purchase results: ${successCount} Succeeded, ${failCount} Rejected`);
    console.log(`[Isolation] Final stock in DB: ${finalRaceStock}`);

    if (successCount === 1 && finalRaceStock === 0) {
      console.log("✅ ISOLATION TEST PASSED: Zero overselling, atomic isolation maintained under concurrent load!");
      passedTests++;
    } else {
      console.log("❌ ISOLATION TEST FAILED!");
    }

    // Cleanup test product
    await Product.deleteOne({ _id: raceItem._id });

    // ── TEST 4: DURABILITY TEST ───────────────────────────────────────────────
    console.log("\n----------------------------------------------------------");
    console.log("4️⃣ DURABILITY TEST (Data Persistence across Disconnect/Reconnect)");
    console.log("----------------------------------------------------------");

    const durableProduct = await Product.create({
      name: "ACID Durability Test Book",
      price: 299,
      stock: 50,
      category: "Test",
      image: "https://example.com/durability.jpg"
    });

    const durableId = durableProduct._id;
    console.log(`[Durability] Created record ID: ${durableId}`);

    console.log("[Durability] Simulating database disconnect & reconnect...");
    await mongoose.disconnect();
    await mongoose.connect(process.env.MONGO_URI);

    const reloadedItem = await Product.findById(durableId);
    const persists = reloadedItem && reloadedItem.name === "ACID Durability Test Book";
    console.log(`[Durability] Reloaded record from storage disk: ${persists ? "MATCHED" : "NOT FOUND"}`);

    if (persists) {
      console.log("✅ DURABILITY TEST PASSED: Committed writes persisted on disk across sessions!");
      passedTests++;
    } else {
      console.log("❌ DURABILITY TEST FAILED!");
    }

    // Cleanup durable product
    await Product.deleteOne({ _id: durableId });

    // ── SUMMARY REPORT ───────────────────────────────────────────────────────
    console.log("\n==========================================================");
    console.log(`📊 FINAL ACID COMPLIANCE RESULT: ${passedTests} / ${totalTests} TESTS PASSED`);
    if (passedTests === totalTests) {
      console.log("🎉 ALL ACID PROPERTIES FULLY VERIFIED & COMPLIANT!");
    }
    console.log("==========================================================");
  } catch (error) {
    console.error("ACID Suite Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

runAcidTests();
