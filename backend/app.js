const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require("@aws-sdk/client-sqs");

const { fromIni } = require("@aws-sdk/credential-provider-ini");
const sqs = new SQSClient({
  credentials: fromIni({ profile: "default" }),
});
const reqQueueUrl = "Your request queue URL";
const respQueueUrl ="Your response queue URL";

const inputBucketName = "Your Input Bucket Name";
const outputBucketName = "Your Output Bucket Name";

const s3 = new S3Client({
  credentials: fromIni({ profile: "default" }),
});


const homeDir = process.env.HOME;
const modelDir = path.join(homeDir, "model");
const appDir = path.join(homeDir, "app");
const tempDir = path.join(appDir, "temp");

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

function getRequestfromWebTier() {
  try {
    const receiveParams = {
      QueueUrl: reqQueueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 19,
    };
    sqs.send(new ReceiveMessageCommand(receiveParams)).then((received) => {
      if (received.Messages && received.Messages.length > 0) {
        const message = received.Messages[0];
        const body = JSON.parse(message.Body);
        const { fileName, imageData } = body;
        const tempFilePath = path.join(tempDir, fileName);

        
        fs.writeFileSync(tempFilePath, Buffer.from(imageData, "base64"));

        const pythonScriptPath = path.join(modelDir, "face_recognition.py");

        exec(
          `python3 ${pythonScriptPath} ${tempFilePath}`,
          async (error, stdout, stderr) => {
            if (error) {
              console.error(`exec error: ${error}`);
              return;
            }
            console.log(`Recognition result: ${stdout.trim()}`);

            const recognitionResult = stdout.trim();
            const resultKey = fileName.split(".").slice(0, -1).join(".");
            
            await s3.send(
              new PutObjectCommand({
                Bucket: outputBucketName,
                Key: resultKey,
                Body: recognitionResult,
              })
            );
            const responseMessage = {
              fileName: resultKey + ".jpg",
              result: recognitionResult,
            };
            await sqs.send(
              new SendMessageCommand({
                QueueUrl: respQueueUrl,
                MessageBody: JSON.stringify(responseMessage),
              })
            );
            console.log(`uploaded to S3 as ${resultKey}`);
            console.log("Message sent to Resp QUEUE.");

            sqs
              .send(
                new DeleteMessageCommand({
                  QueueUrl: reqQueueUrl,
                  ReceiptHandle: message.ReceiptHandle,
                })
              )
              .then(() => {
                fs.unlinkSync(tempFilePath);
                setImmediate(getRequestfromWebTier);
              });
          }
        );
      } else {
        console.log("DONEE.");
        setTimeout(getRequestfromWebTier, 10500); 
      }
    });
  } catch (error) {
    console.error("Erroor found:", error);
    setTimeout(getRequestfromWebTier, 10500);
  }
}

getRequestfromWebTier();
