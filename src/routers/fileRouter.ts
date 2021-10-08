import express from "express";
import FileUploadService from "@/services/FileUploadService";

const router: express.Router = express.Router();
const fileUpload = new FileUploadService();

router.post("/:context/:fhirId", async (req, res) => {
  try {
    const fhirAttachment = await fileUpload.handleUpload(req);
    res.status(200).send(fhirAttachment);
  } catch (e) {
    if (e instanceof TypeError) {
      res.status(415).send(e.message);
      return;
    }
    res.status(500).send(e.message);
  }
});

export default router;
