import { R4 as fhir } from "@ahryman40k/ts-fhir-types";

export default class FhirResourceBuilder {
  public static attachment(
    mimetype: string | null,
    title: string | null,
    url: string,
    creation: string | undefined
  ): fhir.IAttachment {
    return {
      attachment: {
        contentType: {
          system: "http://hl7.org/fhir/ValueSet/mimetypes",
          value: mimetype,
        },
        title: {
          value: title,
        },
        url: url,
        creation: creation,
      },
    } as fhir.IAttachment;
  }
}
