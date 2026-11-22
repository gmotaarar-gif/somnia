#version 460 core
// The tab wave: a port of the `distortion-waves` fragment shader the web's
// ScreenTransition runs (vertical type). `uC*` is the screen leaving, `uR*`
// the one arriving, each as sharp / near-blurred / far-blurred copies. The
// output is premultiplied and clear wherever the wave changes nothing, so the
// live screen underneath shows through.
#include <flutter/runtime_effect.glsl>

precision highp float;

uniform vec2 uSize;
uniform vec4 uFa; // origin.xy, spine, radius
uniform vec4 uFb; // squash, time, energy, swell
uniform vec4 uFc; // gravity, glow, clearRadius, rim
uniform vec4 uFd; // tilt, launched, hairClearRadius, content
uniform vec4 uLensP; // amplitude, lensWidth, aberration, blur
uniform vec4 uBlurP; // blurAhead, blurBehind, near, strength
uniform vec4 uBand; // lead, tail, rimWidth, rimSoftness
uniform vec4 uRimP; // corner, unevenness, pulse, hairlineWidth
uniform vec4 uHair; // hairlineOpacity, hairlineWhite, revealed, floor
uniform vec3 uPal0;
uniform vec3 uPal1;
uniform vec3 uPal2;
uniform vec3 uPal3;
uniform vec3 uPal4;
uniform vec3 uPal5;
uniform vec3 uPal6;
uniform vec3 uAhead;
uniform vec3 uBehind;
uniform vec3 uLump0;
uniform vec3 uLump1;
uniform vec3 uLump2;
uniform vec3 uLump3;
uniform vec3 uLump4;
uniform vec3 uLump5;
uniform vec3 uLump6;
uniform sampler2D uC0;
uniform sampler2D uC1;
uniform sampler2D uC2;
uniform sampler2D uR0;
uniform sampler2D uR1;
uniform sampler2D uR2;

out vec4 fragColor;

const float coverZone = 60.0;
const float PI = 3.14159265;

struct Field {
  float d;
  vec2 n;
  vec2 q;
  vec2 raw;
  float g;
};

Field fieldAt(vec2 p) {
  vec2 raw = p - uFa.xy;
  float cs = cos(uFd.x), sn = sin(uFd.x);
  vec2 q = vec2(cs * raw.x + sn * raw.y, -sn * raw.x + cs * raw.y);
  float spine = uFa.z, radius = uFa.w, squash = uFb.x, time = uFb.y, swell = uFb.w;
  float mx = q.x * squash;
  vec2 v = vec2(max(abs(mx) - spine, 0.0), q.y);
  float l = max(length(v), 1e-3);
  vec2 grad = vec2(v.x * sign(q.x) * squash, v.y) / l;
  float g = max(length(grad), 1e-3);
  float s = mx * 0.0058;
  float bend = 0.62 * sin(s + time * 1.1) + 0.38 * sin(s * 2.1 - time * 1.5 + 1.7);
  vec2 n = grad / g;
  Field o;
  o.d = (l - radius) / g + swell * bend;
  o.n = vec2(cs * n.x - sn * n.y, sn * n.x + cs * n.y);
  o.q = q;
  o.raw = raw;
  o.g = g;
  return o;
}

vec2 uvAt(vec2 s) {
  return clamp(s, vec2(0.5), uSize - 0.5) / uSize;
}

// The progressive blur as stacked blurred copies: near over sharp, far over that.
vec3 sideC(vec2 s, float tn, float tf) {
  vec2 uv = uvAt(s);
  vec3 col = texture(uC0, uv).rgb;
  if (tn > 0.0) col = mix(col, texture(uC1, uv).rgb, tn);
  if (tf > 0.0) col = mix(col, texture(uC2, uv).rgb, tf);
  return col;
}

vec3 sideR(vec2 s, float tn, float tf) {
  vec2 uv = uvAt(s);
  vec3 col = texture(uR0, uv).rgb;
  if (tn > 0.0) col = mix(col, texture(uR1, uv).rgb, tn);
  if (tf > 0.0) col = mix(col, texture(uR2, uv).rgb, tf);
  return col;
}

