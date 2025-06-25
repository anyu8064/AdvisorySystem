const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const { Storage } = require("@google-cloud/storage");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const path = require("path");
const os = require("os");
const fs = require("fs");

admin.initializeApp();
const storage = new Storage();

exports.getFile = functions.region('asia-southeast1').https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      const data = req.body;

      const bucket = admin.storage().bucket();
      const templatePath = path.join(os.tmpdir(), "ITAdvisoryTemplate.docx");

      await bucket.file("templates/ITAdvisoryTemplate.docx").download({
        destination: templatePath,
      });

      const content = fs.readFileSync(templatePath, "binary");

      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      doc.setData({
        what: data.what,
        when: data.when,
        duration: data.duration,
        areaAffected: data.areaAffected,
        details: data.details,
      });

      try {
        doc.render();
      } catch (error) {
        console.error("Docxtemplater render error:", error);

        // Safely pull from error stack
        let detailedErrors = [];
        if (typeof error.getErrors === "function") {
          detailedErrors = error.getErrors().map(err => ({
            tag: err.properties?.id || "(unknown)",
            explanation: err.properties?.explanation || "(no explanation)",
            message: err.message || "(no message)",
          }));
        }

        return res.status(500).json({
          error: "Template rendering failed",
          details: detailedErrors.length ? detailedErrors : error.message,
        });
      }


      const buffer = doc.getZip().generate({ type: "nodebuffer" });
      const outputFileName = `ITAdvisory-${Date.now()}.docx`;
      const outputPath = path.join(os.tmpdir(), outputFileName);

      fs.writeFileSync(outputPath, buffer);

      const destinationPath = `generatedDocs/${outputFileName}`;
      await bucket.upload(outputPath, {
        destination: destinationPath,
        metadata: {
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
      });

      const [url] = await bucket.file(destinationPath).getSignedUrl({
        action: "read",
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
      });

      return res.status(200).json({ downloadUrl: url });
    } catch (err) {
      console.error("Error generating/uploading document:", err);
      res.status(500).json({ error: "Unexpected error", message: err.message });
    }
  });
});
