import { S3Client } from "@aws-sdk/client-s3";

const isAWS = process.env.USE_AWS === "true";

const s3 = isAWS
    ? new S3Client({
          region: process.env.AWS_S3_REGION || process.env.AWS_REGION || "us-east-1",
          ...(process.env.AWS_ACCESS_KEY_ID && {
              credentials: {
                  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
              },
          }),
      })
    : null;

export const BUCKET = process.env.AWS_S3_BUCKET_NAME || "";

export default s3;
