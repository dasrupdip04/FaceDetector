import {
  FaceDetector,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

const demosSection = document.getElementById("demos");

let faceDetector;
let runningMode = "IMAGE";

// Initialize the face detector
const initializefaceDetector = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  faceDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
      delegate: "GPU"
    },
    runningMode: runningMode
  });
  demosSection.classList.remove("invisible");
};
initializefaceDetector();

/********************************************************************
 * Demo 1: Detect faces in images on click
 ********************************************************************/

const imageContainers = document.getElementsByClassName("detectOnClick");

for (let imageContainer of imageContainers) {
  imageContainer.children[0].addEventListener("click", handleClick);
}

async function handleClick(event) {
  const container = event.target.parentNode;
  ["highlighter", "info", "key-point"].forEach(cls => {
    const elements = container.getElementsByClassName(cls);
    while (elements[0]) elements[0].remove();
  });

  if (!faceDetector) {
    console.log("Wait for faceDetector to load before clicking");
    return;
  }

  if (runningMode === "VIDEO") {
    runningMode = "IMAGE";
    await faceDetector.setOptions({ runningMode: "IMAGE" });
  }

  const detections = faceDetector.detect(event.target).detections;
  displayImageDetections(detections, event.target);
}

function displayImageDetections(detections, resultElement) {
  const ratio = resultElement.height / resultElement.naturalHeight;

  for (let detection of detections) {
    const p = document.createElement("p");
    p.className = "info";
    p.innerText =
      "Confidence: " +
      Math.round(parseFloat(detection.categories[0].score) * 100) +
      "% .";
    p.style = `
      left: ${detection.boundingBox.originX * ratio}px;
      top: ${(detection.boundingBox.originY * ratio) - 30}px;
      width: ${detection.boundingBox.width * ratio - 10}px;
      height: 20px;
    `;

    const highlighter = document.createElement("div");
    highlighter.className = "highlighter";
    highlighter.style = `
      left: ${detection.boundingBox.originX * ratio}px;
      top: ${detection.boundingBox.originY * ratio}px;
      width: ${detection.boundingBox.width * ratio}px;
      height: ${detection.boundingBox.height * ratio}px;
    `;

    resultElement.parentNode.appendChild(highlighter);
    resultElement.parentNode.appendChild(p);

    for (let keypoint of detection.keypoints) {
      const keypointEl = document.createElement("span");
      keypointEl.className = "key-point";
      keypointEl.style.top = `${keypoint.y * resultElement.height - 3}px`;
      keypointEl.style.left = `${keypoint.x * resultElement.width - 3}px`;
      resultElement.parentNode.appendChild(keypointEl);
    }
  }
}

/********************************************************************
 * Demo 2: Webcam live face detection
 ********************************************************************/

const video = document.getElementById("webcam");
const liveView = document.getElementById("liveView");
let enableWebcamButton;

// Check if webcam access is supported
const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;

const children = [];

if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcamButton");
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}

async function enableCam() {
  if (!faceDetector) {
    alert("Face Detector is still loading. Please try again.");
    return;
  }

  enableWebcamButton.classList.add("removed");

  const constraints = {
    video: true
  };

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(function (stream) {
      video.srcObject = stream;
      video.addEventListener("loadeddata", predictWebcam);
    })
    .catch(err => {
      console.error(err);
    });
}

let lastVideoTime = -1;
async function predictWebcam() {
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await faceDetector.setOptions({ runningMode: "VIDEO" });
  }

  let startTimeMs = performance.now();

  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const detections = faceDetector.detectForVideo(video, startTimeMs).detections;
    displayVideoDetections(detections);
  }

  window.requestAnimationFrame(predictWebcam);
}

function displayVideoDetections(detections) {
  while (children.length > 0) {
    liveView.removeChild(children.pop());
  }

  for (let detection of detections) {
    const p = document.createElement("p");
    p.innerText =
      "Confidence: " +
      Math.round(parseFloat(detection.categories[0].score) * 100) +
      "% .";
    p.style = `
      left: ${video.offsetWidth - detection.boundingBox.width - detection.boundingBox.originX}px;
      top: ${detection.boundingBox.originY - 30}px;
      width: ${detection.boundingBox.width - 10}px;
    `;

    const highlighter = document.createElement("div");
    highlighter.className = "highlighter";
    highlighter.style = `
      left: ${video.offsetWidth - detection.boundingBox.width - detection.boundingBox.originX}px;
      top: ${detection.boundingBox.originY}px;
      width: ${detection.boundingBox.width - 10}px;
      height: ${detection.boundingBox.height}px;
    `;

    liveView.appendChild(highlighter);
    liveView.appendChild(p);
    children.push(highlighter, p);

    for (let keypoint of detection.keypoints) {
      const keypointEl = document.createElement("span");
      keypointEl.className = "key-point";
      keypointEl.style.top = `${keypoint.y * video.offsetHeight - 3}px`;
      keypointEl.style.left = `${
        video.offsetWidth - keypoint.x * video.offsetWidth - 3
      }px`;
      liveView.appendChild(keypointEl);
      children.push(keypointEl);
    }
  }
}
