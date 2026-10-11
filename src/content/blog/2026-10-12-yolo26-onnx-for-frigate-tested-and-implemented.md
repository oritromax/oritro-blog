---
title: Yolo26 Onnx For Frigate - Tested and Implemented
date: 2026-10-12 12:00:00
tags:
    - frigate
    - yolo
    - onnx
    - detection
    - ai
categories:
    - homelab
description: YOLO26 doesn't work in Frigate out of the box. Here is why, how i exported it so it does, and how all 10 models did against YOLOv9 on a real recording.
---

YOLO26 is the newest model from Ultralytics, released January 2026, and it doesn't work in Frigate out of the box.

I have been running YOLOv9 on Frigate since the 0.16 upgrade ( [the export post is here](https://ioritro.com/blog/2025-09-01-frigate-onnx-detection-model/) ), and last night i finally finished exporting every v9 size, at both 320 and 640. So the obvious next question was, can i run YOLO26 instead, and is it actually better. I went down the rabbit hole, exported all of them, tested all of them in Frigate, and this post is the whole thing.

My setup, for context:

```
- Frigate 0.17.1, tensorrt image
- ONNX detector on CUDA, model_type yolo-generic
- Nvidia RTX 2080 Ti
- Current model: YOLOv9-S, 640
```

## The Problem With YOLO26

There are two problems, one political and one technical.

The political one first. Frigate doesn't officially support Ultralytics models. Not YOLO26, not YOLO11, not YOLOv8. A maintainer said it plainly on the YOLO26 feature request, *"Frigate is not able to officially support Ultralytics models at this time"*, and pointed to [PR #10717](https://github.com/blakeblackshear/frigate/pull/10717) for the reasons. The detector docs don't mention YOLO26 at all. So whatever you do here, you are on your own if a Frigate upgrade breaks it.

The technical one is the actual blocker. YOLO26 ships with two detection heads:

| Head | Output shape | Needs NMS | Default export |
|---|---|---|---|
| One-to-one ( end-to-end ) | `[1, 300, 6]` | No | Yes |
| One-to-many ( classic ) | `[1, 84, 8400]` at 640 | Yes | No |

The whole selling point of YOLO26 is the end-to-end head, it does its own filtering and spits out up to 300 final boxes, no NMS needed. That is also the default when you export it. But Frigate's `yolo-generic` post-processing expects the classic YOLO layout, 84 rows ( 4 box coordinates + 80 COCO class scores ) by 8400 candidates, and then runs its own NMS on top. Feed it `[1, 300, 6]` and it reads the wrong numbers as the wrong things.

## What People Ran Into

I went through the Frigate GitHub discussions before touching anything, and the reports are all over the place:

- **Confidence scores of 6000% and 10000%.** Multiple people reported this, along with *"random bicycles everywhere"* and *"a bike in the sky"*. That is exactly what happens when Frigate reads a `[1, 300, 6]` tensor as if it were `[1, 84, 8400]`, box coordinates end up getting treated as class scores.
- **No detections at all.** One user exported YOLO26-M as both ONNX and OpenVINO and got nothing back from Frigate.
- **Double the latency.** The same user saw YOLO26-M at ~40 ms against YOLO11-M at ~20 ms on an Intel Iris Xe iGPU.
- **Monkey patching.** One person patched the PyTorch code before export to force the old output format, and published prebuilt models for it.
- **The actual fix, buried in a reply.** Someone eventually pointed out that you don't need any patching, export it with `end2end=False` and it works, and on their hardware it was faster than v9 and v11.

So the information was there, just spread across three threads, with no tested set of models at both sizes, and no numbers on real footage. That's the gap i wanted to fill.

## How I Implemented It

Same approach as my v9 repo, a small container that does the export on CPU and drops the `.onnx` file out the other side. Unlike v9, there is nothing to patch in the source, Ultralytics does the heavy lifting. The only part that matters is `end2end=False`.

```
FROM python:3.11 AS build
RUN apt-get update && apt-get install --no-install-recommends -y libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.8.0 /uv /bin/
WORKDIR /work
RUN uv pip install --system --index-url https://download.pytorch.org/whl/cpu torch==2.8.0 torchvision==0.23.0
RUN uv pip install --system ultralytics==8.4.175 onnx onnxslim onnxruntime --extra-index-url https://download.pytorch.org/whl/cpu --index-strategy unsafe-best-match
ARG MODEL_SIZE
ARG IMG_SIZE
RUN python3 -c "from ultralytics import YOLO; YOLO('yolo26${MODEL_SIZE}.pt').export(format='onnx', imgsz=${IMG_SIZE}, end2end=False, simplify=True, dynamic=False, batch=1)"
FROM scratch
ARG MODEL_SIZE
ARG IMG_SIZE
COPY --from=build /work/yolo26${MODEL_SIZE}.onnx /yolo26-${MODEL_SIZE}-${IMG_SIZE}.onnx
```

Run it with `--build-arg MODEL_SIZE=s --build-arg IMG_SIZE=640` ( sizes are `n s m l x` ) and `--output .`, same as the v9 one.

`end2end=False` switches the export to the one-to-many head, and the output comes back in the classic layout. I checked the output shape of every single file before calling it exported:

| Size | Output shape |
|---|---|
| 640 | `[1, 84, 8400]` |
| 320 | `[1, 84, 2100]` |

All 10 builds ( 5 sizes × 2 resolutions ) took about 6 minutes in total on CPU, after the first build cached the torch layers. Each one was 20 to 40 seconds.

Frigate config is the same `yolo-generic` block you would use for v9, just point it at the new file:

```yaml
model:
  path: /config/models/yolo26-s-640.onnx
  model_type: yolo-generic
  input_tensor: nchw
  input_pixel_format: rgb
  input_dtype: float
  width: 640
  height: 640
```

For 320, change the path and both `width` and `height` to 320. Don't forget the second one, the size in the config has to match the size in the file name.

## How I Tested It

I didn't want to swap models on my live Frigate ten times, that's ten restarts and ten gaps in recording. So the testing went in three stages, each one closer to the real thing.

**Stage 1, bench check.** I ran every model inside the Frigate container using Frigate's own onnxruntime ( CUDA ) and Frigate's own `post_process_yolo` function, which is the exact code `yolo-generic` uses. Two images, the standard Ultralytics bus photo and one live camera frame. The point here was just to see if the scores came back sane.

**Stage 2, replay on a real recording.** I picked a 70 second recording from one of my indoor cameras, evening, three people in the frame the whole time. Dining room, dim light, people partially hidden behind each other and the furniture, which is a hard scene and honestly a good one for this. I sampled 421 frames out of it and ran all 10 YOLO26 models plus YOLOv9-S and YOLOv9-C over the same frames. A person counts when the score is 0.5 or above.

**Stage 3, actual Frigate.** A throwaway Frigate instance, same 0.17.1-tensorrt image, same ONNX on CUDA, with that same recording looped as its only camera. Detect at 1280x720, 5 fps, recording off. Each model got loaded on its own, ran for 150 to 240 seconds, then i pulled Frigate's own stats and events from its API. My live Frigate was never touched.

## The Results

### Bench check

Every model came back clean. All scores between 0 and 1, the right classes ( 4 people and a bus/car on the bus photo ), no phantom bicycles anywhere. The raw ONNX latency on the 2080 Ti:

| Model | 320 | 640 |
|---|---|---|
| YOLO26-N | 3.0 ms | 4.4 ms |
| YOLO26-S | 3.3 ms | 6.7 ms |
| YOLO26-M | 6.1 ms | 16.9 ms |
| YOLO26-L | 8.7 ms | 15.3 ms |
| YOLO26-X | 10.4 ms | 28.0 ms |
| YOLOv9-S | — | 9.2 ms |

These are ONNX on the CUDA provider, not TensorRT, so don't compare them with the Ultralytics T4 numbers.

### In Frigate

Every model loaded, every model created person events, no score over 1, zero errors in the logs.

| Model | Size | Run | Frigate inference | Person events | Avg top score | Max top score |
|---|---|---|---|---|---|---|
| YOLO26-N | 320 | 150 s | 4.1 ms | 6 | 0.84 | 0.90 |
| YOLO26-N | 640 | 150 s | 13.9 ms | 8 | 0.81 | 0.89 |
| YOLO26-S | 320 | 240 s | 5.3 ms | 9 | 0.86 | 0.93 |
| YOLO26-S | 640 | 240 s | 14.3 ms | 13 | 0.84 | 0.91 |
| YOLO26-M | 320 | 150 s | 7.8 ms | 6 | 0.84 | 0.94 |
| YOLO26-M | 640 | 150 s | 16.3 ms | 7 | 0.85 | 0.94 |
| YOLO26-L | 320 | 150 s | 9.7 ms | 5 | 0.87 | 0.94 |
| YOLO26-L | 640 | 150 s | 24.0 ms | 6 | 0.86 | 0.94 |
| YOLO26-X | 320 | 150 s | 17.0 ms | 4 | 0.92 | 0.94 |
| YOLO26-X | 640 | 150 s | 28.1 ms | 4 | 0.92 | 0.95 |
| YOLOv9-S | 640 | 240 s | 16.3 ms | 10 | 0.90 | 0.93 |

Couple of things to read this right.

- **Frigate's inference number is not the raw model speed.** It includes Frigate's own overhead around the model, which is why N, S and M at 640 all sit around 14 to 16 ms even though the raw model times are very different. At 640 that overhead floor is most of the number. At 320 the floor drops a lot, which is why 320 looks so much faster in Frigate.
- **Don't compare event counts across rows with different run times.** The clip loops, so a longer run means more events. Only compare rows with the same Run value.

### On the recording

This is the table that actually matters, because it's how many of the three people each model could find, frame by frame.

| Model | Size | Frames with ≥1 person | Avg people found per frame ( out of 3 ) | Frames with all 3 | Avg person score | Raw latency |
|---|---|---|---|---|---|---|
| YOLO26-N | 320 | 13.5% | 0.19 | 0% | 0.61 | 2.4 ms |
| YOLO26-N | 640 | 11.9% | 0.19 | 0% | 0.65 | 4.6 ms |
| YOLO26-S | 320 | 38.2% | 0.67 | 0% | 0.72 | 3.3 ms |
| YOLO26-S | 640 | 57.7% | 1.01 | 1.0% | 0.75 | 6.7 ms |
| YOLO26-M | 320 | 71.7% | 1.26 | 0.2% | 0.76 | 5.1 ms |
| YOLO26-M | 640 | 62.0% | 1.13 | 0.7% | 0.78 | 12.0 ms |
| YOLO26-L | 320 | 71.3% | 1.34 | 1.9% | 0.77 | 6.6 ms |
| YOLO26-L | 640 | 65.8% | 1.23 | 1.9% | 0.77 | 14.6 ms |
| YOLO26-X | 320 | 76.2% | 1.44 | 3.1% | 0.76 | 10.4 ms |
| YOLO26-X | 640 | 67.9% | 1.29 | 3.3% | 0.78 | 28.3 ms |
| YOLOv9-S | 640 | 39.7% | 0.71 | 0.2% | 0.78 | 8.5 ms |
| YOLOv9-C | 640 | 48.5% | 0.84 | 0.2% | 0.77 | 15.9 ms |

What i read from it:

- **Nobody finds all three people.** The best model, X, gets all three in about 3% of frames. It's a dim, crowded indoor scene with people overlapping, so this is a hard test, not a typical doorbell camera.
- **N is not usable on a scene like this.** It finds a person in roughly 1 out of 8 frames.
- **320 is as good as 640 here, sometimes better.** M, L and X all found more people at 320 than at 640. I think it's because the people take up a big part of the frame in this camera, so shrinking the image doesn't lose them, but i haven't proved that. On a wide outdoor camera with people far away, i would expect 640 to win.
- **The scores look similar across the board.** Avg person score sits around 0.75 to 0.78 for everything from S up, v9 included. The difference is in how many people get found, not how sure the model is about the ones it finds.

## How It Compares To YOLOv9

First the official numbers, COCO mAP 50-95 at 640, from Ultralytics and the YOLOv9 repo:

| Tier | YOLOv9 | YOLO26 |
|---|---|---|
| Tiny / Nano | T: 38.3 | N: 40.9 |
| Small | S: 46.8 | S: 48.6 |
| Medium | M: 51.4 | M: 53.1 |
| Large | C: 53.0 | L: 55.0 |
| Extra | E: 55.6 | X: 57.5 |

On paper YOLO26 is about 1.7 to 2.6 mAP ahead at every size. Not huge.

On my recording, the gap was a lot bigger than the paper says:

| | YOLOv9-S ( what i run ) | YOLOv9-C | YOLO26-S 640 | YOLO26-M 320 |
|---|---|---|---|---|
| Frames with ≥1 person | 39.7% | 48.5% | 57.7% | 71.7% |
| Avg people found | 0.71 | 0.84 | 1.01 | 1.26 |
| Frigate inference | 16.3 ms | — | 14.3 ms | 7.8 ms |

YOLO26-S at the same size as my current model finds people in 18 more frames out of every 100, and it's slightly faster in Frigate. Even the bigger YOLOv9-C, which is roughly four times the compute of v9-S, loses to YOLO26-S. And YOLO26-M at 320 finds people in almost twice as many frames as my current v9-S, at half the inference time.

The things v9 still has going for it:

- **Official support.** v9 is what the Frigate team tests against, with an export guide in the docs. YOLO26 works because of an export flag, and if a future Frigate release changes how `yolo-generic` parses output, that's on me to fix.
- **License.** v9 is GPL-3.0, YOLO26 is AGPL-3.0. For a homelab it doesn't matter. If you are building something you ship to other people, read it.

Also, to be clear about what this is, it's one 70 second clip from one indoor camera, at night. It's a real test on real footage, but it's not a benchmark. I'm gonna run it on my outdoor camera during the day before switching my live Frigate over, and if you have a different kind of scene, test it on your own footage first.

## Download

Everything is on GitHub, both 320 and 640, all five sizes, each one exported, shape checked, and tested in Frigate:

[YOLO26-onnx on GitHub](https://github.com/oritromax/YOLO26-onnx)

- N, S, M and L are in the repo itself.
- X is over GitHub's 100 MB file limit, so it's a release download, [X 640](https://github.com/oritromax/YOLO26-onnx/releases/tag/yolo26-x-640) and [X 320](https://github.com/oritromax/YOLO26-onnx/releases/tag/yolo26-x-320). SHA-256 for each is in the release notes.

And if you are still on v9, all the v9 models at both sizes are here: [YOLOv9-onnx on GitHub](https://github.com/oritromax/YOLOv9-onnx).

If you only want my pick, start with **YOLO26-M at 320**. It found the most people per millisecond in my test, and it's faster than the v9-S most people are running right now.
