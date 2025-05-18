#__copyright__   = "Copyright 2024, VISA Lab"
#__license__     = "MIT"


ARG FUNCTION_DIR="/home/app/"
ARG RUNTIME_VERSION="3.12"

FROM python:${RUNTIME_VERSION}-slim AS python-base
RUN python${RUNTIME_VERSION}-slim -m pip install --upgrade pip

FROM python:${RUNTIME_VERSION}-slim AS build-image
ARG FUNCTION_DIR
ARG RUNTIME_VERSION
RUN mkdir -p ${FUNCTION_DIR}
RUN python${RUNTIME_VERSION} -m pip install awslambdaric --target ${FUNCTION_DIR}

FROM python:${RUNTIME_VERSION}-slim
ARG FUNCTION_DIR
WORKDIR ${FUNCTION_DIR}
COPY --from=build-image ${FUNCTION_DIR} ${FUNCTION_DIR}
COPY requirements.txt requirements_extra.txt data.pt ${FUNCTION_DIR}
RUN python${RUNTIME_VERSION} -m pip install --no-cache-dir -r requirements.txt --target ${FUNCTION_DIR}
RUN python${RUNTIME_VERSION} -m pip install --no-cache-dir --no-deps facenet-pytorch==2.5.3 --target ${FUNCTION_DIR}
COPY entry.sh /
COPY faceRecog.py ${FUNCTION_DIR}
RUN chmod 777 /entry.sh

ENTRYPOINT [ "/entry.sh" ]
CMD [ "faceRecog.lambda_handler" ]