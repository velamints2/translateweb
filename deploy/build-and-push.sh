#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME=${IMAGE_NAME:-"registry.example.com/translate-app"}
IMAGE_TAG=${IMAGE_TAG:-"$(date +%Y%m%d-%H%M%S)"}

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR"

echo "Building image: ${IMAGE_NAME}:${IMAGE_TAG}"
docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" -f Dockerfile .

echo "Pushing image: ${IMAGE_NAME}:${IMAGE_TAG}"
docker push "${IMAGE_NAME}:${IMAGE_TAG}"

echo "Done. Update your compose file or deployment manifests to reference ${IMAGE_NAME}:${IMAGE_TAG}."
