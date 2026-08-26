# AI Model License & Commercial Use Documentation

This document specifies the AI model used by the REAL vision pipeline, its
license, weights source, and commercial-use implications.

## Model Specification

| Field | Value |
|---|---|
| **Model name** | SSD MobileNet v1 (COCO) |
| **Model file** | `mini-services/vision-worker/models/ssd_mobilenet_v1_coco.onnx` |
| **Model format** | ONNX (Open Neural Network Exchange) |
| **Model size** | ~28 MB |
| **Architecture** | Single Shot MultiBox Detector + MobileNet v1 backbone |
| **Training dataset** | COCO (Common Objects in Context) — 80 object classes |
| **Input** | 300×300 RGB uint8 image (NHWC) |
| **Output** | Up to 100 detections with class, confidence, and normalized bounding box |
| **Detectable vehicle classes** | car (3), motorcycle (4), bus (6), truck (8), bicycle (2) |
| **Inference runtime** | ONNX Runtime 1.29 (CPUExecutionProvider) |
| **Inference latency** | ~150ms per frame on CPU (no GPU required) |
| **Memory footprint** | ~250MB total (model + runtime + frame buffers) |

## License Inventory

Every component of the real vision pipeline permits commercial use. There is
**no AGPL contamination**.

| Component | Version | License | Commercial Use | Source |
|---|---|---|---|---|
| **SSD MobileNet v1 COCO weights** | 1.0 | **Apache-2.0** | ✅ Yes | [ONNX Model Zoo](https://github.com/onnx/models) — `validated/vision/object_detection_segmentation/ssd-mobilenetv1/model/ssd_mobilenet_v1_10.onnx` |
| ONNX Runtime | 1.29.0 | MIT | ✅ Yes | https://onnxruntime.ai |
| OpenCV (python-headless) | 4.13.0 | Apache-2.0 | ✅ Yes | https://opencv.org |
| FastAPI | 0.128.0 | MIT | ✅ Yes | https://fastapi.tiangolo.com |
| Uvicorn | latest | BSD-3-Clause | ✅ Yes | https://www.uvicorn.org |
| NumPy | 2.1.3 | BSD-3-Clause | ✅ Yes | https://numpy.org |
| Pillow | latest | HPND (MIT-like) | ✅ Yes | https://python-pillow.org |
| COCO dataset (training data) | 2017 | CC-BY-4.0 | ✅ Yes (attribution) | https://cocodataset.org |

## License Text Evidence

This section reproduces the actual license headers / text of each
license-relevant component, so the commercial-use claim is verifiable from
this document alone rather than relying on the summary table above.

### 1. SSD MobileNet v1 COCO weights — Apache-2.0

**Source repository:** https://github.com/onnx/models
(the ONNX Model Zoo). The model file shipped with this product lives at
`validated/vision/object_detection_segmentation/ssd-mobilenetv1/model/ssd_mobilenet_v1_10.onnx`
in that repository.

**License file (verbatim header):** the ONNX Model Zoo repository root
contains an `LICENSE` file with the full Apache-2.0 text. The SPDX identifier
declared in the repository's `README.md` is `Apache-2.0`. The full Apache-2.0
text is reproduced at https://www.apache.org/licenses/LICENSE-2.0.txt and is
also shipped in this product's `LICENSES/APACHE-2.0.txt`.

The Apache-2.0 license header from the upstream `LICENSE` file begins:

```
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.
      ...
```

The key grant (Section 2 of Apache-2.0):

> Subject to the terms and conditions of this License, each Contributor hereby
> grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free,
> irrevocable copyright license to reproduce, prepare Derivative Works of,
> publicly display, publicly perform, sublicense, and distribute the Work and
> such Derivative Works in Source or Object form.

**Commercial-use implication:** Apache-2.0 explicitly permits commercial use,
modification, sublicensing, and distribution. The only obligations are
(1) preserve the copyright and license notices, (2) state significant
changes to the model, and (3) include a copy of the Apache-2.0 license in
any redistribution. These obligations are satisfied by shipping the
`LICENSES/APACHE-2.0.txt` file alongside the model.

**NOTICE file:** the upstream repository also ships a `NOTICE` file which
should be preserved in redistributions. The product includes a copy at
`LICENSES/NOTICE-ONNX-MODELS.txt`.

### 2. COCO dataset (training data) — CC-BY-4.0

**Source:** https://cocodataset.org — the COCO (Common Objects in Context)
dataset, 2017 release.

**License:** Creative Commons Attribution 4.0 International (CC-BY-4.0). The
license is declared at https://cocodataset.org/#termsofuse and the full text
is at https://creativecommons.org/licenses/by/4.0/legalcode.

The CC-BY-4.0 license header:

```
   Creative Commons Attribution 4.0 International Public License

   By exercising the Licensed Rights (defined below), You accept and agree to be
   bound by the terms and conditions of this Creative Commons Attribution 4.0
   International Public License ("Public License"). To the extent this Public
   License may be interpreted as a contract, You are granted the Licensed Rights
   in consideration of Your acceptance of these terms and conditions, and the
   Licensor grants You such rights in consideration of benefits the Licensor
   receives by making the Licensed Material available under these terms and
   conditions.

   Section 1 -- Definitions.
   ...
   Section 3 -- License Conditions.
   Your exercise of the Licensed Rights is expressly made subject to the
   following conditions.
   a. Attribution.
      1. If You Share the Licensed Material (including in modified form), You
         must:
         A. retain the following if it is supplied by the Licensor with the
            Licensed Material: identification of the creator(s) of the
            Licensed Material and any others designated to receive attribution,
            ...
```

**Commercial-use implication:** CC-BY-4.0 permits commercial use provided
attribution is given. The required attribution for COCO is:

> COCO Consortium. Common Objects in Context. https://cocodataset.org
> Licensed under CC-BY-4.0.

This attribution appears in the product's documentation (this file and
`docs/THIRD_PARTY_LICENSES.md`) and should be reproduced in any
redistribution that includes the model weights (since the weights were
trained on COCO).

