
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const readline = require("readline");
const User = require("./user.model");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function createAdmin() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in .env");
    }

    const name = (await ask("Super Admin name: ")).trim();
    const email = (await ask("Super Admin email: "))
      .trim()
      .toLowerCase();
    const password = await ask(
      "Super Admin password (minimum 8 characters): "
    );

    if (!name || !email || password.length < 8) {
      console.log(
        "Invalid input. Name, email and 8+ character password required."
      );
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log(
        "This email is already registered. Choose another email."
      );
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
      permissions: [],
      isActive: true,
      isVerified: true,
    });

    console.log("\nSuper Admin created successfully!");
    console.log("Name:", admin.name);
    console.log("Email:", admin.email);
    console.log("Role:", admin.role);
    console.log("Account active:", admin.isActive);
  } catch (error) {
    console.error("Super Admin creation failed:", error.message);
  } finally {
    await mongoose.disconnect().catch(() => {});
    rl.close();
  }
}

createAdmin();