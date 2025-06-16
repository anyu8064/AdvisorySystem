const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.createUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }

  const { email, name, username, position, userLevel } = data;
  const password = userLevel === "admin" ? "admin123" : "user123";

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    await admin.firestore().collection("users").doc(userRecord.uid).set({
      email,
      name,
      username,
      position,
      userLevel,
    });

    return { message: "User created successfully" };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});
