import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  endpoint: `https://s3.${process.env.AWS_REGION}.amazonaws.com`,
  s3ForcePathStyle: true,
});
  
export async function uploadLogsToS3(requestId, logs) {
  const sortedLogs = logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const fileContent = JSON.stringify(sortedLogs, null, 2);
  const fileName = `logs/${requestId}.json`;
  
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileName,
    Body: fileContent,
    ContentType: 'application/json',
  };
  
  try {
    await s3.upload(params).promise();
    console.log(`Logs uploaded to S3 for request ${requestId}`);
  } catch (error) {
    console.error(`Error uploading logs to S3: ${error.message}`);
  }
}