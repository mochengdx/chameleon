// 2^-14, the same value for 10, 11 and 16-bit: https://www.khronos.org/opengl/wiki/Small_Float_Formats
// 2^-11, machine epsilon: 1 + EPS = 1 (half of the ULP for 1.0f)
uniform mat4 renderer_ModelMat;
uniform mat4 renderer_MVMat;
uniform mat4 renderer_MVPMat;
uniform mat4 renderer_NormalMat;
in vec3 POSITION;
in vec2 TEXCOORD_0;
in vec3 NORMAL;
out vec2 uv;
out vec3 positionWS;
out vec3 normalWS;
struct VertexInputs {
    vec4 positionOS ;
    vec3 positionWS ;
    vec3 normalWS ;
};
uniform vec4 material_TilingOffset;
vec2 getUV0 (  ) {
    vec2 uv0 = vec2 ( 0 ) ;
    uv0 = TEXCOORD_0 ;
    return uv0 * material_TilingOffset.xy + material_TilingOffset.zw ;
}
VertexInputs getVertexInputs (  ) {
    VertexInputs inputs ;
    vec4 position = vec4 ( POSITION, 1.0 ) ;
    vec3 normal = vec3 ( NORMAL ) ;
    inputs.normalWS = normalize ( mat3 ( renderer_NormalMat ) * normal ) ;
    inputs.positionOS = position ;
    vec4 positionWS = renderer_ModelMat * position ;
    inputs.positionWS = positionWS.xyz / positionWS.w ;
    return inputs ;
}
void main() {
    uv = getUV0() ;
    VertexInputs vertexInputs = getVertexInputs() ;
    positionWS = vertexInputs.positionWS ;
    normalWS = vertexInputs.normalWS ;
    gl_Position = renderer_MVPMat * vertexInputs.positionOS ;
}
