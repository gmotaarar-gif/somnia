#version 460 core
// The Aurora field: the "Mesh drift" shader the web runs (src/shell/
// meshDrift.glsl.ts), reduced to the path Aurora.tsx's settings take —
// four drifting colour wells, contrast 1.16, no warp, blur, hue or grain.
#include <flutter/runtime_effect.glsl>

precision highp float;

uniform vec2 uSize;
uniform float uTime;
uniform vec3 uColor0;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

out vec4 fragColor;

const float SCALE = 1.16;
const float REACH = 0.569; // 0.45 + intensity (0.34) * 0.35
const float SEED = 1453.0;
const float CONTRAST = 1.16;

float well(vec2 p, float fi, float t) {
  vec2 c = vec2(
    sin(t * (0.21 + fi * 0.071) + fi * 2.4 + SEED),
    cos(t * (0.17 + fi * 0.093) + fi * 1.7)) * REACH;
  return exp(-dot(p - c, p - c) * 6.0);
}

void main() {
  vec2 frag = FlutterFragCoord().xy;
  // WebGL's y runs up the screen; Flutter's runs down.
  vec2 p = vec2(frag.x - 0.5 * uSize.x, 0.5 * uSize.y - frag.y) / min(uSize.x, uSize.y) * SCALE;
  float w0 = well(p, 0.0, uTime), w1 = well(p, 1.0, uTime);
  float w2 = well(p, 2.0, uTime), w3 = well(p, 3.0, uTime);
  vec3 col = (uColor0 * (0.15 + w0) + uColor1 * w1 + uColor2 * w2 + uColor3 * w3)
    / (0.15 + w0 + w1 + w2 + w3);
  col = (col - 0.5) * CONTRAST + 0.5;
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