vec3 spectrum(int i) {
  if (i == 0) return vec3(0.571, 0.0, 0.0);
  if (i == 1) return vec3(0.343, 0.206, 0.0);
  if (i == 2) return vec3(0.086, 0.588, 0.086);
  if (i == 3) return vec3(0.0, 0.206, 0.343);
  return vec3(0.0, 0.0, 0.571);
}

vec3 lensedC(vec2 s, vec2 split, float tn, float tf) {
  if (dot(split, split) < 0.0625) return sideC(s, tn, tf);
  vec3 o = vec3(0.0);
  for (int i = 0; i < 5; i++) {
    float along = float(i) / 4.0 * 2.0 - 1.0;
    o += sideC(s + split * along, tn, tf) * spectrum(i);
  }
  return o;
}

vec3 lensedR(vec2 s, vec2 split, float tn, float tf) {
  if (dot(split, split) < 0.0625) return sideR(s, tn, tf);
  vec3 o = vec3(0.0);
  for (int i = 0; i < 5; i++) {
    float along = float(i) / 4.0 * 2.0 - 1.0;
    o += sideR(s + split * along, tn, tf) * spectrum(i);
  }
  return o;
}

float edgeSDF(vec2 p, vec2 halfSize, float radius) {
  float r = min(radius, min(halfSize.x, halfSize.y));
  vec2 q = abs(p) - (halfSize - r);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// Distance along the rounded rectangle's outline (x) and its full length (y).
vec2 perimeterAt(vec2 p, vec2 halfSize, float r) {
  float ex = max(halfSize.x - r, 0.0);
  float ey = max(halfSize.y - r, 0.0);
  float arc = 0.5 * PI * r;
  float P = 4.0 * (ex + ey + arc);
  float ax = abs(p.x), ay = abs(p.y);
  if (ax > ex && ay > ey) {
    vec2 v = p - vec2(sign(p.x) * ex, sign(p.y) * ey);
    float a, base;
    if (p.x >= 0.0 && p.y < 0.0) { a = atan(v.x, -v.y); base = ex; }
    else if (p.x >= 0.0) { a = atan(v.y, v.x); base = ex + arc + 2.0 * ey; }
    else if (p.y >= 0.0) { a = atan(-v.x, v.y); base = 3.0 * ex + 2.0 * arc + 2.0 * ey; }
    else { a = atan(-v.y, -v.x); base = 3.0 * ex + 3.0 * arc + 4.0 * ey; }
    return vec2(base + r * clamp(a, 0.0, 0.5 * PI), P);
  }
  bool sideHit = ax > ex ? true : (ay > ey ? false : (halfSize.x - ax) < (halfSize.y - ay));
  if (sideHit) {
    return vec2(p.x >= 0.0 ? ex + arc + (p.y + ey) : 3.0 * ex + 3.0 * arc + 2.0 * ey + (ey - p.y), P);
  }
  return vec2(p.y < 0.0 ? (p.x >= 0.0 ? p.x : P + p.x) : ex + 2.0 * arc + 2.0 * ey + (ex - p.x), P);
}

float lump(vec3 l, float s, float P) {
  float ds = s - l.x;
  ds -= P * floor(ds / P + 0.5);
  float k = ds / l.y;
  return l.z * exp(-k * k);
}

float rimThickness(float s, float P) {
  float t = 0.08 + lump(uLump0, s, P) + lump(uLump1, s, P) + lump(uLump2, s, P)
    + lump(uLump3, s, P) + lump(uLump4, s, P) + lump(uLump5, s, P) + lump(uLump6, s, P);
  return t / 1.0498;
}

float dither(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))) - 0.5;
}

vec3 pal(float i) {
  if (i < 0.5) return uPal0;
  if (i < 1.5) return uPal1;
  if (i < 2.5) return uPal2;
  if (i < 3.5) return uPal3;
  if (i < 4.5) return uPal4;
  if (i < 5.5) return uPal5;
  return uPal6;
}

