# ☁️ Cloud-Scale Face Recognition System (AWS IaaS + PaaS)

This repository presents a full-fledged, cloud-native face recognition pipeline built using both Infrastructure-as-a-Service (IaaS) and Platform-as-a-Service (PaaS) paradigms on AWS. The project handles real-time image and video classification using deep learning, and is optimized for high throughput and cost-effective scalability.

Designed to simulate production-grade media intelligence and security workflows, this system features autoscaling EC2 tiers, event-driven Lambda functions, Dockerized machine learning inference, and persistent cloud storage with S3.

---

## 🔧 Project Overview

| Component                   | Description                                                                 |
|-----------------------------|-----------------------------------------------------------------------------|
| 🖥 Web Tier (EC2)           | Accepts user image uploads, processes requests, and coordinates system flow |
| 🧠 App Tier (EC2)           | Worker instances performing ML inference (CSV lookup or ResNet model)       |
| 📽 Lambda: Video Split      | Serverless frame extractor triggered on video upload                        |
| 🧬 Lambda: Face Recognition | ML inference on extracted frames using SSD & ResNet                         |
| ☁️ Storage (S3)             | Persistent input, intermediate, and output buckets                          |
| 📬 Messaging (SQS)          | Request-response queue between tiers (for decoupled EC2 tiers)              |

---

## 🏗 Architecture Diagram

> Add to `/architecture/` if you have PNGs or use draw.io / Lucidchart exports.

```
User Uploads
     ↓
[S3 Input Bucket] ───> [Lambda: Video Split]
                          ↓ (frame)
                    [S3 Stage-1 Bucket] ────> [Lambda: Face Recog] ───→ [S3 Output Bucket]
                                              ↓                            ↑
                                Pretrained CNN (ResNet-34)         TXT result (identity)

--- parallel path ---

[EC2 Web Tier] <─> [SQS] <─> [EC2 App Tier(s)] <─> [ResNet] <─> [S3]
```

---

## 📁 Directory Structure

```
cloud-face-recognition/
├── backend/
│   ├── web-tier/
│   │   ├── server.js
│   │   ├── web.js
│   │   ├── app.js
│   │   ├── face_recognition.py
│   │   └── images.csv
│   └── lambda-functions/
│       ├── video-split/
│       │   ├── handler.py
│       │   ├── entry.sh
│       │   ├── Dockerfile
│       │   └── requirements.txt
│       └── face-recognition/
│           ├── handler.py
│           ├── faceRecog.py
│           ├── Dockerfile
│           ├── requirements.txt
│           └── requirements_extra.txt
├── architecture/
│   ├── iaas-architecture.png
│   └── paas-architecture.png
└── README.md
```

---

## 🧪 How to Test

1. **Image Classification via EC2**
   - POST `.jpg` file to Web Tier on port `8000`
   - Output: `<filename>:<name>` from either CSV or inference

2. **Video Face Recognition via Lambda**
   - Upload `.mp4` to `<id>-input` bucket
   - Frame appears in `<id>-stage-1`
   - Result `.txt` appears in `<id>-output`

---

## 📌 Technical Highlights

- ⚡ Custom EC2 Auto-scaling (SDK-controlled, not AWS-native)
- 🐳 Docker-based Lambda packaging for heavy ML dependencies
- 🧠 SSD + ResNet-based inference pipeline
- 🌐 Express.js + Multer + Boto3 integrations
- 🔐 Least-privilege IAM, async Lambda invokes, FFmpeg layer config

---

## 🔒 Security

- IAM-scoped policies for S3, SQS, EC2, and Lambda
- Elastic IP configured on EC2 instance
- FFmpeg added via Lambda layer or container install
- All input validation (extensions, bucket names) enforced

---

## 📝 Summary

This project showcases end-to-end cloud architecture, auto-scalability, serverless execution, and ML inference across EC2 and Lambda environments. It reflects practical expertise in distributed systems, DevOps integration, and cloud-native AI design.

---
