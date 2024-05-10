const express = require("express");
const multer = require("multer");
const {
  EC2Client,
  StartInstancesCommand,
  StopInstancesCommand,
  DescribeInstancesCommand,
} = require("@aws-sdk/client-ec2");
const {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
} = require("@aws-sdk/client-sqs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { fromIni } = require("@aws-sdk/credential-provider-ini");
const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const sqs = new SQSClient({
  credentials: fromIni({ profile: "default" }),
});
const s3 = new S3Client({
  credentials: fromIni({ profile: "default" }),
});
const ec2 = new EC2Client({ profile: "default" });

const reqQueueUrl = "Your request queue URL";
const respQueueUrl ="Your response queue URL";

const inputBucket = "Your Input Bucket Name";
const outputBucket = "Your Output Bucket Name";

const instanceIds = ["All", "20", "instance", "IDs"];

async function adjustEC2Instances(ruuningInstances) {
  const { startInstances, stopInstances, runningInstances, stoppedInstances } =
    await getCurrentInstanceState();

  const running = runningInstances.length;
  const instNeeded = ruuningInstances - running;

  if (instNeeded > 0) {
    const instancesToStarttt = startInstances.slice(0, instNeeded);
    if (instancesToStarttt.length > 0) {
      try {
        await ec2.send(
          new StartInstancesCommand({ InstanceIds: instancesToStarttt })
        );
        console.log(`Starteddd instances: ${instancesToStarttt.join(", ")}`);
      } catch (error) {
        console.error(`Errorrr starting instances: ${error}`);
      }
    }
  } else if (ruuningInstances === 0) {
    const instancesToStopp = stopInstances.slice(0, Math.abs(instNeeded));
    if (instancesToStopp.length > 0) {
      try {
        await ec2.send(
          new StopInstancesCommand({ InstanceIds: instancesToStopp })
        );
        console.log(
          `Instances has been Stopped : ${instancesToStopp.join(", ")}`
        );
      } catch (error) {
        console.error(`Error occured while stopping the instances: ${error}`);
      }
    }
  }
}

async function fetchMessageCount() {
  const getAttributesCommand = new GetQueueAttributesCommand({
    QueueUrl: reqQueueUrl,
    AttributeNames: ["ApproximateNumberOfMessages"],
  });

  const commandResponse = await sqs.send(getAttributesCommand);
  const messageCount = parseInt(
    commandResponse.Attributes.ApproximateNumberOfMessages,
    10
  );

  return messageCount;
}

async function adjustInstanceCount() {
  let messages = await fetchMessageCount();
  console.log("message count:" + messages);

  if (messages === 0) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    messages = await fetchMessageCount();
    console.log("Recheck count of requests -- " + messages);
  }

  let targetInstances = 0;
  if (messages <= 10) {
    targetInstances = messages;
  } else {
    targetInstances = Math.min(20, 10 + Math.ceil((messages - 10) / 4));
  }

  await adjustEC2Instances(targetInstances);
}

async function getCurrentInstanceState() {
  const command = new DescribeInstancesCommand({
    InstanceIds: instanceIds,
  });

  const response = await ec2.send(command);
  const startInstances = [];
  const stopInstances = [];
  const runningInstances = [];
  const stoppedInstances = [];

  response.Reservations.forEach((reservation) => {
    reservation.Instances.forEach((instance) => {
      const state = instance.State.Name;
      if (state === "running" || state === "pending") {
        runningInstances.push(instance.InstanceId);
      } else if (state === "stopped") {
        startInstances.push(instance.InstanceId);
      } else if (state === "shutting-down") {
        stoppedInstances.push(instance.InstanceId);
      }
    });
  });

  stopInstances.push(...runningInstances);

  return {
    startInstances,
    stopInstances,
    runningInstances,
    stoppedInstances,
  };
}
setInterval(adjustInstanceCount, 5 * 1000);
const flag = true;
async function fetchAndHandleQueueMessages() {
  const fetchParams = {
    QueueUrl: respQueueUrl,
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 20,
  };

  while (flag) {
    try {
      const { Messages } = await sqs.send(
        new ReceiveMessageCommand(fetchParams)
      );
      if (Messages) {
        for (const msg of Messages) {
          const { fileName, result } = JSON.parse(msg.Body);
          console.log(fileName, result);

          if (pendingClassifications[fileName]) {
            pendingClassifications[fileName].resolve(result);
          }

          const removalParams = {
            QueueUrl: respQueueUrl,
            ReceiptHandle: msg.ReceiptHandle,
          };
          await sqs.send(new DeleteMessageCommand(removalParams));
        }
      }
    } catch (error) {
      console.error("Error handling SQS messages:", error);
    }
  }
}

fetchAndHandleQueueMessages();

const pendingClassifications = {};

/* MAIN METHOD - CONTROL STARTS HERE
 *  METHOD = POST
 */

app.post("/", upload.single("inputFile"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file was uploaded.");
  }

  const fileContent = req.file.buffer;
  const fileName = req.file.originalname;

  const uploadParams = {
    Bucket: inputBucket,
    Key: fileName,
    Body: fileContent,
  };

  try {
    await s3.send(new PutObjectCommand(uploadParams));
    console.log("File has been uploaded successfully.");
  } catch (err) {
    console.error("Error occured during uploading of file: ", err);
    return res.status(500).send("Error uploading file.");
  }

  const sqsParams = {
    QueueUrl: reqQueueUrl,
    MessageBody: JSON.stringify({
      fileName: fileName,
      imageData: fileContent.toString("base64"),
    }),
  };

  try {
    await sqs.send(new SendMessageCommand(sqsParams));
    console.log("Message has been sent to SQS.");
  } catch (err) {
    console.error("Error occured while sending message to SQS: ", err);
    return res.status(500).send("Error occured while sending message to SQS.");
  }

  let resolveFn, rejectFn;
  const promise = new Promise((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });
  pendingClassifications[fileName] = { resolve: resolveFn, reject: rejectFn };

  try {
    const faceRecogResult = await promise;
    console.log("RESULTS -- > " + faceRecogResult);
    res.send(`${fileName}:${faceRecogResult}`);
  } catch (error) {
    res.status(500).send("Error occured during processing of files.");
  } finally {
    delete pendingClassifications[fileName];
  }
});

//the web tier listens on port 8000
app.listen(8000, () => {
  console.log("Web.js listening on port 8000");
});
