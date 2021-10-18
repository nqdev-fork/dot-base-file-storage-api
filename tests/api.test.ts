import request from "supertest"
import app from "@/app"
import { deleteAllFiles, fileExtension, localFilepath, uploadedFileToExist } from "./utils"

describe("File Upload", () => {
    const pathToPdfFile = "./tests/mocks/sample.pdf"
    const pathToSvgFile = "./tests/mocks/drawing.svg"

    afterEach(() => {
        deleteAllFiles()
    })

    test("POST /api/files/clinical/12345 uploads file", async () => {
        const res = await request(app)
        .post("/api/files/clinical/12345")
        .attach("sample.pdf", pathToPdfFile)
        
        expect(res.status).toBe(200)
        expect(uploadedFileToExist(res))
        expect(fileExtension(localFilepath(res))).toBe(fileExtension(pathToPdfFile))
    })

    test("POST /api/files/study/2342ofisho8f uploads file", async () => {
        const res = await request(app)
        .post("/api/files/study/2342ofisho8f")
        .attach("sample.pdf", pathToPdfFile)
        
        expect(res.status).toBe(200)
        expect(uploadedFileToExist(res))
        expect(fileExtension(localFilepath(res))).toBe(fileExtension(pathToPdfFile))
    })

    test("POST /api/files/..%2Fsrc/123 handles directory travel attempt", async () => {
        const res = await request(app)
        .post("/api/files/..%2Fsrc/123")
        .attach("sample.pdf", pathToPdfFile)
        
        expect(res.status).toBe(500)
        expect(uploadedFileToExist(res)).toBeFalsy()
    })

    test("POST /api/files/clinical/12345 rejects unsupported file extensions", async () => {
        const res = await request(app)
        .post("/api/files/clinical/12345")
        .attach("drawing.svg", pathToSvgFile)
        
        expect(res.status).toBe(415)
        expect(uploadedFileToExist(res)).toBeFalsy()
    })

    test("POST /api/files/clinical/12345 rejects when no file sent", async () => {
        const res = await request(app)
        .post("/api/files/clinical/12345")
        .attach("sample", null as unknown as string) // as unknown first stops ts complaining
        
        expect(res.status).toBe(500)
        expect(uploadedFileToExist(res)).toBeFalsy()
    })

    test("POST /api/files/clinical/12345 rejects when too many files sent", async () => {
        const res = await request(app)
        .post("/api/files/clinical/12345")
        .attach("sample1.pdf", pathToPdfFile)
        .attach("sample2.pdf", pathToPdfFile)
        
        expect(res.status).toBe(500)
        expect(uploadedFileToExist(res)).toBeFalsy()
    })
})