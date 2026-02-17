---
title: Frigate 0.16.1 TensorRT ONNX Model Proper Ingestion
date: 2025-09-11 14:43:11
tags:
    - frigate
    - detection
    - ai
    - docker
categories: 
    - homelab

---
I’ve been using Frigate as my security camera recorder and viewer (aka NVR) for quite a while now. Initially, I ran a single instance that monitored cameras from two different locations. Later, I split them into separate instances—one for remote and one for home.  

I had been running ***0.15.x*** on the following hardware setup:

```
- AMD Ryzen 3500X 
- Nvidia GTX 1660 Super 
```

## Background

For some time, I used the YOLOv7 detector model, which worked reasonably well out of the box without needing any customizations or training.  

However, with ***0.16.0***, Frigate introduced a breaking change:

> The TensorRT detector has been removed for Nvidia GPUs, the ONNX detector should be used instead. Nvidia recently pushed newer packages and dropped compatibility for older versions of TensorRT. Supporting native TensorRT detector directly has shown to be a large burden, making supporting newer hardware more difficult and increasing the difficulty in updating ONNX runtime. The decision has been made to remove the TensorRT detector which will allow us to focus on supporting more models and bringing more features to the Nvidia platform through ONNX runtime. Users who were running the TensorRT detector will need to update their configuration to use the ONNX detector, and download a new model. YOLO-NAS or YOLOv9 are recommended as they provide superior performance and accuracy compared to the models supported by TensorRT.