### 3. ONNX Runtime — MIT License

**Source:** https://github.com/microsoft/onnxruntime — the official Microsoft
ONNX Runtime repository.

**License file (verbatim):** the repository root contains a `LICENSE` file
with the following MIT text:

```
MIT License

Copyright (c) Microsoft Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Commercial-use implication:** MIT permits commercial use, modification,
sublicensing, and distribution with no restrictions beyond preserving the
copyright notice. ONNX Runtime is the most permissive license in the stack.

### 4. License summary — commercial use confirmed

| Component | License | License text source | Commercial use |
|---|---|---|---|
| SSD MobileNet v1 COCO weights | Apache-2.0 | https://github.com/onnx/models/blob/main/LICENSE | Yes — requires notice + license file preservation |
| COCO dataset (training data) | CC-BY-4.0 | https://creativecommons.org/licenses/by/4.0/legalcode | Yes — requires attribution |
| ONNX Runtime | MIT | https://github.com/microsoft/onnxruntime/blob/main/LICENSE | Yes — requires copyright notice preservation |
| OpenCV (python-headless) | Apache-2.0 | https://github.com/opencv/opencv/blob/4.x/LICENSE | Yes |
| FastAPI | MIT | https://github.com/tiangolo/fastapi/blob/master/LICENSE | Yes |
| Uvicorn | BSD-3-Clause | https://github.com/encode/uvicorn/blob/master/LICENSE.md | Yes |
| NumPy | BSD-3-Clause | https://github.com/numpy/numpy/blob/main/LICENSE.txt | Yes |
| Pillow | HPND (MIT-like) | https://github.com/python-pillow/Pillow/blob/main/LICENSE | Yes |

### 5. AGPL contamination check — verified clean

A grep for AGPL-only dependencies in the product's Python and Node dependency
trees confirms:

- **No `ultralytics` package** (Ultralytics YOLOv8, AGPL-3.0) in
  `mini-services/vision-worker/requirements.txt`.
- **No `yolov5` or `yolov8` package** in `requirements.txt` or `package.json`.
- **No AGPL-licensed model** in `mini-services/vision-worker/models/`.

The command to re-verify:

```bash
# Python deps
grep -iE 'agpl|ultralytics|yolo' mini-services/vision-worker/requirements.txt
# (expected: no matches)

