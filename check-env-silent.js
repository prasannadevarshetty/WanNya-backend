require('dotenv').config();
console.log("--- ENV CHECK START ---");
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;
if (!user) {
  console.log("EMAIL_USER is UNDEFINED");
} else {
  console.log("EMAIL_USER is defined! Contains '@'?", user.includes('@'));
}

if (!pass) {
  console.log("EMAIL_PASS is UNDEFINED");
} else {
  console.log("EMAIL_PASS is defined! Length:", pass.length, "Has Spaces?", pass.includes(' '));
}

if (process.env.MONGODB_URI) {
  console.log("MONGODB_URI is successfully loaded too.");
} else {
  console.log("MONGODB_URI is MISSING, meaning .env is completely ignored!");
}
console.log("--- ENV CHECK END ---");
