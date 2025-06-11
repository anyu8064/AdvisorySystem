const functions = require("firebase-functions");
const cors = require("cors")({origin: true});
const {Storage} = require("@google-cloud/storage");
const admin = require("firebase-admin");
admin.initializeApp();
// Replace with your actual bucket name
const BUCKET_NAME = "mmcadvisorysystem.appspot.com";
const storage = new Storage();

exports.getFile = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const PizZip = require("pizzip");
    const Docxtemplater = require("docxtemplater");
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const {what, when, duration, areaAffected, details} = req.body;

    try {
      const bucket = storage.bucket(BUCKET_NAME);
      const file = bucket.file("templates/it-advisory-template.docx");
      const [content] = await file.download();

      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {paragraphLoop: true,
        linebreaks: true});

      doc.setData({
        what: what || "--",
        when: when || "--",
        duration: duration || "--",
        areaAffected: areaAffected || "--",
        details: details || "--",
      });

      try {
        doc.render();
      } catch (err) {
        console.error("Docxtemplater render error:", err);
        return res.status(500).send("Template rendering failed.");
      }

      const buffer = doc.getZip().generate({type: "nodebuffer"});

      res.setHeader("Content-Disposition",
          "attachment; filename=ITAdvisoryFilled.docx");
      res.setHeader("Content-Type",
          "application/vnd.openxmlformats" +
        "-officedocument.wordprocessingml.document");
      res.status(200).send(buffer);
    } catch (error) {
      console.error("DOCX generation error:", error);
      res.status(500).send("Failed to generate document.");
    }
  });
});
