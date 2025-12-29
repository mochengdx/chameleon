#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    precision highp int;
#else
    precision mediump float;
    precision mediump int;
#endif

out vec4 glFragColor;

// 2^-14, the same value for 10, 11 and 16-bit: https://www.khronos.org/opengl/wiki/Small_Float_Formats

// 2^-11, machine epsilon: 1 + EPS = 1 (half of the ULP for 1.0f)
float pow2 ( float x ) {
    return x * x ;
}
vec4 RGBMToLinear ( vec4 value, float maxRange ) {
    return vec4 ( value.rgb * value.a * maxRange, 1.0 ) ;
}
float sRGBToLinear ( float value ) {
    float linearRGBLo = value / 12.92 ;
    float linearRGBHi = pow ( ( value + 0.055 ) / 1.055, 2.4 ) ;
    float linearRGB = ( value <= 0.04045 ) ? linearRGBLo : linearRGBHi ;
    return linearRGB ;
}
vec4 sRGBToLinear ( vec4 value ) {
    return vec4 ( sRGBToLinear(value.r), sRGBToLinear(value.g), sRGBToLinear(value.b), value.a ) ;
}
vec4 texture2DSRGB ( sampler2D tex, vec2 uv ) {
    vec4 color = texture ( tex, uv ) ;
    return color ;
}
uniform mat4 renderer_ModelMat;
uniform vec3 camera_Position;
uniform vec3 camera_Forward;
uniform vec4 camera_ProjectionParams;
in vec2 uv;
in vec3 positionWS;
in vec3 normalWS;
struct SurfaceData {
    vec3 albedoColor ;
    vec3 emissiveColor ;
    float metallic ;
    float roughness ;
    float ambientOcclusion ;
    float opacity ;
    float IOR ;
    vec3 position ;
    vec3 normal ;
    vec3 viewDir ;
    float dotNV ;
    float specularIntensity ;
    vec3 specularColor ;
};
struct BSDFData {
    vec3 diffuseColor ;
    float roughness ;
    vec3 envSpecularDFG ;
    float diffuseAO ;
    vec3 specularF0 ;
    float specularF90 ;
};
float getAARoughnessFactor ( vec3 normal ) {
    vec3 dxy = max ( abs ( dFdx ( normal ) ), abs ( dFdy ( normal ) ) ) ;
    return max ( max ( dxy.x, dxy.y ), dxy.z ) ;
}
float F_Schlick ( float f0, float f90, float dotLH ) {
    return f0 + ( f90 - f0 ) * ( pow ( 1.0 - dotLH, 5.0 ) ) ;
}
vec3 F_Schlick ( vec3 f0, float f90, float dotLH ) {
    float fresnel = exp2 ( ( - 5.55473 * dotLH - 6.98316 ) * dotLH ) ;
    return ( f90 - f0 ) * fresnel + f0 ;
}
float G_GGX_SmithCorrelated ( float alpha, float dotNL, float dotNV ) {
    float a2 = pow2(alpha) ;
    float gv = dotNL * sqrt ( a2 + ( 1.0 - a2 ) * pow2(dotNV) ) ;
    float gl = dotNV * sqrt ( a2 + ( 1.0 - a2 ) * pow2(dotNL) ) ;
    return 0.5 / max ( gv + gl, 1e-6 ) ;
}
float D_GGX ( float alpha, float dotNH ) {
    float a2 = pow2(alpha) ;
    float denom = pow2(dotNH) * ( a2 - 1.0 ) + 1.0 ;
    return 0.31830988618 * a2 / pow2(denom) ;
}
float DG_GGX ( float alpha, float dotNV, float dotNL, float dotNH ) {
    float D = D_GGX(alpha, dotNH) ;
    float G = G_GGX_SmithCorrelated(alpha, dotNL, dotNV) ;
    return G * D ;
}
vec3 BRDF_Specular_GGX ( vec3 incidentDirection, SurfaceData surfaceData, BSDFData bsdfData, vec3 normal, vec3 specularColor, float roughness ) {
    float alpha = pow2(roughness) ;
    vec3 halfDir = normalize ( incidentDirection + surfaceData.viewDir ) ;
    float dotNL = clamp( dot ( normal, incidentDirection ), 0.0, 1.0 ) ;
    float dotNV = clamp( dot ( normal, surfaceData.viewDir ), 0.0, 1.0 ) ;
    float dotNH = clamp( dot ( normal, halfDir ), 0.0, 1.0 ) ;
    float dotLH = clamp( dot ( incidentDirection, halfDir ), 0.0, 1.0 ) ;
    vec3 F = F_Schlick(specularColor, bsdfData.specularF90, dotLH) ;
    float GD = DG_GGX(alpha, dotNV, dotNL, dotNH) ;
    return F * GD ;
}
vec3 BRDF_Diffuse_Lambert ( vec3 diffuseColor ) {
    return 0.31830988618 * diffuseColor ;
}
vec3 envBRDFApprox ( vec3 f0, float f90, float roughness, float dotNV ) {
    const vec4 c0 = vec4 ( - 1, - 0.0275, - 0.572, 0.022 ) ;
    const vec4 c1 = vec4 ( 1, 0.0425, 1.04, - 0.04 ) ;
    vec4 r = roughness * c0 + c1 ;
    float a004 = min ( r.x * r.x, exp2 ( - 9.28 * dotNV ) ) * r.x + r.y ;
    vec2 AB = vec2 ( - 1.04, 1.04 ) * a004 + r.zw ;
    return f0 * AB.x + f90 * AB.y ;
}
void initBSDFData ( SurfaceData surfaceData, out BSDFData bsdfData ) {
    vec3 albedoColor = surfaceData.albedoColor ;
    float metallic = surfaceData.metallic ;
    float roughness = surfaceData.roughness ;
    vec3 dielectricBaseF0 = vec3 ( pow2(( surfaceData.IOR - 1.0 ) / ( surfaceData.IOR + 1.0 )) ) ;
    vec3 dielectricF0 = min ( dielectricBaseF0 * surfaceData.specularColor, vec3 ( 1.0 ) ) * surfaceData.specularIntensity ;
    float dielectricF90 = surfaceData.specularIntensity ;
    bsdfData.specularF0 = mix ( dielectricF0, albedoColor, metallic ) ;
    bsdfData.specularF90 = mix ( dielectricF90, 1.0, metallic ) ;
    bsdfData.diffuseColor = albedoColor * ( 1.0 - metallic ) * ( 1.0 - max ( max ( dielectricF0.r, dielectricF0.g ), dielectricF0.b ) ) ;
    bsdfData.roughness = max ( 0.045, min ( roughness + getAARoughnessFactor(surfaceData.normal), 1.0 ) ) ;
    bsdfData.envSpecularDFG = envBRDFApprox(bsdfData.specularF0, bsdfData.specularF90, bsdfData.roughness, surfaceData.dotNV) ;
    bsdfData.diffuseAO = surfaceData.ambientOcclusion ;
}
uniform ivec4 renderer_Layer;
bool isRendererCulledByLight ( ivec2 rendererLayer, ivec2 lightCullingMask ) {
    // Return true when renderer layers do NOT intersect the light's culling mask.
    // Use explicit boolean locals to avoid any ambiguous tokenization issues
    // that some GLSL preprocessors/compilers might be sensitive to.
    bool xMatches = (rendererLayer.x & lightCullingMask.x) != 0;
    bool yMatches = (rendererLayer.y & lightCullingMask.y) != 0;
    return !(xMatches || yMatches);
}
struct EnvMapLight {
    vec3 diffuse ;
    float mipMapLevel ;
    float diffuseIntensity ;
    float specularIntensity ;
};
uniform EnvMapLight scene_EnvMapLight;
uniform vec3 scene_EnvSH [ 9 ];
uniform samplerCube scene_EnvSpecularSampler;
void diffuseLobe ( SurfaceData surfaceData, BSDFData bsdfData, vec3 attenuationIrradiance, inout vec3 diffuseColor ) {
    diffuseColor += attenuationIrradiance * BRDF_Diffuse_Lambert(bsdfData.diffuseColor) ;
}
void specularLobe ( SurfaceData surfaceData, BSDFData bsdfData, vec3 incidentDirection, vec3 attenuationIrradiance, inout vec3 specularColor ) {
    specularColor += attenuationIrradiance * BRDF_Specular_GGX(incidentDirection, surfaceData, bsdfData, surfaceData.normal, bsdfData.specularF0, bsdfData.roughness) ;
}
void sheenLobe ( SurfaceData surfaceData, BSDFData bsdfData, vec3 incidentDirection, vec3 attenuationIrradiance, inout vec3 diffuseColor, inout vec3 specularColor ) {

}
float clearCoatLobe ( SurfaceData surfaceData, BSDFData bsdfData, vec3 incidentDirection, vec3 color, inout vec3 specularColor ) {
    float attenuation = 1.0 ;
    return attenuation ;
}
void surfaceShading ( SurfaceData surfaceData, BSDFData bsdfData, vec3 incidentDirection, vec3 lightColor, inout vec3 totalDiffuseColor, inout vec3 totalSpecularColor ) {
    vec3 diffuseColor = vec3 ( 0 ) ;
    vec3 specularColor = vec3 ( 0 ) ;
    float dotNL = clamp( dot ( surfaceData.normal, incidentDirection ), 0.0, 1.0 ) ;
    vec3 irradiance = dotNL * lightColor * 3.14159265359 ;
    float attenuation = clearCoatLobe(surfaceData, bsdfData, incidentDirection, lightColor, specularColor) ;
    vec3 attenuationIrradiance = attenuation * irradiance ;
    diffuseLobe(surfaceData, bsdfData, attenuationIrradiance, diffuseColor) ;
    specularLobe(surfaceData, bsdfData, incidentDirection, attenuationIrradiance, specularColor) ;
    sheenLobe(surfaceData, bsdfData, incidentDirection, attenuationIrradiance, diffuseColor, specularColor) ;
    totalDiffuseColor += diffuseColor ;
    totalSpecularColor += specularColor ;
}
void evaluateDirectRadiance ( SurfaceData surfaceData, BSDFData bsdfData, float shadowAttenuation, inout vec3 totalDiffuseColor, inout vec3 totalSpecularColor ) {

}
vec3 getReflectedVector ( SurfaceData surfaceData, vec3 n ) {
    vec3 r = reflect ( - surfaceData.viewDir, n ) ;
    return r ;
}
float getSpecularMIPLevel ( float roughness, int maxMIPLevel ) {
    return roughness * float ( maxMIPLevel ) ;
}
vec3 getLightProbeRadiance ( SurfaceData surfaceData, vec3 normal, float roughness ) {
    vec3 reflectVec = getReflectedVector(surfaceData, normal) ;
    reflectVec.x = - reflectVec.x ;
    float specularMIPLevel = getSpecularMIPLevel(roughness, int ( scene_EnvMapLight.mipMapLevel )) ;
    vec4 envMapColor = textureLod ( scene_EnvSpecularSampler, reflectVec, specularMIPLevel ) ;
    envMapColor.rgb = ( RGBMToLinear(envMapColor, 5.0) ).rgb ;
    return envMapColor.rgb * scene_EnvMapLight.specularIntensity ;
}
float evaluateSpecularOcclusion ( float dotNV, float diffuseAO, float roughness ) {
    float specularAOFactor = 1.0 ;
    return specularAOFactor ;
}
vec3 getLightProbeIrradiance ( vec3 sh [ 9 ], vec3 normal ) {
    normal.x = - normal.x ;
    vec3 result = sh[0] + sh[1] * ( normal.y ) + sh[2] * ( normal.z ) + sh[3] * ( normal.x ) + sh[4] * ( normal.y * normal.x ) + sh[5] * ( normal.y * normal.z ) + sh[6] * ( 3.0 * normal.z * normal.z - 1.0 ) + sh[7] * ( normal.z * normal.x ) + sh[8] * ( normal.x * normal.x - normal.y * normal.y ) ;
    return max ( result, vec3 ( 0.0 ) ) ;
}
void evaluateDiffuseIBL ( SurfaceData surfaceData, BSDFData bsdfData, inout vec3 diffuseColor ) {
    vec3 irradiance = getLightProbeIrradiance(scene_EnvSH, surfaceData.normal) ;
    irradiance *= scene_EnvMapLight.diffuseIntensity ;
    diffuseColor += bsdfData.diffuseAO * irradiance * BRDF_Diffuse_Lambert(bsdfData.diffuseColor) ;
}
float evaluateClearCoatIBL ( SurfaceData surfaceData, BSDFData bsdfData, inout vec3 specularColor ) {
    float radianceAttenuation = 1.0 ;
    return radianceAttenuation ;
}
void evaluateSpecularIBL ( SurfaceData surfaceData, BSDFData bsdfData, float radianceAttenuation, inout vec3 outSpecularColor ) {
    vec3 radiance = getLightProbeRadiance(surfaceData, surfaceData.normal, bsdfData.roughness) ;
    vec3 speculaColor = bsdfData.specularF0 ;
    float specularAO = evaluateSpecularOcclusion(surfaceData.dotNV, bsdfData.diffuseAO, bsdfData.roughness) ;
    outSpecularColor += specularAO * radianceAttenuation * radiance * envBRDFApprox(speculaColor, bsdfData.specularF90, bsdfData.roughness, surfaceData.dotNV) ;
}
void evaluateSheenIBL ( SurfaceData surfaceData, BSDFData bsdfData, float radianceAttenuation, inout vec3 diffuseColor, inout vec3 specularColor ) {

}
void evaluateIBL ( SurfaceData surfaceData, BSDFData bsdfData, inout vec3 totalDiffuseColor, inout vec3 totalSpecularColor ) {
    vec3 diffuseColor = vec3 ( 0 ) ;
    vec3 specularColor = vec3 ( 0 ) ;
    evaluateDiffuseIBL(surfaceData, bsdfData, diffuseColor) ;
    float radianceAttenuation = evaluateClearCoatIBL(surfaceData, bsdfData, specularColor) ;
    evaluateSpecularIBL(surfaceData, bsdfData, radianceAttenuation, specularColor) ;
    evaluateSheenIBL(surfaceData, bsdfData, radianceAttenuation, diffuseColor, specularColor) ;
    totalDiffuseColor += diffuseColor ;
    totalSpecularColor += specularColor ;
}
vec3 getNormalByNormalTexture ( mat3 tbn, sampler2D normalTexture, float normalIntensity, vec2 uv, bool isFrontFacing ) {
    vec3 normal = ( texture ( normalTexture, uv ) ).rgb ;
    normal = normalize ( tbn * ( ( 2.0 * normal - 1.0 ) * vec3 ( normalIntensity, normalIntensity, 1.0 ) ) ) ;
    normal *= float ( isFrontFacing ) * 2.0 - 1.0 ;
    return normal ;
}
mat3 getTBNByDerivatives ( vec2 uv, vec3 normal, vec3 position, bool isFrontFacing ) {
    uv = isFrontFacing ? uv : - uv ;
    vec3 dp1 = dFdx ( position ) ;
    vec3 dp2 = dFdy ( position ) ;
    vec2 duv1 = dFdx ( uv ) ;
    vec2 duv2 = dFdy ( uv ) ;
    vec3 dp2perp = cross ( dp2, normal ) ;
    vec3 dp1perp = cross ( normal, dp1 ) ;
    vec3 tangent = dp2perp * duv1.x + dp1perp * duv2.x ;
    vec3 bitangent = dp2perp * duv1.y + dp1perp * duv2.y ;
    float denom = max ( dot ( tangent, tangent ), dot ( bitangent, bitangent ) ) ;
    float invmax = ( denom == 0.0 ) ? 0.0 : camera_ProjectionParams.x / sqrt ( denom ) ;
    return mat3 ( tangent * invmax, bitangent * invmax, normal ) ;
}
uniform vec4 material_BaseColor;
uniform float material_Metal;
uniform float material_Roughness;
uniform float material_IOR;
uniform vec3 material_EmissiveColor;
uniform float material_NormalIntensity;
uniform float material_OcclusionIntensity;
uniform vec3 material_AddtiveColor;
uniform vec3 material_Effectcolor;
uniform vec2 material_EffectTilling;
uniform vec4 scene_ElapsedTime;
uniform sampler2D material_BaseTexture;
uniform sampler2D material_EmissiveTexture;
uniform sampler2D material_RoughnessMetallicTexture;
uniform sampler2D material_Addtivexture;
uniform sampler2D material_Efeecttexture;
uniform sampler2D material_Effectnoise;
SurfaceData getSurfaceData ( vec2 aoUV, bool isFrontFacing ) {
    SurfaceData surfaceData ;
    vec2 uv = uv ;
    vec4 baseColor = material_BaseColor ;
    float metallic = material_Metal ;
    float roughness = material_Roughness ;
    vec3 emissiveRadiance = material_EmissiveColor ;
    baseColor *= texture2DSRGB(material_BaseTexture, uv) ;
    vec4 metalRoughMapColor = texture ( material_RoughnessMetallicTexture, uv ) ;
    roughness *= metalRoughMapColor.g ;
    metallic *= metalRoughMapColor.b ;
    emissiveRadiance *= texture2DSRGB(material_EmissiveTexture, uv).rgb ;
    vec3 pDirWS = normalize ( - camera_Forward ) ;
    vec3 RightDir = normalize ( ( mat4 ( renderer_ModelMat ) * vec4 ( 1.0, 0.0, 0.0, 0.0 ) ).rgb ) ;
    float AbsPV = abs ( dot ( pDirWS, RightDir ) ) ;
    float Angles = cos ( radians ( 70.0 ) ) ;
    float IncludedAngle = cos ( radians ( 80.0 ) ) ;
    float AngleMix = 1.0 - smoothstep ( Angles, Angles + IncludedAngle, AbsPV ) ;
    float HalfColorMix = AngleMix * 0.5 + 0.5 ;
    HalfColorMix = pow ( HalfColorMix, 4.0 ) ;
    vec3 addtiveRadiance = material_AddtiveColor ;
    vec4 addtiveColor = texture2DSRGB(material_Addtivexture, uv) ;
    addtiveRadiance *= addtiveColor.rgb * HalfColorMix ;
    vec2 EffectUVS = uv * material_EffectTilling ;
    vec2 effectUV = fract ( EffectUVS / 16.0 ) ;
    vec2 block = floor ( EffectUVS / 16.0 ) ;
    effectUV = effectUV * 0.7 + 0.1 ;
    vec2 rands = ( texture ( material_Effectnoise, block / vec2 ( 512.0, 512.0 ) ) ).xy ;
    rands = floor ( rands * 16.0 ) ;
    effectUV += rands ;
    effectUV /= 16.0 ;
    float main = ( texture ( material_Efeecttexture, effectUV ) ).r ;
    main = pow ( main, 5.0 ) ;
    float uvx = floor ( EffectUVS.x / 16.0 ) ;
    float offset = sin ( uvx * 15.0 ) ;
    float speed = ( cos ( uvx * 3.0 ) * 0.15 + 0.35 ) * 0.2 ;
    float y = fract ( - ( EffectUVS.y / material_EffectTilling.y ) + scene_ElapsedTime.x * 0.2 + offset ) ;
    vec3 raincolors = material_Effectcolor / ( y * 20.0 + 0.2 ) ;
    float floatMix = 0.05 + 0.15 * ( 1.0 - AngleMix ) ;
    vec3 EffectColor = raincolors * main * floatMix ;
    vec3 finalAdd = mix ( addtiveRadiance + EffectColor, addtiveRadiance, addtiveRadiance.b ) ;
    surfaceData.ambientOcclusion = ( metalRoughMapColor.r - 1.0 ) * material_OcclusionIntensity + 1.0 ;
    surfaceData.albedoColor = baseColor.rgb ;
    surfaceData.emissiveColor = emissiveRadiance + finalAdd ;
    surfaceData.metallic = metallic ;
    surfaceData.roughness = roughness ;
    surfaceData.IOR = material_IOR ;
    surfaceData.opacity = 1.0 ;
    surfaceData.position = positionWS ;
    surfaceData.viewDir = normalize ( camera_Position - positionWS ) ;
    vec3 normal = normalize ( normalWS ) ;
    normal *= float ( isFrontFacing ) * 2.0 - 1.0 ;
    surfaceData.normal = normal ;
    surfaceData.dotNV = clamp( dot ( surfaceData.normal, surfaceData.viewDir ), 0.0, 1.0 ) ;
    return surfaceData ;
}
void main() {
    BSDFData bsdfData ;
    vec2 aoUV = uv ;
    SurfaceData surfaceData = getSurfaceData(aoUV, gl_FrontFacing) ;
    initBSDFData(surfaceData, bsdfData) ;
    vec3 totalDiffuseColor = vec3 ( 0, 0, 0 ) ;
    vec3 totalSpecularColor = vec3 ( 0, 0, 0 ) ;
    float shadowAttenuation = 1.0 ;
    evaluateDirectRadiance(surfaceData, bsdfData, shadowAttenuation, totalDiffuseColor, totalSpecularColor) ;
    evaluateIBL(surfaceData, bsdfData, totalDiffuseColor, totalSpecularColor) ;
    vec4 color = vec4 ( ( totalDiffuseColor + totalSpecularColor ).rgb, surfaceData.opacity ) ;
    color.rgb += surfaceData.emissiveColor ;
    glFragColor = color ;
}
