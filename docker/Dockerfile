FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV GIT_SSL_NO_VERIFY=1

RUN apt-get update  \
    && apt-get install --no-install-recommends -y \
        sudo less make bash-completion \
        nodejs npm \
        libnss3 libgtk-3.0 libgbm1 libasound2t64 libcanberra-gtk* \
        wine zip \
    && rm -rf /var/lib/apt/lists/*

# Create an user
# 1000 は 24.04 では既に使われているので 2000 に変更 
ARG USERNAME=user
ARG USER_UID=2000
ARG USER_GID=2000
RUN groupadd --gid $USER_GID $USERNAME && \
    useradd --uid $USER_UID --gid $USER_GID -m $USERNAME

# user と root にパスワードを設定
RUN echo "root:root" | chpasswd
RUN echo "user:user" | chpasswd

# Set the entry point
# "entrypoint.sh" changes a user ID dynamically.
# If no additional commands are not passed, /bin/bash is launched.
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/bin/bash"]
