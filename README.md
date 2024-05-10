# Cloud-Computing
CSE 546 - Cloud Computing
I took the CSE 546: cloud computing course as part of my masters in Computer Science program at ASU. This course provided a comprehensive understanding of the fundamental principles and concepts of cloud computing, alongside practical skills for developing cloud applications using popular Infrastructure-as-a-Service and Platform-as-a-Service resources. Employing an innovative bottom-up approach, the course covered the underlying technologies such as virtualization in cloud computing, as well as practical cloud programming techniques for both IaaS and PaaS.

The course involved 2 major projects each divided into 2 parts - 

**Project 1 - IAAS**

_**Part 1 -**_ In Part 1, the project began with setting up an AWS account and creating an IAM user along with other necessary configurations. Following this, an EC2 Instance was created to serve as the web tier. This instance hosted a server that continuously listened to incoming HTTP requests. Upon receiving a request containing images of faces, the server cross-referenced the filenames with a CSV file mapping them to respective person names. Finally, the recognition result was printed out for the user. The server underwent testing with 1000 images, completing the classification process in 2.2 seconds, correctly identifying all 1000 images.

_**Part 2 -**_ 
In Part 2 of the project, the Web Tier, operating on the same EC2 instance as Part 1, functioned on port 8000. It received user images, directing them to the App Tier for classification using a machine learning model, instead of referencing a CSV mapping file. The results were then returned to users. Communication between Web and App Tiers took place through two SQS Queues: request and response queues. Additionally, the Web Tier managed auto-scaling.To handle concurrency and auto-scaling, 20 App Tier instances were deployed. The Web Tier, overseeing auto-scaling, initiated App Tier instances based on HTTP request volume, utilizing a custom auto-scaling algorithm.
Once all input images were classified, they were stored in an S3 input bucket, while results were stored in an output bucket, ensuring data persistence and easy access to processed data.

**Project 2 - PAAS**
