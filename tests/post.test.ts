import request from "supertest";
import app from "@/app";
import { deleteAllFiles, fileExtension, localFilepath, uploadedFileToExist } from "./utils";

describe("File Upload POST", () => {
  const pathToPdfFile = "./tests/mocks/sample.pdf";
  const pathToSvgFile = "./tests/mocks/drawing.svg";

  afterEach(() => {
    deleteAllFiles();
  });

  describe("supports", () => {
    test.each([
      { url: "/api/files/clinical/12345", description: "uploads file" },
      { url: "/api/files/study/2342ofisho8f", description: "uploads file" },
      { url: "/api/files/äthér/12345", description: "accepts non-ASCII letters in the URL" },
      { url: "/api/files/neuro/12af3-452f34", description: "supports dashes in url" },
    ])("POST $url $description", async ({ url }) => {
      const res = await request(app).post(url).attach("sample.pdf", pathToPdfFile);

      expect(res.status).toBe(200);
      expect(uploadedFileToExist(res));
      expect(fileExtension(localFilepath(res))).toBe(fileExtension(pathToPdfFile));
    });
  });

  describe("rejects", () => {
    test.each([
      {
        url: "/api/files/..%2Fsrc/123",
        fileName: "sample.pdf",
        filePath: pathToPdfFile,
        description: "handles directory traversal attempt",
        expectedStatus: 500,
      },
      {
        url: "/api/files/clinical/12345",
        fileName: "drawing.svg",
        filePath: pathToSvgFile,
        description: "handles unsupported file extensions",
        expectedStatus: 415,
      },
      {
        url: "/api/files/clinical/12345",
        fileName: "sample",
        filePath: null as unknown as string,
        description: "handles no file sent",
        expectedStatus: 500,
      },
      {
        url: "/api/files/neuro$/12345",
        fileName: "sample.pdf",
        filePath: pathToPdfFile,
        description: "handles illegal characters",
        expectedStatus: 500,
      },
    ])("POST $url $description", async ({ url, fileName, filePath, expectedStatus }) => {
      const res = await request(app).post(url).attach(fileName, filePath);

      expect(res.status).toBe(expectedStatus);
      expect(uploadedFileToExist(res)).toBeFalsy();
    });

    test("POST /api/files/clinical/12345 rejects when too many files sent", async () => {
      const res = await request(app)
        .post("/api/files/clinical/12345")
        .attach("sample1.pdf", pathToPdfFile)
        .attach("sample2.pdf", pathToPdfFile);

      expect(res.status).toBe(500);
      expect(uploadedFileToExist(res)).toBeFalsy();
    });
  });
});
