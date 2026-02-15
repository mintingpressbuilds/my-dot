export const dotVertexShader = `
  attribute float size;
  varying vec3 vC;
  void main() {
    vC = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mv.z);
    gl_PointSize = clamp(gl_PointSize, 2.0, 60.0);
    gl_Position = projectionMatrix * mv;
  }
`;

export const dotFragmentShader = `
  varying vec3 vC;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    float core = 1.0 - smoothstep(0.0, 0.12, d);
    vec3 c = vC * glow * 1.0 + vec3(1.0) * core * 1.0;
    float a = glow * 0.85 + core * 0.3;
    gl_FragColor = vec4(c, a);
  }
`;

// Halo ring shader — renders a soft ring around the user's dot
export const ringVertexShader = `
  attribute float size;
  varying vec3 vC;
  void main() {
    vC = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mv.z);
    gl_PointSize = clamp(gl_PointSize, 4.0, 120.0);
    gl_Position = projectionMatrix * mv;
  }
`;

export const ringFragmentShader = `
  varying vec3 vC;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float ring = smoothstep(0.28, 0.34, d) * (1.0 - smoothstep(0.38, 0.50, d));
    if (ring < 0.01) discard;
    gl_FragColor = vec4(vC, ring * 0.5);
  }
`;
