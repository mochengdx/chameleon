#ifndef MATERIAL_INPUT_PBR_INCLUDED
#define MATERIAL_INPUT_PBR_INCLUDED

#include "Normal.glsl"

vec4 material_BaseColor;
float material_Metal;
float material_Roughness;
float material_IOR;
vec3 material_EmissiveColor;
float material_NormalIntensity;
float material_OcclusionIntensity;

vec3 material_AddtiveColor;
vec3 material_Effectcolor;
vec2 material_EffectTilling;
vec4 scene_ElapsedTime;

// Texture
#ifdef MATERIAL_HAS_NORMALTEXTURE
    sampler2D material_NormalTexture;
#endif
sampler2D material_BaseTexture;
sampler2D material_EmissiveTexture;
sampler2D material_RoughnessMetallicTexture;
sampler2D material_Addtivexture;
sampler2D material_Efeecttexture;
sampler2D material_Effectnoise;



SurfaceData getSurfaceData(Varyings v, vec2 aoUV, bool isFrontFacing){
    SurfaceData surfaceData;
    vec2 uv = v.uv;
    // common
    vec4 baseColor = material_BaseColor;
    float metallic = material_Metal;
    float roughness = material_Roughness;
    vec3 emissiveRadiance = material_EmissiveColor;

    baseColor *= texture2DSRGB(material_BaseTexture, uv);
    vec4 metalRoughMapColor = texture2D( material_RoughnessMetallicTexture, uv );
    roughness *= metalRoughMapColor.g;
    metallic *= metalRoughMapColor.b;
    emissiveRadiance *= texture2DSRGB(material_EmissiveTexture, uv).rgb;
    
    //叠加颜色
    vec3 pDirWS = normalize(-camera_Forward);
    vec3 RightDir = normalize( (mat4(renderer_ModelMat ) * vec4( 1.0,0.0,0.0,0.0)).rgb);
    float AbsPV = abs( dot(pDirWS , RightDir));
    float Angles  =  cos( radians(70.0) );
    float IncludedAngle = cos(radians(80.0) );
    float AngleMix =  1.0 - smoothstep( Angles , Angles + IncludedAngle ,AbsPV );
    float HalfColorMix = AngleMix * 0.5 + 0.5;
    HalfColorMix = pow ( HalfColorMix,4.0);

    vec3 addtiveRadiance = material_AddtiveColor;
    vec4 addtiveColor = texture2DSRGB(material_Addtivexture, uv);
    addtiveRadiance *=  addtiveColor.rgb * HalfColorMix;

    //叠加特效
    vec2 EffectUVS = uv * material_EffectTilling;
    vec2 effectUV = fract(EffectUVS / 16.0 );      
    vec2 block    = floor(EffectUVS / 16.0 );     
    effectUV      = effectUV * 0.7 + 0.1;                                             
    vec2 rands    = (texture2D(material_Effectnoise, block/vec2(512.0,512.0))).xy;       
    rands = floor(rands * 16.0);                                         
    effectUV += rands;                                                        
    effectUV /= 16.0;   
    float main = ( texture2D(material_Efeecttexture, effectUV)).r;
    main = pow(main,5.0);
    float uvx  = floor(EffectUVS.x / 16.0);                                  
    float offset = sin(uvx * 15.0);                                     
    float speed = (cos(uvx * 3.0) * 0.15 + 0.35) * 0.2 ;              
    float y = fract(-(EffectUVS.y / material_EffectTilling.y) + scene_ElapsedTime.x * 0.2 + offset);    
    vec3 raincolors = material_Effectcolor / ( y * 20.0 + 0.2) ;
    float floatMix = 0.05 + 0.15 *( 1.0 - AngleMix) ;
    vec3 EffectColor  = raincolors * main * floatMix;   
    //fianl Add
    vec3 finalAdd =  mix( addtiveRadiance  +  EffectColor , addtiveRadiance ,  addtiveRadiance.b  );

    surfaceData.ambientOcclusion = (metalRoughMapColor.r- 1.0) * material_OcclusionIntensity + 1.0;
    surfaceData.albedoColor = baseColor.rgb;
    surfaceData.emissiveColor = emissiveRadiance + finalAdd;
    surfaceData.metallic = metallic;
    surfaceData.roughness = roughness;
    surfaceData.IOR = material_IOR;

    #ifdef MATERIAL_IS_TRANSPARENT
        surfaceData.opacity = baseColor.a;
    #else
        surfaceData.opacity = 1.0;
    #endif

    // Geometry
    surfaceData.position = v.positionWS;
    
    #ifdef CAMERA_ORTHOGRAPHIC
        surfaceData.viewDir = -camera_Forward;
    #else
        surfaceData.viewDir = normalize(camera_Position - v.positionWS);
    #endif

    // Normal
    #ifdef RENDERER_HAS_NORMAL
        vec3 normal = normalize(v.normalWS);
    #elif defined(HAS_DERIVATIVES)
        vec3 pos_dx = dFdx(v.positionWS);
        vec3 pos_dy = dFdy(v.positionWS);
        vec3 normal = normalize( cross(pos_dx, pos_dy) );
        normal *= camera_ProjectionParams.x;
    #else
        vec3 normal = vec3(0, 0, 1);
    #endif
    
    normal *= float( isFrontFacing ) * 2.0 - 1.0;
    surfaceData.normal = normal;

    // Tangent
    #ifdef NEED_TANGENT
        #if defined(RENDERER_HAS_NORMAL) && defined(RENDERER_HAS_TANGENT)
            surfaceData.tangent = v.tangentWS;
            surfaceData.bitangent = v.bitangentWS;
            mat3 tbn = mat3(v.tangentWS, v.bitangentWS, v.normalWS);
        #else
            mat3 tbn = getTBNByDerivatives(uv, normal, v.positionWS, isFrontFacing);
            surfaceData.tangent = tbn[0];
            surfaceData.bitangent = tbn[1];
        #endif

        #ifdef MATERIAL_HAS_NORMALTEXTURE
            surfaceData.normal = getNormalByNormalTexture(tbn, material_NormalTexture, material_NormalIntensity, uv, isFrontFacing);
        #endif
    #endif  

    surfaceData.dotNV = saturate( dot(surfaceData.normal, surfaceData.viewDir) );
    return surfaceData;
}

#endif