[Release Note](https://github.com/blakeblackshear/frigate/releases/tag/v0.16.0)

That meant my existing TensorRT models wouldn’t work anymore in ***0.16.x***.  

I decided to hold off for a bit and watch community feedback around the new changes, just in case there were hidden issues. Once ***0.16.1*** came out, I felt confident enough to upgrade.  



## Issue

As a good practice, I checked the documentation first to understand what changed.  

That’s when I ran into the next challenge: the replacement for TensorRT, the ONNX detector, **no longer ships with prebuilt models**—even if you’re using the ***0.16.x-tensorrt*** images.  

In other words: _you now have to provide your own models_.  

[Reference](https://docs.frigate.video/configuration/object_detectors/#supported-models-2)



## Solution

Frigate provides multiple ways to convert models into ONNX.  
[Reference](https://docs.frigate.video/configuration/object_detectors/#downloading-yolo-nas-model)

Since I was upgrading anyway, I decided to also update my model: moving from **YOLOv7** to **YOLOv9**.  

> Don’t bother with YOLOX models—they haven’t had an update in over 3 years.  

I chose YOLOv9 because YOLO-NAS is far more advanced than I need for my setup.  



## Actual Solution

The documentation shows how to build/convert YOLOv9 locally using Docker:

```
docker build . --build-arg MODEL_SIZE=t --build-arg IMG_SIZE=320 --output . -f- <<'EOF'
FROM python:3.11 AS build
RUN apt-get update && apt-get install --no-install-recommends -y libgl1 && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.8.0 /uv /bin/
WORKDIR /yolov9
ADD https://github.com/WongKinYiu/yolov9.git .
RUN uv pip install --system -r requirements.txt
RUN uv pip install --system onnx==1.18.0 onnxruntime onnx-simplifier>=0.4.1
ARG MODEL_SIZE
ARG IMG_SIZE
ADD https://github.com/WongKinYiu/yolov9/releases/download/v0.1/yolov9-${MODEL_SIZE}-converted.pt yolov9-${MODEL_SIZE}.pt
RUN sed -i "s/ckpt = torch.load(attempt_download(w), map_location='cpu')/ckpt = torch.load(attempt_download(w), map_location='cpu', weights_only=False)/g" models/experimental.py
RUN python3 export.py --weights ./yolov9-${MODEL_SIZE}.pt --imgsz ${IMG_SIZE} --simplify --include onnx
FROM scratch
ARG MODEL_SIZE
ARG IMG_SIZE
COPY --from=build /yolov9/yolov9-${MODEL_SIZE}.onnx /yolov9-${MODEL_SIZE}-${IMG_SIZE}.onnx
EOF
```

Unfortunately, this didn’t work for me:

```
[1/2] STEP 5/12: ADD https://github.com/WongKinYiu/yolov9.git . --> a50c24af86c5
[1/2] STEP 6/12: RUN uv pip install --system -r requirements.txt error: File not found: requirements.txt Error: building at STEP "RUN uv pip install --system -r requirements.txt": while running runtime: exit status 2
```

After some investigation, the issue was obvious:  

The `requirements.txt` path in the docs snippet is stale. WongKinYiu’s YOLOv9 repo doesn’t put it at the root where Docker expects during `ADD`. It only shows up properly after a `git clone`.  

Why Frigate wrote it this way, I’m not sure—maybe the repo changed after the docs were written, or maybe an AI-assisted edit introduced the mistake.  

Here’s my corrected and working version:

```
docker build .   --build-arg MODEL_SIZE=c   --build-arg IMG_SIZE=640   --output .   -f- <<'EOF'
FROM python:3.11 AS build
RUN apt-get update && apt-get install --no-install-recommends -y git libgl1 && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.8.0 /uv /bin/
WORKDIR /yolov9
RUN git clone https://github.com/WongKinYiu/yolov9.git .
RUN uv pip install --system -r requirements.txt
RUN uv pip install --system onnx==1.18.0 onnxruntime onnx-simplifier>=0.4.1
ARG MODEL_SIZE
ARG IMG_SIZE
ADD https://github.com/WongKinYiu/yolov9/releases/download/v0.1/yolov9-${MODEL_SIZE}-converted.pt yolov9-${MODEL_SIZE}.pt
RUN sed -i "s/ckpt = torch.load(attempt_download(w), map_location='cpu')/ckpt = torch.load(attempt_download(w), map_location='cpu', weights_only=False)/g" models/experimental.py
RUN python3 export.py --weights ./yolov9-${MODEL_SIZE}.pt --imgsz ${IMG_SIZE} --simplify --include onnx
FROM scratch
ARG MODEL_SIZE
ARG IMG_SIZE
COPY --from=build /yolov9/yolov9-${MODEL_SIZE}.onnx /yolov9-${MODEL_SIZE}-${IMG_SIZE}.onnx
EOF
```

I went with the `C` size model, which is fairly large. If you don’t need that level of performance, there are smaller variants.  
[Size Reference](https://github.com/WongKinYiu/yolov9?tab=readme-ov-file#performance)



## Caution

- This build creates the model file in whatever folder you run it from. I created a dedicated folder that I mounted into both my Frigate instances.  
  ```
  - ./frigate-model:/config/models
  ```

- The build process uses ~20–25 GB of space, so having an SSD is basically a requirement.  

Once the model is built, you’ll need to update your `config.yaml`. Here’s mine:

```
detectors:
  onnx:
    type: onnx


model:
  path: /config/models/yolov9-c-640.onnx
  input_tensor: nchw
  input_pixel_format: rgb
  width: 640
  height: 640
  model_type: yolo-generic
  input_dtype: float
```

> Update: Feb 17, 2026

### NumPy version error

If you face this issue while running the build command

```
6.356 RuntimeError: NumPy was built with baseline optimizations:
6.356 (X86_V2) but your machine doesn't support:
```

You need to pin your NumPy version. 

Update the install command with this

`RUN uv pip install --system -r requirements.txt "numpy<2"`



## Conclusion

This setup works well for my specific case: an AMD CPU paired with an NVIDIA GPU.  
Your mileage may vary depending on your hardware and needs, but if you’re running into ONNX model ingestion issues with Frigate 0.16.1, I hope this helps smooth out the process.
