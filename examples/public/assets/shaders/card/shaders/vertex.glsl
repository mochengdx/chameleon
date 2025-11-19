in vec3 POSITION;
in vec2 TEXCOORD_0;
out vec2 uv;
// 2^-14, the same value for 10, 11 and 16-bit: https://www.khronos.org/opengl/wiki/Small_Float_Formats

// 2^-11, machine epsilon: 1 + EPS = 1 (half of the ULP for 1.0f)
uniform mat4 renderer_MVPMat;
void main() {
    vec4 position = vec4 ( POSITION, 1.0 ) ;
    uv = TEXCOORD_0 ;
    gl_Position = renderer_MVPMat * position ;
}
