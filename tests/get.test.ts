import request from "supertest";
import app from "@/app";
import { copyToFileStorage, deleteAllFiles, isBufferSameAsFile } from "./utils";

describe("File Upload GET", () => {
  const pathToTestFile = "./tests/mocks/sample.pdf";
  const pathDestinationFile = "files/clinical/12345";
  const destinationFileName = "/testname.pdf";
  const url = `/api/${pathDestinationFile}${destinationFileName}`;

  beforeEach(async () => {
    copyToFileStorage(pathToTestFile, `./${pathDestinationFile}`, destinationFileName);
  });

  afterEach(() => {
    deleteAllFiles();
  });

  test("supports retrieving of uploaded files", async () => {
    const res = await request(app).get(url).buffer();

    expect(res.status).toBe(200);
    expect(isBufferSameAsFile(res.body, pathToTestFile));
  });
});
