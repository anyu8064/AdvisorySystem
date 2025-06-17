const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.resetUserPassword = functions.https.onCall(async (data, context) => {
  const { uid, newPassword } = data;

  if (!uid || !newPassword) {
    throw new functions.https.HttpsError("invalid-argument", "UID and newPassword are required.");
  }

  try {
    await admin.auth().updateUser(uid, {
      password: newPassword,
    });

    return { success: true, message: "Password updated successfully." };
  } catch (error) {
    console.error("Password reset error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
