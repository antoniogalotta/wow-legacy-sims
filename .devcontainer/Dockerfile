# syntax=docker/dockerfile:1

FROM golang:1.23

# Create a non-root user
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && apt-get update \
    && apt-get install -y sudo \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

WORKDIR /wotlk

# Install dependencies needed for building and development
RUN apt-get update && apt-get install -y \
    protobuf-compiler \
    zip \
    unzip \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Fix permissions for /go so the non-root user can install tools
RUN chown -R $USERNAME:$USERNAME /go

USER $USERNAME

# Install Go protobuf plugin
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest

# Install Node.js using NVM (matching project requirement)
ENV NODE_VERSION=19.8.0
ENV NVM_DIR="/home/$USERNAME/.nvm"
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash && \
    . "$NVM_DIR/nvm.sh" && \
    nvm install ${NODE_VERSION} && \
    nvm use ${NODE_VERSION} && \
    nvm alias default ${NODE_VERSION}

# Update PATH to include Go binaries and Node.js
ENV PATH="/home/$USERNAME/go/bin:/go/bin:/usr/local/go/bin:/home/$USERNAME/.nvm/versions/node/v${NODE_VERSION}/bin:${PATH}"

# Expose the default server port
EXPOSE 3333/tcp
# Expose the default UI dev port
EXPOSE 8080/tcp
