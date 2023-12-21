import { R4 as fhir } from "@ahryman40k/ts-fhir-types";

export default class FhirResourceBuilder {
  public static attachment(
    mimetype: string,
    title: string,
    url: string,
    creation: string,
  ): fhir.IAttachment {
    const attachment: fhir.IAttachment = {
      contentType: mimetype,
      title: title,
      url: url,
      creation: creation,
    };
    return attachment;
  }
}
