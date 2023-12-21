import fs from "fs";
import path from "path";
import { IncomingForm, Files, File } from "formidable";
import { Request } from "express";
import Formidable from "formidable/Formidable";
import { R4 as fhir } from "@ahryman40k/ts-fhir-types";
import FhirResourceBuilder from "@/utils/FhirResourceBuilder";
import { v4 as uuid } from "uuid";

export default class FileService {
  private supportedFileExtensions = ["jpg", "json", "mp4", "pdf", "ply", "png"];

  public get baseDir(): string {
    return process.env.NODE_ENV === "development" ? `./files` : `/files`;
  }

  private uploadDirectory(context: string, fhirId: string): string {
    return `${this.baseDir}/${context}/${fhirId}`;
  }

  private createDirIfNotExists(path: string) {
    if (fs.existsSync(path)) return;
    return fs.mkdirSync(path, { recursive: true });
  }

  private isDirectoryTraversalAttack(filepath: string): boolean {
    // normalized paths resolve '..' and '.', making
    // directory traversal attacks visible.
    const normalizedPath = path.normalize(filepath);
    const isTraversalAttack = !filepath.endsWith(normalizedPath);
    return isTraversalAttack;
  }

  private getUniqueFilePath(file: File, uploadDirectory: string): string {
    const fileExtension = /\.\w+$/g.exec(file.filepath);
    const uniquePath = `${uploadDirectory}/${uuid()}${fileExtension}`;

    if (this.isDirectoryTraversalAttack(uniquePath)) {
      throw new Error("Invalid upload directory.");
    }

    return uniquePath;
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

    form.on("fileBegin", (_, file) => {
      file.filepath = this.getUniqueFilePath(file, uploadDirectory);
    });

    return form;
  }

  private async parseRequest(req: Request, form: Formidable): Promise<Files> {
    // Formidable's API is based on callbacks, which
    // we want to promisify so we can await the parsing.
    return new Promise(function (resolve, reject) {
      form.parse(req, function (err, _, files: Files) {
        if (err !== null) reject(err);
        else resolve(files);
      });
    });
  }

  private urlOf(filepath: string): string {
    // Convert absolute filePaths to relative path in order to create a valid url
    const path = filepath.replace(new RegExp("^(/)"), "./");
    const protocol = process.env.NODE_ENV === "development" ? "http://" : "https://";
    const domain = process.env.DOMAIN ?? "localhost";
    const url = new URL(path, `${protocol}${domain}/api/`);
    return url.href;
  }

  private deleteDirectoryIfEmpty(dir: string) {
    try {
      if (!fs.existsSync(dir)) return;
      if (fs.readdirSync(dir).length > 0) return;
      fs.rmdirSync(dir);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      // In this case file is saved in /tmp/<random>, but /tmp may not be deleted.
      const emptyFileSent = "EACCES";
      if (error.code === emptyFileSent) return;

      throw error;
    }
  }

  private deleteEmptyDirectories(filepath: string) {
    const subDirs = path.dirname(filepath).split("/");
    const fullSubDirs = subDirs.map((_, index) => subDirs.slice(0, index + 1).join("/"));
    const fullSubDirsReversed = fullSubDirs.reverse();
    fullSubDirsReversed.forEach((dir) => this.deleteDirectoryIfEmpty(dir));
  }

  private deleteFiles(files: (File | File[])[]) {
    for (const file of files) {
      if (Array.isArray(file)) this.deleteFiles(file);
      else this.deleteFile(file as File);
    }
  }

  private deleteFile(file: File) {
    if (!fs.existsSync(file.filepath)) return;
    fs.unlinkSync(file.filepath);
    this.deleteEmptyDirectories(file.filepath);
  }

  private async save(req: Request, uploadDir: string): Promise<File> {
    const form: Formidable = this.initializeUploadForm(uploadDir);
    const files: Files = await this.parseRequest(req, form);

    try {
      const file: File = this.getSingleFileOrThrow(files);
      file.mimetype = this.setFileType(file.filepath);
      return file;
    } catch (error) {
      this.deleteFiles(Object.values(files) as unknown as File[]);
      throw error;
    }
  }

  private getSingleFileOrThrow(files: Files): File {
    const file = Object.values(files);
    const isSingleFile = file.length === 1 || (Array.isArray(file[0]) && file[0].length !== 0);

    if (!isSingleFile) throw new Error("You should submit exactly one file.");

    return file[0]![0] as File;
  }

  private setFileType(fileName: string): string | null {
    const fileType = fileName.split(".").pop();
    switch (fileType) {
      case "ply":
        return "model/ply";
      case "png":
        return "image/png";
      case "pdf":
        return "application/pdf";
      case "jpg":
        return "image/jpeg";
      case "mp4":
        return "video/mp4";
      case "json":
        return "application/json";
      default: {
        const supportedFileTypes = `${this.supportedFileExtensions.join(", ")}`;
        throw new TypeError(
          `Invalid file type. The server only accepts files with one the following extensions: ${supportedFileTypes}.`,
        );
      }
    }
  }

  private validateRequest(req: Request): void {
    const context = req.params.context;
    const fhirId = req.params.fhirId;
    const nonValidCharacters = /[^\p{L}0-9-]/u; // not(unicode letter, number, dash)
    if (context.match(nonValidCharacters) || fhirId.match(nonValidCharacters))
      throw Error("Context and Fhir ID must only contain unicode letters, digits or dashes.");
  }

  private formatResponse(file: File): fhir.IAttachment {
    const { mimetype, originalFilename, filepath } = file;
    const missingFieldError = "The uploaded file is missing a required field";
    if (mimetype === null) throw new TypeError(`${missingFieldError} 'mimetype'.`);
    if (originalFilename === null) throw new Error(`${missingFieldError} 'originalFilename'.`);
    if (filepath === null) throw new Error(`${missingFieldError} 'filepath'.`);

    return FhirResourceBuilder.attachment(
      mimetype,
      originalFilename,
      this.urlOf(filepath),
      new Date().toISOString(),
    );
  }

  public async handleUpload(req: Request): Promise<fhir.IAttachment> {
    this.validateRequest(req);
    const uploadDir: string = this.uploadDirectory(req.params.context, req.params.fhirId);
    this.createDirIfNotExists(uploadDir);
    const file = await this.save(req, uploadDir);
    return this.formatResponse(file);
  }
}
