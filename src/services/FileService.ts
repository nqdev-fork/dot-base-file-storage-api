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

  private uploadDirectory(context: string, fhirId: string): string {
    return process.env.NODE_ENV === "development"
      ? `./files/${context}/${fhirId}`
      : `/files/${context}/${fhirId}`;
  }

  private createDirIfNotExists(path: string) {
    if (fs.existsSync(path)) return;
    return fs.mkdirSync(path, { recursive: true });
  }

  private getUniqueFilePath(file: File, uploadDirectory: string): string {
    const fileExtension = /\.\w+$/g.exec(file.path);
    const uniquePath = `${uploadDirectory}/${uuid()}${fileExtension}`;
    //REVIEW: REPLACE COMMENT WITH DECRIPTIVE NAMING
    const preventTraversalAttack = uniquePath.startsWith(uploadDirectory);

    //REVIEW: Happy PATH SHOULD BE DEFAULT PATH + THROW ERROR HERE?
    if (!preventTraversalAttack) {
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

    form.on("fileBegin", (name, file) => {
      file.path = this.getUniqueFilePath(file, uploadDirectory);
    });

    return form;
  }

  //REVIEW:
  private parseRequest(req: Request, form: Formidable): Files {
    let uploadFiles: Files = {};

    form.parse(req, (err, fields, files) => {
      if (err !== null) throw new Error(`Parsing of uploaded files failed: ${err}.`);
      else uploadFiles = files;
    });

    return uploadFiles;
  }

  private urlOf(filepath: string): string {
    const protocol = process.env.NODE_ENV === "development" ? "http://" : "https://";
    const domain = process.env.DOMAIN ?? "localhost";
    const url = new URL(filepath, `${protocol}${domain}/api/`);
    return url.href;
  }

  //REVIEW: SHOULDN'T USING 'recursive:true' WORK HERE?
  //OTHERWISE I WOULD ADD AT LEAST A 2nd FUNCTION 'deleteDirectory'
  private deleteEmptyDirectories(filepath: string) {
    try {
      const directory = path.dirname(filepath);
      fs.rmdirSync(directory, { recursive: true });
    } catch (e) {
      //REVIEW: AVOID COMMENTS WITH DECRIPTIVE NAMING
      const fileAlreadyExists = "ENOTEMPTY";
      const noFileSaved = "EACCES";
      if (e.code === fileAlreadyExists) return;
      //In this case file is saved in /tmp/<random>,but /tmp may not be deleted
      if (e.code === noFileSaved) return;
      throw e;
    }
  }

  //REVIEW: I WOULD REFACTOR THIS HERE FOR TYPESAFETY OF FILE AND FILE[]
  private deleteFiles(files: (File | File[])[]) {
    for (const file of files) {
      if (Array.isArray(file)) this.deleteFiles(file);
      else this.deleteFile(file as File);
    }
  }

  private deleteFile(file: File) {
    fs.unlinkSync(file.path);
    this.deleteEmptyDirectories(file.path);
  }

  private async save(req: Request, uploadDir: string): Promise<File> {
    const form: Formidable = this.initializeUploadForm(uploadDir);
    const files: Files = this.parseRequest(req, form);

    try {
      const file: File = this.getFile(files);
      this.validateFileType(file);
      return file;
    } catch (error) {
      this.deleteFiles(Object.values(files));
      throw error;
    }
  }

  private getFile(files: Files): File {
    const file = Object.values(files);
    const isSingleFile = file.length === 1 && Array.isArray(file[0]) && file[0].length !== 0;

    if (!isSingleFile) throw new Error("You should submit exactly one file.");

    return file[0] as File;
  }

  private validateFileType(file: File): void {
    const fileTypes = this.supportedFileExtensions.join("|");
    const supportedFiletypesRegEx = new RegExp(`\.(${fileTypes})$`, "i");
    const isSupportedFileType = file.path.match(supportedFiletypesRegEx) ? true : false;

    if (!isSupportedFileType) {
      const supportedFileTypes = `${this.supportedFileExtensions.join(", ")}`;
      throw new TypeError(
        `Invalid file type. The server only accepts files with one the following extensions: ${supportedFileTypes}.`
      );
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
    const { type, name, path, lastModifiedDate } = file;
    const missingFieldError = "The uploaded file is missing a required field";
    if (type === null) throw new TypeError(`${missingFieldError} 'type'.`);
    if (name === null) throw new Error(`${missingFieldError} 'name'.`);
    if (path === null) throw new Error(`${missingFieldError} 'path'.`);
    if (!lastModifiedDate) throw new Error(`${missingFieldError} 'lastModifiedDate'`);

    return FhirResourceBuilder.attachment(
      type,
      name,
      this.urlOf(path),
      lastModifiedDate.toISOString()
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