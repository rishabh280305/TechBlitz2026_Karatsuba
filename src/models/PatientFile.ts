import { Schema, model, models, Types, type InferSchemaType } from "mongoose";

const patientFileSchema = new Schema(
  {
    clinicId: { type: String, required: true, index: true },
    patientId: { type: Types.ObjectId, ref: "Patient", required: true, index: true },
    doctorId: { type: Types.ObjectId, ref: "User", required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    data: { type: String, required: true }, // base64 encoded
    category: {
      type: String,
      enum: ["blood-report", "scan", "xray", "prescription", "document", "other"],
      default: "document",
    },
  },
  { timestamps: true },
);

patientFileSchema.index({ patientId: 1, clinicId: 1, createdAt: -1 });

export type PatientFileDocument = InferSchemaType<typeof patientFileSchema> & { _id: string };

export const PatientFileModel = models.PatientFile ?? model("PatientFile", patientFileSchema);
