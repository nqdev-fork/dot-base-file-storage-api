import express from "express";
import FileService from "@/services/FileService";

const router: express.Router = express.Router();
const fileService = new FileService();

router.use("/", express.static(fileService.baseDir));

router.post("/:context/:fhirId", async (req, res) => {
  try {
    const fhirAttachment = await fileService.handleUpload(req);
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
