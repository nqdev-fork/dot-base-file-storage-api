import fs from "fs";
import path from "path";
import { IncomingForm, Files, File } from "formidable";
import { Request } from "express";
import Formidable from "formidable/Formidable";
import { R4 as fhir } from "@ahryman40k/ts-fhir-types";
import FhirResourceBuilder from "@/utils/FhirResourceBuilder";
import { v4 as uuid } from "uuid";

export default class FileUpload {
  private static uploadDirectory(req: Request): string {
    const context = req.params.context;
    const fhirId = req.params.fhirId;
    return process.env.NODE_ENV === "development"
      ? `./${context}/${fhirId}`
      : `/${context}/${fhirId}`;
  }

  private static createDirIfNotExists(path: string) {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
    }
  }

  private static changeFilePath(file: File, uploadDirectory: string): void {
    if (!FileUpload.filetypeIsWhitelisted(file)) return;
    const fileExtension = file.path.split(".").pop();
    const newPath = `${uploadDirectory}/${uuid()}.${fileExtension}`;
    // this prevents directory traversal attacks
    // where "../" is used to traverse other directories
    if (newPath.startsWith(uploadDirectory)) {
      file.path = newPath;
    }
  }

  private static initializeUploadForm(uploadDirectory: string): Formidable {
    const form = new IncomingForm({
      keepExtensions: true,
      multiples: false,
      allowEmptyFiles: false,
      minFileSize: 1,
      maxFieldsSize: 0, // = unlimited
      maxFileSize: 4000 * 1024 * 1024, // = 4 gb
    });
    form.on("fileBegin", (name, file) => this.changeFilePath(file, uploadDirectory));
    return form;
  }

  private static async parseRequest(req: Request, form: Formidable): Promise<Files> {
    return new Promise(function (resolve, reject) {
      form.parse(req, function (err, fields, files) {
        if (err !== null) reject(err);
        else resolve(files);
      });
    });
  }

  private static filetypeIsWhitelisted(file: File): boolean {
    return file.path.match(/\.(mp4|jpg|json|pdf|ply|png)$/i) ? true : false;
  }

  private static urlOf(path: string): string {
    const protocol =
      process.env.NODE_ENV === "development" || process.env.INSECURE ? "http://" : "https://";
    const url = new URL(path, `${protocol}${process.env.DOMAIN ?? "localhost"}/api/files/`);
    return url.href;
  }

  private static deleteEmptyDirectories(filepath: string) {
    const baseDir = path.dirname(filepath).split("/");
    for (let depth = baseDir.length; depth > 1; depth--) {
      const dir = baseDir.slice(0, depth).join("/");
      try {
        fs.rmdirSync(dir);
      } catch (e) {
        // this error happens when files already exists in the dir
        if (e.code === "ENOTEMPTY") continue;
        // this error happens when no file is sent. In this
        // case a temporary file is saved in /tmp/<random>,
        // but /tmp may not be deleted
        if (e.code === "EACCES") continue;
        throw e;
      }
    }
  }

  private static deleteFiles(files: File[]) {
    files.map((file) => {
      fs.unlinkSync(file.path);
      this.deleteEmptyDirectories(file.path);
    });
  }

  private static async save(req: Request, uploadDir: string): Promise<File> {
    const form = FileUpload.initializeUploadForm(uploadDir);
    const filesMap = await FileUpload.parseRequest(req, form);
    const files = Object.values(filesMap) as File[];
    if (files.length !== 1) {
      this.deleteFiles(files);
      throw new Error("You should submit exactly one file.");
    }
    if (!FileUpload.filetypeIsWhitelisted(files[0])) {
      this.deleteFiles(files);
      throw new TypeError(
        "Invalid file type. The server only accepts files with one the following extensions: jpg, json, mp4, pdf, ply or png."
      );
    }
    return files[0] as File;
  }

  public static async handleUpload(req: Request): Promise<fhir.IAttachment> {
    const uploadDir = FileUpload.uploadDirectory(req);
    FileUpload.createDirIfNotExists(uploadDir);
    const file = await FileUpload.save(req, uploadDir);
    const url = FileUpload.urlOf(file.path);

    return FhirResourceBuilder.attachment(
      file.type,
      file.name,
      url,
      file.lastModifiedDate?.toISOString()
    );
  }
}