vec3 paletteAt(float u) {
  float x = fract(u) * 7.0;
  float i = min(floor(x), 6.0);
  float j = i > 5.5 ? 0.0 : i + 1.0;
  float m = fract(x);
  m = m * m * (3.0 - 2.0 * m);
  return mix(pal(i), pal(j), m);
}

vec3 oklabToSRGB(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  vec3 lin = clamp(vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ), 0.0, 1.0);
  return mix(12.92 * lin, 1.055 * pow(lin, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), lin));
}

void main() {
  vec2 frag = FlutterFragCoord().xy;
  vec2 p = frag;
  Field w = fieldAt(p);
  float energy = uFb.z, gravity = uFc.x;
  bool content = uFd.w > 0.5, revealed = uHair.z > 0.5, launched = uFd.y > 0.5;
  float uAmplitude = uLensP.x, uLensWidth = uLensP.y, uAberration = uLensP.z, uBlur = uLensP.w;
  float uNear = uBlurP.z, uLead = uBand.x, uTail = uBand.y, uRimWidth = uBand.z, uRimSoftness = uBand.w;
  float uCorner = uRimP.x, uUneven = uRimP.y, uPulse = uRimP.z, uHairW = uRimP.w;

  // The two screens, through the swell.
  vec2 s = p;
  vec2 split = vec2(0.0);
  if (energy > 0.0 || gravity > 0.0) {
    float u = w.d / (uLensWidth * (w.d > 0.0 ? 0.85 : 1.5));
    float lift = exp(-u * u);
    float r = max(length(w.raw), 1.0);
    vec2 swollen = w.n * energy * uAmplitude * lift;
    vec2 inward = w.raw / r;
    s = p - swollen + inward * gravity * exp(-r / 900.0);
    split = (swollen - inward * gravity * exp(-r / 240.0)) * uAberration;
  }
  // The progressive blur, read where the pixel is.
  float bu = w.d / (w.d > 0.0 ? uBlurP.x : uBlurP.y);
  float radius = energy * uBlur * exp(-bu * bu);
  float tn = clamp(radius / max(uNear, 1e-3), 0.0, 1.0);
  tn = tn * tn * (3.0 - 2.0 * tn);
  float tf = clamp((radius - uNear) / max(uBlur - uNear, 1e-3), 0.0, 1.0);
  tf = tf * tf * (3.0 - 2.0 * tf);

  float cover = 1.0;
  if (content && launched) cover = smoothstep(-coverZone, coverZone, w.d);
  if (!content) cover = 0.0;

  // How much of this pixel the wave owns: all of it where the leaving screen
  // still covers, and behind the front only what the lens moves, splits or
  // blurs. Everything else is left to the live screen underneath.
  float own = uHair.w;
  if (own < 1.0) {
    float moved = max(smoothstep(0.03, 0.4, length(s - p)), smoothstep(0.03, 0.4, length(split)));
    own = max(own, max(moved, smoothstep(0.0, 0.6, radius)));
    own = max(own, smoothstep(0.0, 0.1, cover));
  }

  vec3 col = vec3(0.0);
  if (own > 0.0) {
    if (revealed && cover < 1.0) col = lensedR(s, split, tn, tf);
    if (cover > 0.0) col = mix(col, lensedC(s, split, tn, tf), revealed ? cover : 1.0);
  }

  // The colour band.
  float d = w.d, time = uFb.y, glow = uFc.y, rim = uFc.w;
  vec2 c = p - uSize * 0.5;
  float inset = max(-edgeSDF(c, uSize * 0.5, uCorner), 0.0);
  bool nearEdge = rim > 0.0 && inset < max(uRimWidth * 2.2 * (1.0 + 1.9 * uUneven), uHairW * 0.5 + 0.75);
  if (glow <= 0.0 && !nearEdge) {
    fragColor = vec4((col + dither(frag) / 255.0) * own, own);
    return;
  }
  float along = w.q.x * 0.0068;
  float lobes = 0.5 + 0.5 * sin(along * 1.3 + time * 1.4) * cos(along * 0.6 - time * 0.7 + 1.2);
  float bandA = 0.0;
  if (glow > 0.0 && d < uLead) {
    if (d >= 0.0) {
      float k = 1.0 - d / uLead;
      bandA = k * k * k * (k * (k * 6.0 - 15.0) + 10.0);
    } else {
      bandA = pow(1.0 - clamp(-d / (uTail * mix(0.6, 1.3, lobes)), 0.0, 1.0), 2.3);
    }
    bandA *= glow * uBlurP.w * mix(0.6, 1.0, exp(-inset / 140.0));
  }
  float aroundA = atan(c.y / uSize.y, c.x / uSize.x);
  float rimA = 0.0;
  float hairA = 0.0;
  float shimmer = 0.5;
  if (nearEdge) {
    vec2 edge = perimeterAt(c, uSize * 0.5, uCorner);
    float thickness = 1.0;
    if (uUneven > 0.0) thickness = max(1.0 + (rimThickness(edge.x, edge.y) - 1.0) * uUneven, 0.04);
    float hk = inset / (uRimWidth * thickness);
    float hug = exp(-hk * hk);
    float reached = 1.0 - smoothstep(-uLead * 0.7, uLead * 0.5, d);
    float kept = smoothstep(-uRimSoftness, uRimSoftness, d + (uFa.w - uFc.z) / w.g);
    shimmer = 0.5 + 0.5 * sin(time * 3.4 - edge.x / edge.y * 4.0 * PI);
    rimA = hug * reached * kept * rim * mix(1.0, 0.7 + 0.3 * shimmer, uPulse);
    if (uHairW > 0.0) {
      float line = 1.0 - smoothstep(uHairW * 0.5, uHairW * 0.5 + 0.75, inset);
      float hairKept = smoothstep(-uRimSoftness, uRimSoftness, d + (uFa.w - uFd.z) / w.g);
      hairA = line * reached * hairKept * rim * uHair.x
        * mix(0.5, 1.0, smoothstep(0.1, 1.5, thickness))
        * mix(1.0, 0.55 + 0.45 * shimmer, uPulse);
    }
  }
  float a = 1.0 - (1.0 - bandA) * (1.0 - rimA);
  float total = 1.0 - (1.0 - a) * (1.0 - hairA);
  if (total <= 0.0005) {
    fragColor = vec4((col + dither(frag) / 255.0) * own, own);
    return;
  }
  float flow = 0.62 + along * 0.2 + time * 0.13 + d * 0.0015 + 0.05 * sin(w.q.y * 0.009 + time);
  vec3 lab = paletteAt(flow);
  lab = mix(lab, uAhead, 0.5 * exp(-pow((d - 30.0) / 50.0, 2.0)));
  lab = mix(lab, uBehind, 0.5 * exp(-pow((d + 84.0) / 72.0, 2.0)));
  lab.yz *= 1.22;
  lab = mix(lab, vec3(0.99, 0.0, 0.0), 0.7 * exp(-pow((d + 8.0) / 26.0, 2.0)));
  vec3 rimLab = paletteAt(aroundA / (2.0 * PI) + time * (0.12 + 0.25 * uPulse) + inset * 0.0012);
  rimLab.yz *= 1.1;
  lab = mix(lab, rimLab, rimA / (rimA + bandA + 1e-4));
  vec3 rgb = oklabToSRGB(lab);
  if (hairA > 0.0) {
    vec3 hair = mix(oklabToSRGB(rimLab), vec3(1.0), uHair.y * (0.5 + 0.5 * shimmer));
    rgb = (rgb * a * (1.0 - hairA) + hair * hairA) / total;
  }
  float noise = dither(frag) * 2.0 / 255.0;
  float over = clamp(total + noise, 0.0, 1.0);
  fragColor = vec4(
    col * own * (1.0 - over) + clamp(rgb + noise, 0.0, 1.0) * over,
    1.0 - (1.0 - own) * (1.0 - over));
}
