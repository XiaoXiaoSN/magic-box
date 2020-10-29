FROM node:14.5

RUN apt update && \
    apt install -y jq && \
    npm install -g firebase-tools && \
    curl https://sdk.cloud.google.com > install.sh && \
    bash install.sh --disable-prompts && \
    echo '. /root/google-cloud-sdk/path.bash.inc' >> ~/.bashrc

ENTRYPOINT /bin/bash