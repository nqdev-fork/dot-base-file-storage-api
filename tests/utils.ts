import fs from "fs"
import request from "supertest"


export function deleteAllFiles(): void {
    fs.rmSync("./files", { recursive: true, force: true });
}

export function localFilepath(res: request.Response): string {
    const everythingAfterAPI = /.+\/api\/(.*)$/g // if exists, "/files/<context>/<id>.<extension>"
    return `.${res.body?.url?.match(everythingAfterAPI)}`
}

export function uploadedFileToExist(res: request.Response): boolean {
    return fs.existsSync(localFilepath(res))
}

export function fileExtension(path: string): string {
    return /\.\w+$/g.exec(path)?.[0] || "";
}

export function copyToFileStorage(fromFile: string, toDir: string, destFileName: string) {
    fs.mkdirSync(toDir, {recursive: true});
    fs.copyFileSync(fromFile, `${toDir}${destFileName}`)
}

export function isBufferSameAsFile(buffer: Buffer, filePath:string): boolean {
    const fileBuffer = fs.readFileSync(filePath)
    return fileBuffer.equals(buffer)
}