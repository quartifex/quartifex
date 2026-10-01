"""Export a Blender camera's animation as a dolly camera path (JSON).

Run inside Blender, from the command line:

    blender scene.blend --background --python dolly_export.py -- camera-path.json --step 10

or from Blender's Text Editor with the camera selected (writes next to the .blend file).

Timeline markers become chapters: a marker named "Reveal" at frame 120 starts the
"Reveal" chapter at the key nearest that frame. Blender is Z-up; dolly (three.js) is
Y-up, so positions are converted. The target is a point along the camera's view axis:
its depth-of-field focus distance when set, otherwise --target-distance (default 5).

The maths below does not import bpy, so it is tested outside Blender.
"""

import json
import math
import sys


def to_y_up(v):
    """Blender (x, y, z) Z-up to three.js Y-up."""
    x, y, z = v
    return [round(x, 5), round(z, 5), round(-y, 5)]


def vertical_fov(lens, sensor_width, sensor_height, sensor_fit, aspect):
    """Vertical field of view in degrees for a render of `aspect` (width / height)."""
    if sensor_fit == "VERTICAL":
        return math.degrees(2 * math.atan(sensor_height / (2 * lens)))
    horizontal = 2 * math.atan(sensor_width / (2 * lens))
    if sensor_fit == "AUTO" and aspect < 1:
        # AUTO fits the sensor width to the larger dimension: height on portrait renders.
        return math.degrees(horizontal)
    return math.degrees(2 * math.atan(math.tan(horizontal / 2) / aspect))


def key_from(matrix, lens, sensor, aspect, at, distance):
    """One dolly key from a camera's world matrix (4 x 4 rows) at progress `at`."""
    position = (matrix[0][3], matrix[1][3], matrix[2][3])
    # The camera looks down its local -Z axis.
    forward = (-matrix[0][2], -matrix[1][2], -matrix[2][2])
    target = tuple(p + f * distance for p, f in zip(position, forward))
    width, height, fit = sensor
    return {
        "at": round(at, 5),
        "position": to_y_up(position),
        "target": to_y_up(target),
        "fov": round(vertical_fov(lens, width, height, fit, aspect), 3),
    }


def build_path(samples, markers=()):
    """A dolly path from (frame, key) samples and (frame, name) markers."""
    keys = [key for _, key in samples]
    frames = [frame for frame, _ in samples]
    for frame, name in markers:
        nearest = min(range(len(frames)), key=lambda i: abs(frames[i] - frame))
        keys[nearest]["chapter"] = name
    return {"version": 1, "spline": "catmullrom", "keys": keys}


def export(scene, camera, filepath, step=10, target_distance=5.0):
    """Sample `camera` every `step` frames across the scene range and write the JSON."""
    data = camera.data
    start, end = scene.frame_start, scene.frame_end
    frames = list(range(start, end + 1, step))
    if frames[-1] != end:
        frames.append(end)
    aspect = (scene.render.resolution_x * scene.render.pixel_aspect_x) / (
        scene.render.resolution_y * scene.render.pixel_aspect_y
    )
    distance = data.dof.focus_distance if data.dof.use_dof and data.dof.focus_distance > 0 else target_distance
    samples = []
    for frame in frames:
        scene.frame_set(frame)
        m = camera.matrix_world
        matrix = [[m[r][c] for c in range(4)] for r in range(4)]
        sensor = (data.sensor_width, data.sensor_height, data.sensor_fit)
        at = (frame - start) / max(end - start, 1)
        samples.append((frame, key_from(matrix, data.lens, sensor, aspect, at, distance)))
    markers = [(m.frame, m.name) for m in sorted(scene.timeline_markers, key=lambda m: m.frame)]
    path = build_path(samples, markers)
    with open(filepath, "w", encoding="utf-8") as handle:
        json.dump(path, handle, indent=2)
    return path


def main():
    import bpy  # noqa: PLC0415  (only available inside Blender)

    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    out = argv[0] if argv else bpy.path.abspath("//camera-path.json")
    step = int(argv[argv.index("--step") + 1]) if "--step" in argv else 10
    scene = bpy.context.scene
    camera = scene.camera
    if camera is None:
        raise SystemExit("dolly: the scene has no active camera")
    path = export(scene, camera, out, step=step)
    print(f"dolly: wrote {len(path['keys'])} keys to {out}")


if __name__ == "__main__":
    main()
