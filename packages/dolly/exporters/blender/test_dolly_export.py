"""Tests for the bpy-free parts of dolly_export.py. Run: python test_dolly_export.py"""

import math
import unittest

from dolly_export import build_path, key_from, to_y_up, vertical_fov


class ExportTest(unittest.TestCase):
    def test_axes(self):
        self.assertEqual(to_y_up((1, 2, 3)), [1, 3, -2])

    def test_fov(self):
        # A 50 mm lens on a 36 mm sensor, 16:9: horizontal 39.6 degrees, vertical 22.9.
        self.assertAlmostEqual(vertical_fov(50, 36, 24, "AUTO", 16 / 9), 22.895, places=2)
        self.assertAlmostEqual(vertical_fov(50, 36, 24, "VERTICAL", 16 / 9), math.degrees(2 * math.atan(12 / 50)), places=3)
        # Portrait AUTO: the sensor width spans the height.
        self.assertAlmostEqual(vertical_fov(50, 36, 24, "AUTO", 9 / 16), 39.598, places=2)

    def test_key(self):
        # Identity rotation at (0, -10, 2): Blender cameras look down -Z, so the target is below.
        matrix = [[1, 0, 0, 0], [0, 1, 0, -10], [0, 0, 1, 2], [0, 0, 0, 1]]
        key = key_from(matrix, 50, (36, 24, "AUTO"), 16 / 9, 0.5, 5)
        self.assertEqual(key["position"], [0, 2, 10])
        self.assertEqual(key["target"], [0, -3, 10])
        self.assertEqual(key["at"], 0.5)

    def test_markers_become_chapters(self):
        samples = [(f, {"at": f / 100}) for f in (0, 50, 100)]
        path = build_path(samples, [(48, "Reveal"), (0, "Intro")])
        self.assertEqual(path["version"], 1)
        self.assertEqual(path["keys"][1]["chapter"], "Reveal")
        self.assertEqual(path["keys"][0]["chapter"], "Intro")


if __name__ == "__main__":
    unittest.main()
