#__copyright__   = "Copyright 2024, VISA Lab"
#__license__     = "MIT"


import boto3
import os
import subprocess
import json
import urllib
from boto3 import client as boto3_client
from botocore.exceptions import NoCredentialsError


# Initialize the S3 client
s3 = boto3.client('s3')

input_bucket = '1225622346-input'
stage_1_bucket = '1225622346-stage-1'


# main()
def lambda_handler(event, context):
    bucket = event["Records"][0]["s3"]["bucket"]["name"]
    key = urllib.parse.unquote_plus(event["Records"][0]["s3"]["object"]["key"], encoding="utf-8")
        
    # bucket = input_bucket
    # key = record['s3']['object']['key']
    download_path = '/tmp/{}'.format(key)
    
    download_from_s3(bucket, key, download_path) # Downloading the video to tmp directory
    output_file_name = video_splitting_cmdline(download_path)
    
    
    upload_path_base = os.path.splitext(key)[0]
    # print(upload_path_base)

    upload_file_to_s3(output_file_name, stage_1_bucket)

    # output_file_name = os.path.splitext(os.path.basename(key))[0] + ".jpg"
    # print('output file name : ', output_file_name)

    target_function_name = 'face-recognition'
    payload = {
        'bucket_name': '1225622346-stage-1',
        'image_file_name': f'{output_file_name}'
      }
    invoke_lambda_async(target_function_name,payload)
    
    return {
        'statusCode': 200,
        'body': json.dumps('Successfully processed video.')
    }
    
    
def invoke_lambda_async(target_function_name,payload):
    print("Calling the face recognition function")
    lambda_client = boto3.client('lambda')
    
    response = lambda_client.invoke(
        FunctionName=target_function_name,
        InvocationType='Event', 
        Payload=json.dumps(payload)
    )


def download_from_s3(bucket, key, download_path):
    """Download video from S3 to the local filesystem."""
    s3.download_file(bucket, key, download_path)

def upload_file_to_s3(file_name, bucket, object_name=None):
    
    # If S3 object_name was not specified, use file_name
    if object_name is None:
        object_name = file_name

    # Upload the file
    s3_client = boto3.client('s3')
    try:
        s3_client.upload_file('/tmp/'+file_name, bucket, object_name)
    except NoCredentialsError:
        print("Credentials not available")
        return False
    return True




def video_splitting_cmdline(video_filename):
    filename = os.path.basename(video_filename)
    outfile = os.path.splitext(filename)[0] + ".jpg"
    
    split_cmd = 'ffmpeg -i ' + video_filename + ' -vframes 1 ' + '/tmp/' + outfile
    try:
        subprocess.check_call(split_cmd, shell=True)
    except subprocess.CalledProcessError as e:
        print(e.returncode)
        print(e.output)

    fps_cmd = 'ffmpeg -i ' + video_filename + ' 2>&1 | sed -n "s/.*, \\(.*\\) fp.*/\\1/p"'
    fps = subprocess.check_output(fps_cmd, shell=True).decode("utf-8").rstrip("\n")
    return outfile

