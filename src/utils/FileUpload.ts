import fs from "fs";
import { IncomingForm, Files, File } from "formidable";
import { Request } from "express";
import Formidable from "formidable/Formidable";
import { R4 as fhir } from "@ahryman40k/ts-fhir-types";
import FhirResourceBuilder from "@/utils/FhirResourceBuilder";
import { v4 as uuid } from "uuid";

export default class FileUpload {
  private static getUploadDirectory(req: Request): string {
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

  private static initializeUploadForm(uploadDirectory: string): Formidable {
    const form = new IncomingForm({
      keepExtensions: true,
      allowEmptyFiles: false,
      multiples: false,
      maxFieldsSize: 0, // = unlimited
      maxFileSize: 4000 * 1024 * 1024, // = 4 gb
    });
    form.on("fileBegin", function (name, file) {
      const fileExtension = file.path.split(".").pop();
      const newPath = `${uploadDirectory}/${uuid()}.${fileExtension}`;
      // this prevents directory traversal attacks
      // where "../" is used to traverse other directories
      if (newPath.startsWith(uploadDirectory)) {
        file.path = newPath;
      }
    });
    return form;
  }

  private static async parseForm(req: Request, form: Formidable): Promise<Files> {
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

  private static urlTo(path: string): string {
    const protocol =
      process.env.NODE_ENV === "development" || process.env.INSECURE ? "http://" : "https://";
    const url = new URL(path, `${protocol}${process.env.DOMAIN ?? "localhost"}/api/files/`);
    return url.href;
  }

  private static async save(req: Request, uploadDir: string): Promise<File> {
    const form = FileUpload.initializeUploadForm(uploadDir);
    const filesMap = await FileUpload.parseForm(req, form);
    const files = Object.values(filesMap);
    if (files.length !== 1) throw new Error("You should submit exactly one file.");
    // files can be assumed as File because the multiples option of the IncomingForm
    // was set to false
    return files[0] as File;
  }

  public static async handleUpload(req: Request): Promise<fhir.IAttachment> {
    const uploadDir = FileUpload.getUploadDirectory(req);
    FileUpload.createDirIfNotExists(uploadDir);
    const file = await FileUpload.save(req, uploadDir);
    const url = FileUpload.urlTo(file.path);

    if (!FileUpload.filetypeIsWhitelisted(file)) {
      fs.unlinkSync(file.path);
      throw new Error(
        "Invalid file type. The server only accepts files with one the following extensions: jpg, json, mp4, pdf, ply or png."
      );
    }

    return FhirResourceBuilder.attachment(
      file.type,
      file.name,
      url,
      file.lastModifiedDate?.toISOString()
    );
  }
}
