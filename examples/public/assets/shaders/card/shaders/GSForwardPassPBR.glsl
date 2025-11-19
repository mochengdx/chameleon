#ifndef FORWARD_PASS_PBR_INCLUDED
#define FORWARD_PASS_PBR_INCLUDED

#include "Common.glsl"
#include "Fog.glsl"
#include "Transform.glsl"
#include "Skin.glsl"
#include "BlendShape.glsl"
#include "Shadow.glsl"

#include "AttributesPBR.glsl"
#include "VaryingsPBR.glsl"
#include "LightDirectPBR.glsl"
#include "LightIndirectPBR.glsl"
#include "VertexPBR.glsl"
#include "./GSFragmentPBR.glsl"


Varyings PBRVertex(Attributes attributes) {
  Varyings varyings;

  varyings.uv = getUV0(attributes);

  VertexInputs vertexInputs = getVertexInputs(attributes);
  // positionWS
  varyings.positionWS = vertexInputs.positionWS;
  // normalWS、tangentWS、bitangentWS
  #ifdef RENDERER_HAS_NORMAL
    varyings.normalWS = vertexInputs.normalWS;
    #ifdef RENDERER_HAS_TANGENT
      varyings.tangentWS = vertexInputs.tangentWS;
      varyings.bitangentWS = vertexInputs.bitangentWS;
    #endif
  #endif
  gl_Position = renderer_MVPMat * vertexInputs.positionOS;
  return varyings;
}

void PBRFragment(Varyings varyings) {
  BSDFData bsdfData;
  // Get aoUV
  vec2 aoUV = varyings.uv;
  SurfaceData surfaceData = getSurfaceData(varyings, aoUV, gl_FrontFacing);
  // Can modify surfaceData here
  initBSDFData(surfaceData, bsdfData);

  vec3 totalDiffuseColor = vec3(0, 0, 0);
  vec3 totalSpecularColor = vec3(0, 0, 0);
  // Get shadow attenuation
  float shadowAttenuation = 1.0;
  // Evaluate direct lighting
  evaluateDirectRadiance(varyings, surfaceData, bsdfData, shadowAttenuation, totalDiffuseColor, totalSpecularColor);
  // IBL
  evaluateIBL(varyings, surfaceData, bsdfData, totalDiffuseColor, totalSpecularColor);
  // Final color
  vec4 color = vec4((totalDiffuseColor + totalSpecularColor).rgb, surfaceData.opacity);
  // Emissive
  color.rgb += surfaceData.emissiveColor;

  gl_FragColor = color;
}


#endif