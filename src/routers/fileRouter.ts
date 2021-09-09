import express from "express";
import FileUpload from "@/utils/FileUpload";

const router: express.Router = express.Router();

router.post("/:context/:fhirId", async (req, res) => {
  try {
    const fhirAttachment = await FileUpload.handleUpload(req);
    res.status(200).send(fhirAttachment);
  } catch (e) {
    res.status(500).send(e);
  }
});

export default router;
