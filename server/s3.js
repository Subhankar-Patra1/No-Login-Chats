const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.AWS_BUCKET_NAME;

const missingVars = [];
if (!region) missingVars.push('AWS_REGION');
if (!accessKeyId) missingVars.push('AWS_ACCESS_KEY_ID');
if (!secretAccessKey) missingVars.push('AWS_SECRET_ACCESS_KEY');
if (!bucketName) missingVars.push('AWS_BUCKET_NAME');

if (missingVars.length > 0) {
    console.error(`[S3 Error] Missing AWS environment variables: ${missingVars.join(', ')}. Audio uploads will fail.`);
}

const s3Client = new S3Client({
    region,
    credentials: {
        accessKeyId,
        secretAccessKey
    }
});

const uploadFile = async (fileBuffer, fileName, mimeType) => {
    const uploadParams = {
        Bucket: bucketName,
        Body: fileBuffer,
        Key: fileName,
        ContentType: mimeType
    };

    try {
        await s3Client.send(new PutObjectCommand(uploadParams));
        // Construct the URL manually or use a signed URL if private.
        // Assuming public read or specific bucket policy for now, or just returning the URL structure.
        // Standard S3 URL: https://bucket-name.s3.region.amazonaws.com/key
        const url = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;
        return url;
    } catch (err) {
        console.error("S3 Upload Error", err);
        throw err;
    }
};

module.exports = { uploadFile };
