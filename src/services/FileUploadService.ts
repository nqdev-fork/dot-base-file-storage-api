import fs from "fs";
import path from "path";
import { IncomingForm, Files, File } from "formidable";
import { Request } from "express";
import Formidable from "formidable/Formidable";
import { R4 as fhir } from "@ahryman40k/ts-fhir-types";
import FhirResourceBuilder from "@/utils/FhirResourceBuilder";
import { v4 as uuid } from "uuid";
import { strict as assert } from "assert";

export default class FileUploadService {
  private supportedFileExtensions = ["jpg", "json", "mp4", "pdf", "ply", "png"];

  private uploadDirectory(context: string, fhirId: string): string {
    return process.env.NODE_ENV === "development"
      ? `./files/${context}/${fhirId}`
      : `/files/${context}/${fhirId}`;
  }

  private createDirIfNotExists(path: string) {
    if (fs.existsSync(path)) return;
    return fs.mkdirSync(path, { recursive: true });
  }

  private changeFilePath(file: File, uploadDirectory: string): void {
    const fileExtension = /\.\w+$/g.exec(file.path);
    const newPath = `${uploadDirectory}/${uuid()}.${fileExtension}`;
    // this prevents directory traversal attacks
    // where "../" is used to traverse other directories
    if (newPath.startsWith(uploadDirectory)) {
      file.path = newPath;
    }
  }

  private initializeUploadForm(uploadDirectory: string): Formidable {
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

  private async parseRequest(req: Request, form: Formidable): Promise<Files> {
    return new Promise(function (resolve, reject) {
      form.parse(req, function (err, fields, files) {
        if (err !== null) reject(err);
        else resolve(files);
      });
    });
  }

  private filetypeIsWhitelisted(file: File): boolean {
    const supportedFiletypesMatcher = new RegExp(
      `\.(${this.supportedFileExtensions.join("|")})$`,
      "i"
    );
    return file.path.match(supportedFiletypesMatcher) ? true : false;
  }

  private urlOf(filepath: string): string {
    const protocol = process.env.NODE_ENV === "development" ? "http://" : "https://";
    const url = new URL(filepath, `${protocol}${process.env.DOMAIN ?? "localhost"}/api/`);
    return url.href;
  }

  private deleteEmptyDirectories(filepath: string) {
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

  private deleteFiles(files: File[]) {
    files.map((file) => {
      fs.unlinkSync(file.path);
      this.deleteEmptyDirectories(file.path);
    });
  }

  private async save(req: Request, uploadDir: string): Promise<File> {
    const form = this.initializeUploadForm(uploadDir);
    const filesMap = await this.parseRequest(req, form);
    const files = Object.values(filesMap) as File[];
    if (files.length !== 1 || files[0].size == 0) {
      this.deleteFiles(files);
      throw new Error("You should submit exactly one file.");
    }
    if (!this.filetypeIsWhitelisted(files[0])) {
      this.deleteFiles(files);
      throw new TypeError(
        `Invalid file type. The server only accepts files with one the following extensions: ${this.supportedFileExtensions.join(
          ", "
        )}.`
      );
    }
    return files[0] as File;
  }

  private validateRequest(req: Request): void {
    const context = req.params.context;
    const fhirId = req.params.fhirId;
    assert(context);
    assert(fhirId);

    const notAlphanumericMatcher = /[^\p{L}0-9]/u;
    if (notAlphanumericMatcher.test(context) || notAlphanumericMatcher.test(fhirId))
      throw Error("Context and Fhir ID must be alphanumeric.");
  }

  public async handleUpload(req: Request): Promise<fhir.IAttachment> {
    this.validateRequest(req);
    const uploadDir: string = this.uploadDirectory(req.params.context, req.params.fhirId);
    this.createDirIfNotExists(uploadDir);
    const file = await this.save(req, uploadDir);

    return FhirResourceBuilder.attachment(
      file.type,
      file.name,
      this.urlOf(file.path),
      file.lastModifiedDate?.toISOString()
    );
  }
}
