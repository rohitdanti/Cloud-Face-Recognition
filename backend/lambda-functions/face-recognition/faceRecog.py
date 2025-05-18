__copyright__   = "Copyright 2024, VISA Lab"
__license__     = "MIT"

import os
import cv2
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1
from shutil import rmtree
import torch
import boto3

# Initialize the S3 client
s3 = boto3.client('s3')

stage_1_bucket = '1225622346-stage-1'
output_bucket  = '1225622346-output'
# storage_bucket = 'cc-test-bucket-rohit'

mtcnn = MTCNN(image_size=240, margin=0, min_face_size=20) # initializing mtcnn for face detection
resnet = InceptionResnetV1(pretrained='vggface2').eval() # initializing resnet for face img to embeding conversion

def face_recognition_function(key_path):
    # Face extraction
    img = cv2.imread(key_path, cv2.IMREAD_COLOR)
    boxes, _ = mtcnn.detect(img)

    # Face recognition
    key = os.path.splitext(os.path.basename(key_path))[0].split(".")[0]
    img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    face, prob = mtcnn(img, return_prob=True, save_path=None)
    saved_data = torch.load('./data.pt')  # loading data.pt file
    if face != None:
        emb = resnet(face.unsqueeze(0)).detach()  # detech is to make required gradient false
        embedding_list = saved_data[0]  # getting embedding data
        name_list = saved_data[1]  # getting list of names
        dist_list = []  # list of matched distances, minimum distance is used to identify the person
        for idx, emb_db in enumerate(embedding_list):
            dist = torch.dist(emb, emb_db).item()
            dist_list.append(dist)
        idx_min = dist_list.index(min(dist_list))

        # Save the result name in a file
        with open("/tmp/" + key + ".txt", 'w+') as f:
            f.write(name_list[idx_min])
        return name_list[idx_min]
    else:
        print(f"No face is detected")
    return

def lambda_handler(event, context):
    # Extract bucket name and image file name from the event
    # bucket_name = event["Records"][0]["s3"]["bucket"]["name"]
    # image_file_name = 'test_00.jpg'
    bucket_name = event['bucket_name']
    image_file_name = event['image_file_name']
    download_path = f"/tmp/{image_file_name}"
    
    # Download the image from S3 bucket
    s3.download_file(Bucket=bucket_name, Key=image_file_name, Filename=download_path)
    print(f"Downloaded {image_file_name} from bucket {bucket_name} to {download_path}")
    
    # Perform face recognition
    recognition_result = face_recognition_function(download_path)

    # Upload result as a text file to the output bucket
    if recognition_result:
        output_file_key = os.path.splitext(image_file_name)[0] + ".txt"
        upload_path = '/tmp/' + output_file_key
        s3.upload_file(upload_path, output_bucket, output_file_key)