# Node deps
grep -iE 'agpl|ultralytics|yolo' package.json
# (expected: no matches)

# Model files
ls mini-services/vision-worker/models/
# ssd_mobilenet_v1_coco.onnx  (Apache-2.0)
```

The product is **AGPL-free** and safe for closed-source commercial deployment.

## Why this model was chosen

1. **Commercially usable.** Apache-2.0 license — no copyleft contamination.
   (Contrast with Ultralytics YOLOv8 which is AGPL-3.0 and would force the
   entire product to be open-sourced.)
2. **Lightweight.** 28MB model + ~250MB runtime fits the 4GB sandbox host.
   (Contrast with Faster R-CNN which needs ~1.5GB and OOMs the host.)
3. **No GPU required.** Runs on CPU via ONNX Runtime.
4. **Standard COCO classes.** Detects all 5 vehicle classes the product needs
   (car, motorcycle, bus, truck, bicycle).
5. **No internet dependency at inference time.** The model file ships with the
   product; inference runs entirely offline.

## Installation / Download Method

### Option A — Pre-packaged (default)
The model file is included in the repository at
`mini-services/vision-worker/models/ssd_mobilenet_v1_coco.onnx`. No download
is needed — buyers receive the model with the source code.

### Option B — Re-download from source
```bash
cd mini-services/vision-worker/models
curl -L -o ssd_mobilenet_v1_coco.onnx \
  https://github.com/onnx/models/raw/main/validated/vision/object_detection_segmentation/ssd-mobilenetv1/model/ssd_mobilenet_v1_10.onnx
```

### Python dependencies
```bash
cd mini-services/vision-worker
pip install -r requirements.txt
```

## Commercial-Use Implications

- **Personal license ($59):** Buyer may use the model for evaluation and
  internal learning. The model weights are Apache-2.0 and may be redistributed
  under the terms of that license (preserve the NOTICE file).
- **Commercial license ($199):** Buyer may deploy the model in one commercial
  traffic-analysis deployment. COCO dataset attribution (CC-BY-4.0) should be
  included in the documentation of any redistribution.
- **Agency license ($499):** Buyer may deploy across multiple client projects.
- **Extended/Reseller ($999+):** Buyer may white-label the product including
  the model, subject to the Apache-2.0 redistribution terms.

## Model Limitations (documented honestly)

- **Accuracy:** ~20-22 mAP on COCO val. Lower than YOLOv8 (~37 mAP) but
  sufficient for traffic-counting applications where exact box precision is
  less important than detecting vehicle presence.
- **Small objects:** SSD MobileNet struggles with very small/distant vehicles.
  Frame sampling at 2 FPS + IoU tracking mitigates this by accumulating
  detections over time.
- **Night/adverse weather:** Performance degrades in low light or heavy rain
  (the COCO training set is predominantly daylight). Buyers should validate
  on their own footage before commercial deployment.
- **Speed estimation:** Derived from trajectory displacement, NOT a certified
  measurement. Labeled "Estimated Speed" in the UI and disclaimered in the
  HTML report.

## Alternative Models (documented extension points)

The `VisionProvider` interface allows swapping the model without changing
application logic. Documented options for buyers needing higher accuracy:

| Model | mAP | License | Size | Notes |
|---|---|---|---|---|
| SSD MobileNet v1 (default) | ~22 | Apache-2.0 | 28MB | Ships with product |
| YOLOv8n | ~37 | **AGPL-3.0** ⚠️ | 12MB | Forces open-source — avoid for commercial |
| Faster R-CNN MobileNet V3 | ~29 | Apache-2.0 | 78MB | Better accuracy, higher RAM |
| RT-DETR | ~53 | Apache-2.0 | 60MB | State-of-the-art, requires GPU |
| EfficientDet-Lite0 | ~26 | Apache-2.0 | 18MB | Good speed/accuracy tradeoff |

To swap models, replace the ONNX file and update the preprocessing in
`mini-services/vision-worker/infer.py` + `app.py`.
