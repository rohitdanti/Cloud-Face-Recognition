#__copyright__   = "Copyright 2024, VISA Lab"
#__license__     = "MIT"


import boto3
import os
import subprocess
import math
import json

from boto3 import client as boto3_client

# Initialize the S3 client
s3 = boto3.client('s3')

input_bucket = '1225622346-input'
output_bucket = '1225622346-stage-1'


# main()
def handler(event, context):
    for record in event['Records']:
        # Use the input_bucket for consistency
        bucket = input_bucket
        key = record['s3']['object']['key']
        download_path = '/tmp/{}'.format(key)
        
        # Download the video to tmp directory
        download_from_s3(bucket, key, download_path)
        
        # Call the provided video_splitting_cmdline function
        output_dir = video_splitting_cmdline(download_path)
        print(output_dir)
        
        # Construct the base path for upload without the file extension
        upload_path_base = os.path.splitext(key)[0]
        print(upload_path_base)

        # Upload the frames to the output_bucket
        upload_to_s3(output_dir, upload_path_base)

    return {
        'statusCode': 200,
        'body': json.dumps('Successfully processed video.')
    }

def download_from_s3(bucket, key, download_path):
    """Download video from S3 to the local filesystem."""
    s3.download_file(bucket, key, download_path)

def upload_to_s3(output_dir, upload_path_base):
    """Upload frames from the local filesystem to the specified output_bucket."""
    files = os.listdir(output_dir)
    for file in files:
        frame_upload_path = '{}/{}'.format(upload_path_base, file)
        # Use the output_bucket for uploading files
        s3.upload_file(os.path.join(output_dir, file), output_bucket, frame_upload_path)
        print('uploaded')

def video_splitting_cmdline(video_filename):
    filename = os.path.basename(video_filename)
    outdir = os.path.splitext(filename)[0]
    outdir = os.path.join("/tmp",outdir)
    output_dir = outdir
    if not os.path.exists(outdir):
        os.makedirs(outdir)

    split_cmd = '/usr/bin/ffmpeg -ss 0 -r 1 -i ' +video_filename+ ' -vf fps=1/10 -start_number 0 -vframes 10 ' + outdir + "/" + 'output_%02d.jpg -y'
    try:
        subprocess.check_call(split_cmd, shell=True)
    except subprocess.CalledProcessError as e:
        print(e.returncode)
        print(e.output)

    fps_cmd = 'ffmpeg -i ' + video_filename + ' 2>&1 | sed -n "s/.*, \\(.*\\) fp.*/\\1/p"'
    fps = subprocess.check_output(fps_cmd, shell=True).decode("utf-8").rstrip("\n")
    fps = math.ceil(float(fps))
    return outdir
