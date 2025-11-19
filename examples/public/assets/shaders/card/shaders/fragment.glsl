#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    precision highp int;
#else
    precision mediump float;
    precision mediump int;
#endif

out vec4 glFragColor;
in vec2 uv;
// 2^-14, the same value for 10, 11 and 16-bit: https://www.khronos.org/opengl/wiki/Small_Float_Formats

// 2^-11, machine epsilon: 1 + EPS = 1 (half of the ULP for 1.0f)
uniform mat4 renderer_ModelMat;
uniform vec3 camera_Forward;
uniform sampler2D material_BaseTexture;
uniform vec4 scene_ElapsedTime;
void main() {
    vec3 pDirWS = normalize ( - camera_Forward ) ;
    vec3 RightDir = normalize ( ( mat4 ( renderer_ModelMat ) * vec4 ( 1.0, 0.0, 0.0, 0.0 ) ).rgb ) ;
    float AbsPV = abs ( dot ( pDirWS, RightDir ) ) ;
    float Angles = cos ( radians ( 70.0 ) ) ;
    float IncludedAngle = cos ( radians ( 80.0 ) ) ;
    float AngleMix = 1.0 - smoothstep ( Angles, Angles + IncludedAngle, AbsPV ) ;
    float Alpah = 1.0 - abs ( 2.0 * uv.x - 1.0 ) ;
    Alpah = smoothstep ( 0.1, 0.8, Alpah ) * AngleMix ;
    vec4 textureColor = texture ( material_BaseTexture, uv + vec2 ( 0.0, scene_ElapsedTime.x * 0.3 ) ) ;
    glFragColor = vec4 ( textureColor.rgb, Alpah * textureColor.a ) ;
}